import { PDFDocument, PDFName, PDFHexString, PDFBool, PDFDict, PDFArray, PDFString, PDFNumber, TextAlignment, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import fs from 'fs'
import path from 'path'
import { generateBarcode } from './generateBarcode'

interface ReceiptData {
  receipt: any
  organization: any
  createdBy: string
}

export async function generateReceiptPDF(data: ReceiptData): Promise<Uint8Array> {
  const { receipt, organization } = data

  // DEBUG: Log the payment method
  console.log('🔍 Generating PDF for receipt:', receipt.receipt_number)
  console.log('   Payment method:', receipt.payment_method)
  console.log('   Recipient:', receipt.recipient_name)

  const templatePath = path.join(process.cwd(), 'public/templates/voucher.pdf')
  const templateBytes = fs.readFileSync(templatePath)

  const pdfDoc = await PDFDocument.load(templateBytes)
  pdfDoc.registerFontkit(fontkit)

  // Load Arabic font - using Cairo for better readability
  const fontPath = path.join(process.cwd(), 'public/fonts/Cairo-Regular.ttf')
  const fontBytes = fs.readFileSync(fontPath)
  const customFont = await pdfDoc.embedFont(fontBytes)

  const form = pdfDoc.getForm()

  // Helper to process text - keep data as is from database
  const processText = (text: string): string => {
    if (!text) return ''

    // Only convert Eastern Arabic numerals (٠-٩) to Western (0-9)
    // Keep all other text exactly as stored in database
    return text.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
  }

  // Helper to format date in Arabic format
  const formatArabicDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr)
      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const year = date.getFullYear()
      return `${day}-${month}-${year}`
    } catch (e) {
      return dateStr
    }
  }

  // Helper to format time in Arabic format
  const formatArabicTime = (dateStr: string): string => {
    try {
      const date = new Date(dateStr)
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      return `${hours}:${minutes}`
    } catch (e) {
      return ''
    }
  }

  // Helper to set text field with Arabic font support
  const setField = (name: string, value: string | number | null | undefined) => {
    try {
      const field = form.getTextField(name)
      if (field) {
        let text = value?.toString() || ''

        // Keep text as is from database (only convert Arabic numerals)
        text = processText(text)

        // Set text with Arabic font (required to avoid WinAnsi error)
        field.setText(text)
        field.setAlignment(TextAlignment.Center)
        field.updateAppearances(customFont)
      }
    } catch (e) {
      // console.warn(`Field ${name} not found in PDF`)
    }
  }

  // Helper to set field value only without changing font/appearance
  const setFieldValueOnly = (name: string, value: string | number | null | undefined) => {
    try {
      const field = form.getTextField(name)
      if (field) {
        let text = value?.toString() || ''
        text = processText(text)
        field.setText(text)
        // Update with custom font to support Arabic when flattening
        field.updateAppearances(customFont)
      }
    } catch (e) {
      // Field not found, ignore
    }
  }

  // Helper to set text field WITHOUT changing font (preserves original PDF font)
  const setFieldPreserve = (name: string, value: string | number | null | undefined) => {
    try {
      const field = form.getTextField(name)
      if (field) {
        let text = value?.toString() || ''
        text = processText(text)
        field.setText(text)
        // Do NOT call updateAppearances to preserve original font
      }
    } catch (e) {
      // console.warn(`Field ${name} not found in PDF`)
    }
  }

  // Map fields
  setField('Name_Of_Company', organization.name_ar)
  setField('Company_description', organization.description)
  setField('Type_Of_Doc', receipt.receipt_type === 'receipt' ? 'سند قبض' : 'سند صرف')

  setField('VAT_Num_Right', organization.tax_number)
  setField('VAT_Num_Left', organization.tax_number)
  setField('CR_Num_Right', organization.commercial_registration)
  setField('CR_Num_Left', organization.commercial_registration)

  setField('Sanaad_Id', receipt.receipt_number)
  setField('Sanaad_Date', formatArabicDate(receipt.date))
  setField('Sanaad_Time', formatArabicTime(receipt.created_at))

  // Payment Method Translation
  const paymentMethodMap: Record<string, string> = {
    cash: 'نقدي',
    check: 'شيك',
    bank_transfer: 'حوالة بنكية'
  }
  setField('Payment_Methode', paymentMethodMap[receipt.payment_method || 'cash'] || receipt.payment_method)

  // From/To Logic
  if (receipt.receipt_type === 'receipt') {
    setField('From_Name', receipt.recipient_name)
    setField('To_Name', organization.name_ar)
    setField('National_Id_From', receipt.national_id_from)
    setField('National_Id_To', receipt.national_id_to) // Or organization ID if available
  } else {
    setField('From_Name', organization.name_ar)
    setField('To_Name', receipt.recipient_name)
    setField('National_Id_From', receipt.national_id_from) // Or organization ID
    setField('National_Id_To', receipt.national_id_to)
  }

  setField('Purpose', receipt.description)
  setField('Amount_Without_VAT', receipt.amount.toFixed(2))
  setField('VAT', receipt.vat_amount?.toFixed(2) || '0.00')
  setField('Total', receipt.total_amount?.toFixed(2) || receipt.amount.toFixed(2))
  setField('Amount_With_VAT', receipt.total_amount?.toFixed(2) || receipt.amount.toFixed(2))

  setField('Address', organization.address)
  setField('Phone', organization.phone)

  // Helper to show/hide fields
  const setFieldVisibility = (fieldName: string, visible: boolean) => {
    try {
      const field = form.getField(fieldName)
      if (field) {
        if (visible) {
          const acroField = field.acroField
          const flags = acroField.getFlags()
          // Clear hidden flag (bit 1): flags & ~2
          acroField.setFlags(flags & ~2)
        } else {
          // Remove the field entirely to ensure it doesn't appear
          form.removeField(field)
        }
      }
    } catch (e) {
      // Field not found, ignore
    }
  }

  // Conditional Fields
  const bankFields = ['Bank_Name_Bank', 'Bank_Name_Label', 'Cheque_Number', 'Cheque_Number_Label']
  const transferFields = ['Bank_Name_Transfer', 'Bank_Name_Trans_Label', 'Transfer_Number', 'Transfer_Number_Label']

  console.log('🔧 Setting up payment method fields...')
  console.log('   Payment method:', receipt.payment_method)

  if (receipt.payment_method === 'cash') {
    console.log('   → Hiding all conditional fields (Cash payment)')
    // Hide all conditional fields
    bankFields.forEach(f => {
      setField(f, '')
      setFieldVisibility(f, false)
    })
    transferFields.forEach(f => {
      setField(f, '')
      setFieldVisibility(f, false)
    })
  } else if (receipt.payment_method === 'check') {
    console.log('   → Showing check fields:', receipt.cheque_number, receipt.bank_name)
    // Show check fields
    setField('Cheque_Number', receipt.cheque_number)
    setField('Bank_Name_Bank', receipt.bank_name)

    bankFields.forEach(f => setFieldVisibility(f, true))

    // Hide transfer fields
    transferFields.forEach(f => {
      setField(f, '')
      setFieldVisibility(f, false)
    })
  } else if (receipt.payment_method === 'bank_transfer') {
    console.log('   → Showing transfer fields:', receipt.transfer_number, receipt.bank_name)
    // Show transfer fields
    setField('Transfer_Number', receipt.transfer_number)
    setField('Bank_Name_Transfer', receipt.bank_name)

    transferFields.forEach(f => setFieldVisibility(f, true))

    // Hide check fields
    bankFields.forEach(f => {
      setField(f, '')
      setFieldVisibility(f, false)
    })
  }

  // Handle Images (Logo and Stamp)
  if (organization.logo_url) {
    try {
      const logoImageBytes = await fetch(organization.logo_url).then(res => res.arrayBuffer())
      // Determine format (png or jpg)
      const isPng = organization.logo_url.toLowerCase().endsWith('.png')
      const logoImage = isPng ? await pdfDoc.embedPng(logoImageBytes) : await pdfDoc.embedJpg(logoImageBytes)

      try {
        const logoField = form.getButton('Logo_af_image')
        if (logoField) {
          logoField.setImage(logoImage)
        }
      } catch (e) {
        // Ignore
      }
    } catch (e) {
      console.error('Error embedding logo:', e)
    }
  }

  if (organization.stamp_url) {
    try {
      const stampImageBytes = await fetch(organization.stamp_url).then(res => res.arrayBuffer())
      const isPng = organization.stamp_url.toLowerCase().endsWith('.png')
      const stampImage = isPng ? await pdfDoc.embedPng(stampImageBytes) : await pdfDoc.embedJpg(stampImageBytes)

      try {
        const stampField = form.getButton('Stamp_af_image')
        if (stampField) {
          stampField.setImage(stampImage)
        }
      } catch (e) {
        // Ignore
      }
    } catch (e) {
      console.error('Error embedding stamp:', e)
    }
  }

  // Flatten the form to lock in all field values and visibility settings
  // This must be done BEFORE adding the barcode image
  form.flatten()

  // Generate and add barcode at the top center of the page
  const pages = pdfDoc.getPages()
  const firstPage = pages[0]
  const { width, height } = firstPage.getSize()

  // Generate barcode image
  if (receipt.barcode_id) {
    try {
      const barcodeBuffer = await generateBarcode({
        text: receipt.barcode_id,
        width: 1.5,
        height: 25,
        includetext: true,
      })

      const barcodeImage = await pdfDoc.embedPng(barcodeBuffer)
      const barcodeScale = 0.8
      const barcodeWidth = barcodeImage.width * barcodeScale
      const barcodeHeight = barcodeImage.height * barcodeScale

      // Position: center horizontally, near top (15 points from top)
      const x = (width - barcodeWidth) / 2
      const y = height - barcodeHeight - 15

      firstPage.drawImage(barcodeImage, {
        x: x,
        y: y,
        width: barcodeWidth,
        height: barcodeHeight,
      })

      console.log(`✅ Barcode added to PDF: ${receipt.barcode_id}`)
    } catch (error) {
      console.error('Failed to add barcode to PDF:', error)
    }
  }

  // Do NOT set NeedAppearances again at the end - already set at beginning
  // This matches the test script behavior

  // Save with options to prevent automatic appearance updates by pdf-lib
  return await pdfDoc.save({
    updateFieldAppearances: false,
    useObjectStreams: false
  })
}
