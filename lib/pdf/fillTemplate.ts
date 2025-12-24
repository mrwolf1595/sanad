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

  // Load the template
  const templatePath = path.join(process.cwd(), 'public/templates/voucher.pdf')
  const templateBytes = fs.readFileSync(templatePath)
  
  const pdfDoc = await PDFDocument.load(templateBytes)
  pdfDoc.registerFontkit(fontkit)

  // Load Arabic font - using Cairo for better readability
  const fontPath = path.join(process.cwd(), 'public/fonts/Cairo-Regular.ttf')
  const fontBytes = fs.readFileSync(fontPath)
  const customFont = await pdfDoc.embedFont(fontBytes)

  const form = pdfDoc.getForm()
  
  // Enable needAppearances to let PDF viewers regenerate field appearances
  // This preserves the alignment/formatting from the template
  form.acroForm.dict.set(
    pdfDoc.context.obj('NeedAppearances'),
    pdfDoc.context.obj(true)
  )

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

  // Helper to set text field - keep template formatting by not regenerating appearances
  const setField = (name: string, value: string | number | null | undefined) => {
    try {
      const field = form.getTextField(name)
      if (field) {
        let text = value?.toString() || ''
        
        // Keep text as is from database (only convert Arabic numerals)
        text = processText(text)
        
        // Only set text - don't call updateAppearances to preserve template settings
        field.setText(text)
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

  // Conditional Fields
  if (receipt.payment_method === 'cash') {
    setField('Cheque_Number', '')
    setField('Transfer_Number', '')
    setField('Bank_Name_Bank', '')
    setField('Bank_Name_Transfer', '')
    setField('Cheque_Number_Label', '')
    setField('Transfer_Number_Label', '')
    setField('Bank_Name_Label', '')
    setField('Bank_Name_Trans_Label', '')
  } else if (receipt.payment_method === 'check') {
    setField('Cheque_Number', receipt.cheque_number)
    setField('Bank_Name_Bank', receipt.bank_name)
    setField('Transfer_Number', '')
    setField('Bank_Name_Transfer', '')
    // Keep labels for Check
    setField('Transfer_Number_Label', '')
    setField('Bank_Name_Trans_Label', '')
  } else if (receipt.payment_method === 'bank_transfer') {
    setField('Transfer_Number', receipt.transfer_number)
    setField('Bank_Name_Transfer', receipt.bank_name)
    setField('Cheque_Number', '')
    setField('Bank_Name_Bank', '')
    // Keep labels for Transfer
    setField('Cheque_Number_Label', '')
    setField('Bank_Name_Label', '') // Assuming Bank_Name_Label is for Check's bank
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

  // Don't flatten to allow JavaScript in Payment_Methode field to execute
  // The JavaScript code in the PDF will handle field visibility/behavior
  // form.flatten()

  return await pdfDoc.save()
}
