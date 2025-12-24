import { PDFDocument, TextAlignment } from 'pdf-lib'
import { convertNumberToArabicWords } from './arabicNumbers'
import fs from 'fs'
import path from 'path'
import fontkit from '@pdf-lib/fontkit'

interface ReceiptData {
  receipt: {
    id: string
    receipt_number: string
    receipt_type: 'receipt' | 'payment'
    amount: number
    recipient_name: string
    description: string | null
    payment_method: string | null
    date: string
    created_at: string
    national_id_from: string | null
    national_id_to: string | null
    bank_name: string | null
    cheque_number: string | null
    transfer_number: string | null
    vat_amount: number | null
    total_amount: number | null
  }
  organization: {
    name_ar: string
    name_en: string
    address: string
    phone: string
    commercial_registration: string | null
    tax_number: string | null
    logo_url: string | null
    description: string | null
    stamp_url: string | null
  }
  createdBy: string
}

export async function generateReceiptPDF(data: ReceiptData): Promise<Uint8Array> {
  const { receipt, organization } = data

  // DEBUG: Log the payment method
  console.log('🔍 Generating PDF for receipt:', receipt.receipt_number)
  console.log('   Payment method:', receipt.payment_method)
  console.log('   Recipient:', receipt.recipient_name)

  // Load the template
  const templatePath = path.join(process.cwd(), 'public/templates/voucher.pdf')
  const templateBytes = fs.readFileSync(templatePath)
  
  // Load with ignoreEncryption to avoid issues
  const pdfDoc = await PDFDocument.load(templateBytes, {
    ignoreEncryption: true,
    updateMetadata: false
  })
  pdfDoc.registerFontkit(fontkit)

  const form = pdfDoc.getForm()
  const acroForm = form.acroForm
  
  // Set NeedAppearances at the BEGINNING like the test script
  acroForm.dict.set(
    pdfDoc.context.obj('NeedAppearances'),
    pdfDoc.context.obj(true)
  )

  // Helper to process text - keep data EXACTLY as is from database
  // No reshaping, no reversal, no modification
  const processText = (text: string): string => {
    if (!text) return ''
    return text.toString()
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

  // Helper to set text field - Keep EXACTLY like test script
  const setField = (name: string, value: string | number | null | undefined) => {
    try {
      const field = form.getTextField(name)
      if (field) {
        const text = value?.toString() || ''
        field.setText(text)
        
        // Clear default value
        const fieldDict = field.acroField.dict
        fieldDict.delete(pdfDoc.context.obj('DV'))
      }
    } catch (e) {
      // Ignore
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

  // Payment Method - MUST be TEXT for JavaScript in PDF to work
  // The JavaScript in PDF accepts both Arabic and English values
  // Map database values to Arabic for better display
  
  // DEBUG: Log EXACT value from database
  console.log('🔍 Payment method from database:')
  console.log('   Raw value:', JSON.stringify(receipt.payment_method))
  console.log('   Type:', typeof receipt.payment_method)
  console.log('   Length:', receipt.payment_method?.length)
  console.log('   Trimmed:', JSON.stringify(receipt.payment_method?.trim()))
  
  const paymentMethodMap: Record<string, string> = {
    cash: 'نقداً',
    check: 'شيك',
    bank_transfer: 'حوالة بنكية'
  }
  
  const paymentMethodValue = paymentMethodMap[receipt.payment_method || 'cash'] || 'نقداً'
  
  console.log('   Mapped value:', JSON.stringify(paymentMethodValue))
  console.log('   Will set in field:', paymentMethodValue)
  
  console.log('   Mapped payment method:', paymentMethodValue)
  
  try {
    const paymentField = form.getTextField('Payment_Methode')
    if (paymentField) {
      // Set the Arabic value that JavaScript expects
      paymentField.setText(paymentMethodValue)
      
      // Clear default value
      const fieldDict = paymentField.acroField.dict
      fieldDict.delete(pdfDoc.context.obj('DV'))
      
      console.log('   ✓ Payment_Methode field set successfully')
    }
  } catch (e) {
    console.error('   ❌ Error setting Payment_Methode:', e)
  }

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

  // Conditional Fields - Set data based on payment method
  // ALSO manually hide fields for viewers that don't support JavaScript
  const bankFields = ['Bank_Name_Bank', 'Bank_Name_Label', 'Cheque_Number', 'Cheque_Number_Label']
  const transferFields = ['Bank_Name_Transfer', 'Bank_Name_Trans_Label', 'Transfer_Number', 'Transfer_Number_Label']
  
  // Helper to set field visibility - EXACTLY like test script
  const setFieldVisibility = (fieldName: string, visible: boolean) => {
    try {
      const field = form.getTextField(fieldName)
      if (field) {
        const widgets = field.acroField.getWidgets()
        widgets.forEach((widget: any) => {
          const flagsRef = widget.dict.get(pdfDoc.context.obj('F'))
          const currentFlags = flagsRef ? flagsRef.asNumber() : 0
          
          let newFlags = currentFlags
          if (visible) {
            newFlags = currentFlags & ~2  // Remove hidden
            newFlags = newFlags | 4        // Add print
          } else {
            newFlags = currentFlags | 2    // Set hidden
          }
          
          widget.dict.set(pdfDoc.context.obj('F'), pdfDoc.context.obj(newFlags))
        })
        console.log(`   ✓ Field ${fieldName}: ${visible ? 'visible' : 'hidden'}`)
      } else {
        console.log(`   ⚠️  Field ${fieldName} not found`)
      }
    } catch (e) {
      console.log(`   ❌ Error setting visibility for ${fieldName}:`, e)
    }
  }
  
  if (receipt.payment_method === 'cash') {
    // Cash: Clear all bank-related fields AND hide them
    console.log('💰 Processing CASH payment')
    setField('Cheque_Number', '')
    setField('Transfer_Number', '')
    setField('Bank_Name_Bank', '')
    setField('Bank_Name_Transfer', '')
    setField('Cheque_Number_Label', '')
    setField('Transfer_Number_Label', '')
    setField('Bank_Name_Label', '')
    setField('Bank_Name_Trans_Label', '')
    
    // Hide all bank fields
    bankFields.forEach(f => setFieldVisibility(f, false))
    transferFields.forEach(f => setFieldVisibility(f, false))
    
  } else if (receipt.payment_method === 'check') {
    // Check: Set cheque and bank fields, clear transfer
    console.log('   Setting up CHECK fields...')
    setField('Cheque_Number', receipt.cheque_number)
    setField('Bank_Name_Bank', receipt.bank_name)
    setField('Cheque_Number_Label', 'رقم الشيك')
    setField('Bank_Name_Label', 'اسم البنك')
    
    setField('Transfer_Number', '')
    setField('Bank_Name_Transfer', '')
    setField('Transfer_Number_Label', '')
    setField('Bank_Name_Trans_Label', '')
    
    // Show bank fields, hide transfer fields
    console.log('   Showing bank/cheque fields, hiding transfer fields...')
    bankFields.forEach(f => setFieldVisibility(f, true))
    transferFields.forEach(f => setFieldVisibility(f, false))
    
  } else if (receipt.payment_method === 'bank_transfer') {
    // Transfer: Set transfer and bank fields, clear cheque
    setField('Transfer_Number', receipt.transfer_number)
    setField('Bank_Name_Transfer', receipt.bank_name)
    setField('Transfer_Number_Label', 'رقم الحوالة')
    setField('Bank_Name_Trans_Label', 'اسم البنك')
    
    setField('Cheque_Number', '')
    setField('Bank_Name_Bank', '')
    setField('Cheque_Number_Label', '')
    setField('Bank_Name_Label', '')
    
    // Hide bank fields, show transfer fields
    bankFields.forEach(f => setFieldVisibility(f, false))
    transferFields.forEach(f => setFieldVisibility(f, true))
  }
  
  // NOTE: JavaScript is preserved in the PDF and will also control visibility
  // in viewers that support it (like Adobe Acrobat). The manual visibility
  // control above is a fallback for viewers without JavaScript support.

  // Handle Images (Logo and Stamp)
  if (organization.logo_url) {
    try {
      const logoImageBytes = await fetch(organization.logo_url).then(res => {
        if (!res.ok) throw new Error(`Failed to fetch logo: ${res.statusText}`)
        return res.arrayBuffer()
      })
      
      const urlPath = organization.logo_url.split('?')[0].toLowerCase()
      const isPng = urlPath.endsWith('.png')
      
      const logoImage = isPng ? await pdfDoc.embedPng(logoImageBytes) : await pdfDoc.embedJpg(logoImageBytes)
      
      // Try to set logo in form field (try multiple possible field names)
      const possibleLogoFields = ['Logo_af_image', 'Logo', 'Company_Logo', 'logo']
      for (const fieldName of possibleLogoFields) {
        try {
          const logoField = form.getButton(fieldName)
          if (logoField) {
            logoField.setImage(logoImage)
            break
          }
        } catch (e) {
          // Try next field name
        }
      }
      
      // ALWAYS draw logo directly on the first page for guaranteed visibility
      const pages = pdfDoc.getPages()
      const firstPage = pages[0]
      const { width, height } = firstPage.getSize()
      
      // Scale logo to fit (max 100x100 pixels for better visibility)
      const maxLogoSize = 100
      const logoScale = Math.min(maxLogoSize / logoImage.width, maxLogoSize / logoImage.height)
      const logoWidth = logoImage.width * logoScale
      const logoHeight = logoImage.height * logoScale
      
      // Draw at top LEFT (matching template design)
      firstPage.drawImage(logoImage, {
        x: 40,
        y: height - logoHeight - 40,
        width: logoWidth,
        height: logoHeight,
      })
      
    } catch (e) {
      console.error('Error embedding logo:', e)
    }
  }

  if (organization.stamp_url) {
    try {
      const stampImageBytes = await fetch(organization.stamp_url).then(res => {
        if (!res.ok) throw new Error(`Failed to fetch stamp: ${res.statusText}`)
        return res.arrayBuffer()
      })
      
      const urlPath = organization.stamp_url.split('?')[0].toLowerCase()
      const isPng = urlPath.endsWith('.png')
      
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

  // Don't flatten to allow JavaScript in Payment_Methode field to execute
  // form.flatten()

  // Do NOT set NeedAppearances again at the end - already set at beginning
  // This matches the test script behavior

  // Save with options to prevent automatic appearance updates by pdf-lib
  return await pdfDoc.save({
    updateFieldAppearances: false,
    useObjectStreams: false
  })
}
