# PDF Field Mapping

Based on the template image, here are the correct field names:

## Header Fields
- `Name_Of_Company` - Company Name (Arabic)
- `Company_description` - Company Description
- `VAT_Num_Left` - VAT Number (Left side - الرقم الضريبي)
- `VAT_Num_Right` - VAT Number (Right side)
- `CR_Num_Left` - Commercial Registration (Left - السجل التجاري)
- `CR_Num_Right` - Commercial Registration (Right)
- `Type_Of_Doc` - Document Type (سند قبض/سند صرف)

## Voucher Info Section (بيانات السند)
- `Sanaad_Id` - Receipt Number (رقم السند)
- `Sanaad_Date` - Date (تاريخ السند)
- `Sanaad_Time` - Time (وقت الإصدار)

## Payment Info Section (بيانات الدفع)
- `Payment_Methode` - Payment Method (طريقة الدفع) - **MUST BE TEXT** for JavaScript to work
- `Bank_Name_Bank` - Bank Name for Check (اسم البنك للشيك)
- `Cheque_Number` - Check Number (رقم الشيك)
- `Bank_Name_Transfer` - Bank Name for Transfer (اسم البنك للحوالة)
- `Transfer_Number` - Transfer Number (رقم الحوالة)

## From/To Section
- `National_Id_From` - National ID From (هوية رقم - من)
- `From_Name` - From Name (المسند من جهة)
- `National_Id_To` - National ID To (هوية رقم - إلى)
- `To_Name` - To Name (المسند موجهة إلى)

## Purpose
- `Purpose` - Purpose/Description (بيان السند)

## Amount Section (قيمة المبلغ)
- `Total` - Total Amount (الإجمالي)
- `Amount_With_VAT` - Amount with VAT (المبلغ بالضريبة)
- `VAT` - VAT Amount (قيمة الضريبة)
- `Amount_Without_VAT` - Amount without VAT (المبلغ بدون الضريبة)

## Footer
- `Phone` - Phone Number (الجوال)
- `Address` - Address (العنوان)

## Image Fields
- `Logo_af_image` or similar - Company Logo
- `Stamp_af_image` or similar - Stamp Image

## Notes
- All text fields should receive data EXACTLY as it comes from the database
- No text reshaping, no reversal, no modification
- `Payment_Methode` field contains JavaScript code that requires the value to be plain text (cash, check, bank_transfer)
- The JavaScript in the PDF will handle showing/hiding related fields based on payment method
