import { PDFDocument, PDFName, PDFHexString, PDFBool, PDFDict, PDFArray, PDFString, PDFNumber } from 'pdf-lib'
import fs from 'fs'
import path from 'path'

interface ReceiptData {
  receipt: any
  organization: any
  createdBy: string
}

export async function generateReceiptPDF(data: ReceiptData): Promise<Uint8Array> {
  const { receipt, organization } = data

  const templatePath = path.join(process.cwd(), 'public/templates/voucher.pdf')
  const templateBytes = fs.readFileSync(templatePath)

  const pdfDoc = await PDFDocument.load(templateBytes)

  const acroForm = pdfDoc.catalog.lookup(PDFName.of('AcroForm'))
  if (!(acroForm instanceof PDFDict)) {
    return await pdfDoc.save()
  }

  // Ensure NeedAppearances is true
  acroForm.set(PDFName.of('NeedAppearances'), PDFBool.True)

  // --- Helpers ---

  // Helper to find a field dictionary by name
  const findFieldDict = (fieldsArray: PDFArray | undefined, targetName: string): PDFDict | undefined => {
    if (!fieldsArray) return undefined

    for (let i = 0; i < fieldsArray.size(); i++) {
      const field = fieldsArray.lookup(i)
      if (field instanceof PDFDict) {
        const name = field.lookup(PDFName.of('T'))
        if (name instanceof PDFString && name.decodeText() === targetName) {
          return field
        }
        // Recursive check
        const kids = field.lookup(PDFName.of('Kids'))
        if (kids instanceof PDFArray) {
          const found = findFieldDict(kids, targetName)
          if (found) return found
        }
      }
    }
    return undefined
  }

  // Helper to set value (and clear appearance)
  const setFieldValue = (rootFields: PDFArray, fieldName: string, value: string) => {
    const field = findFieldDict(rootFields, fieldName)
    if (field) {
      field.set(PDFName.of('V'), PDFHexString.fromText(value))
      // Clear AP
      field.delete(PDFName.of('AP'))
      const kids = field.lookup(PDFName.of('Kids'))
      if (kids instanceof PDFArray) {
        for (let k = 0; k < kids.size(); k++) {
          const kid = kids.lookup(k)
          if (kid instanceof PDFDict) kid.delete(PDFName.of('AP'))
        }
      }
    }
  }

  // Helper to set visibility
  const setVisibility = (rootFields: PDFArray, fieldName: string, isVisible: boolean) => {
    const field = findFieldDict(rootFields, fieldName)
    if (!field) return

    // Function to update flags on a dictionary (Field or Merged Widget)
    const updateFlags = (dict: PDFDict) => {
      const F = dict.lookup(PDFName.of('F'))
      let currentFlags = (F instanceof PDFNumber) ? F.asNumber() : 0
      // Default to Print(4) if 0? Usually 4 is standard. 
      if (currentFlags === 0) currentFlags = 4;

      // Hidden bit = 2 (1-based bit 2? Value 2. bit 1 is 1, bit 2 is 2)
      // PDF Spec: Bit 2 (Hidden)

      if (isVisible) {
        // Clear Hidden (bit 2) and NoView (bit 6 -> 32)
        currentFlags = currentFlags & ~2 & ~32
      } else {
        // Set Hidden (bit 2)
        currentFlags = currentFlags | 2
      }
      dict.set(PDFName.of('F'), PDFNumber.of(currentFlags))
    }

    // If field is a widget (merged), update it.
    // If field has kids (widgets), update them.
    // Usually checking for Subtype Widget or just blindly applying to Kids works.

    const subtype = field.lookup(PDFName.of('Subtype'))
    if (subtype === PDFName.of('Widget')) {
      updateFlags(field)
    }

    const kids = field.lookup(PDFName.of('Kids'))
    if (kids instanceof PDFArray) {
      for (let k = 0; k < kids.size(); k++) {
        const kid = kids.lookup(k)
        if (kid instanceof PDFDict) updateFlags(kid)
      }
    } else {
      // Fallback: if no kids and no explicit Widget subtype (some fields are implied),
      // update the field dict itself as it holds the flags.
      updateFlags(field)
    }
  }

  const rootFields = acroForm.lookup(PDFName.of('Fields'))
  if (rootFields instanceof PDFArray) {

    // 1. Set Data
    const payMethod = receipt.payment_method || 'cash'
    const payMap: Record<string, string> = { cash: 'نقداً', check: 'شيك', bank_transfer: 'حوالة بنكية' }

    const fieldsToSet: Record<string, any> = {
      'Name_Of_Company': organization.name_ar,
      'Company_description': organization.description,
      'Address': organization.address,
      'Phone': organization.phone,
      'VAT_Num_Right': organization.tax_number,
      'VAT_Num_Left': organization.tax_number,
      'CR_Num_Right': organization.commercial_registration,
      'CR_Num_Left': organization.commercial_registration,
      'Sanaad_Id': receipt.receipt_number,
      'Sanaad_Date': receipt.date,
      'Sanaad_Time': receipt.created_at,
      'Amount_Without_VAT': receipt.amount,
      'Purpose': receipt.description,
      'VAT': receipt.vat_amount || 0,
      'Total': receipt.total_amount || receipt.amount,
      'Amount_With_VAT': receipt.total_amount || receipt.amount,
      'Type_Of_Doc': (receipt.receipt_type === 'receipt') ? 'سند قبض' : 'سند صرف',
      'Payment_Methode': payMap[payMethod] || payMethod
    }

    if (receipt.receipt_type === 'receipt') {
      fieldsToSet['From_Name'] = receipt.recipient_name
      fieldsToSet['To_Name'] = organization.name_ar
      fieldsToSet['National_Id_From'] = receipt.national_id_from
      fieldsToSet['National_Id_To'] = receipt.national_id_to
    } else {
      fieldsToSet['From_Name'] = organization.name_ar
      fieldsToSet['To_Name'] = receipt.recipient_name
      fieldsToSet['National_Id_From'] = receipt.national_id_from
      fieldsToSet['National_Id_To'] = receipt.national_id_to
    }

    // Set Values
    Object.entries(fieldsToSet).forEach(([key, val]) => {
      if (val != null) {
        setFieldValue(rootFields, key, String(val))
      }
    })

    // Set Conditional Values (Check/Transfer numbers)
    if (payMethod === 'check') {
      setFieldValue(rootFields, 'Cheque_Number', String(receipt.cheque_number || ''))
      setFieldValue(rootFields, 'Bank_Name_Bank', String(receipt.bank_name || ''))
    } else if (payMethod === 'bank_transfer') {
      setFieldValue(rootFields, 'Transfer_Number', String(receipt.transfer_number || ''))
      setFieldValue(rootFields, 'Bank_Name_Transfer', String(receipt.bank_name || ''))
    }

    // 2. Handle Visibility Logic (Replicating the PDF JS Logic)
    const bankFields = ["Bank_Name_Bank", "Bank_Name_Label", "Cheque_Number", "Cheque_Number_Label"];
    const transferFields = ["Bank_Name_Transfer", "Bank_Name_Trans_Label", "Transfer_Number", "Transfer_Number_Label"];

    let showBank = false;
    let showTransfer = false;

    // Check payment method (using English keys from DB or mapped values)
    // DB: cash, check, bank_transfer
    if (payMethod === 'check' || payMethod === 'Cheque' || payMethod === 'شيك') {
      showBank = true;
    } else if (payMethod === 'bank_transfer' || payMethod === 'Transfer' || payMethod === 'حوالة بنكية') {
      showTransfer = true;
    }

    // Apply visibility
    bankFields.forEach(f => setVisibility(rootFields, f, showBank))
    transferFields.forEach(f => setVisibility(rootFields, f, showTransfer))
  }

  return await pdfDoc.save()
}
