# إصلاحات PDF - ديسمبر 2024

## المشاكل اللي تم إصلاحها:

### 1. ✅ اللوجو لا يظهر
**الحل:**
- تم تحسين كود رسم اللوجو على الصفحة مباشرة
- تم إضافة محاولات متعددة لإيجاد حقل اللوجو باستخدام أسماء مختلفة
- تم زيادة حجم اللوجو من 80x80 إلى 100x100 بكسل للوضوح
- تم إضافة console.log لتتبع العملية
- اللوجو يُرسم **دائماً** على الصفحة حتى لو لم يتم إيجاد الحقل

### 2. ✅ حقل Payment_Methode لا يعمل مع JavaScript
**المشكلة:** 
- الكود كان يترجم القيمة من الإنجليزية (cash, check, bank_transfer) إلى العربية
- JavaScript في الـ PDF يحتاج القيمة الأصلية كـ **text** وليس **shape**
- القيم من قاعدة البيانات (cash, check, bank_transfer) لا تطابق القيم المتوقعة في JavaScript

**الحل:**
- تم عمل mapping للقيم من قاعدة البيانات إلى القيم المتوقعة في JavaScript
- `cash` → `Cash`
- `check` → `Cheque`
- `bank_transfer` → `Transfer`
- القيمة تُحفظ كـ text في الحقل (وليس shape)
- الـ JavaScript في الـ PDF يمكنه الآن قراءة ومعالجة القيمة بشكل صحيح

### 3. ✅ النص العربي يظهر معكوس أو مقطّع
**الحل:**
- تم إزالة كل عمليات reshaping/reversal للنص
- البيانات تُرسل **بالضبط كما هي** من قاعدة البيانات
- تم تفعيل `NeedAppearances = true` ليجعل PDF viewer يعالج الـ RTL
- تم استخدام `updateFieldAppearances: false` عند الحفظ لمنع pdf-lib من محاولة رسم النص

### 4. ✅ البيانات لا تظهر في الحقول الصحيحة
**الحل:**
- تم فحص جميع أسماء الحقول في الـ PDF باستخدام test script
- تم التأكد من مطابقة جميع الأسماء
- تم إضافة console warnings للحقول المفقودة

## التعديلات التقنية:

### في [fillTemplate.ts](d:/sanad/lib/pdf/fillTemplate.ts):

1. **تحميل الـ PDF:**
   ```typescript
   const pdfDoc = await PDFDocument.load(templateBytes, {
     ignoreEncryption: true,
     updateMetadata: false
   })
   ```

2. **تفعيل NeedAppearances:**
   ```typescript
   const acroForm = form.acroForm
   acroForm.dict.set(
     pdfDoc.context.obj('NeedAppearances'),
     pdfDoc.context.obj(true)
   )
   ```

3. **حفظ الـ PDF:**
   ```typescript
   return await pdfDoc.save({
     updateFieldAppearances: false,
     useObjectStreams: false
   })
   ```

4. **معالجة النصوص:**
   - تم إزالة دالة `processText()` المعقدة
   - النص يُرسل مباشرة: `field.setText(text)`
   - **لا** توجد أي عملية reshaping أو reversal

5. **Payment Method:**
   ```typescript
   const paymentMethodMap: Record<string, string> = {
     cash: 'Cash',
     check: 'Cheque',
     bank_transfer: 'Transfer'
   }
   
   const paymentMethodValue = paymentMethodMap[receipt.payment_method || 'cash'] || 'Cash'
   const paymentField = form.getTextField('Payment_Methode')
   paymentField.setText(paymentMethodValue)
   ```

6. **اللوجو:**
   ```typescript
   // Try multiple field names
   const possibleLogoFields = ['Logo_af_image', 'Logo', 'Company_Logo', 'logo']
   
   // Always draw on page for guaranteed visibility
   firstPage.drawImage(logoImage, {
     x: 40,
     y: height - logoHeight - 40,
     width: logoWidth,
     height: logoHeight,
   })
   ```

## ملفات الاختبار:

### test-pdf-fields.js
يعرض جميع الحقول الموجودة في الـ PDF template

### test-full-pdf.js
يختبر توليد PDF كامل ببيانات تجريبية

### test-payment-methods.js
يختبر جميع طرق الدفع الثلاثة (نقداً، شيك، حوالة بنكية) ويتحقق من عمل JavaScript

## كيفية الاختبار:

1. **فحص الحقول:**
   ```bash
   node test-pdf-fields.js
   ```

2. **توليد PDF تجريبي:**
   ```bash
   node test-full-pdf.js
   ```

3. **اختبار طرق الدفع:**
   ```bash
   node test-payment-methods.js
   ```
   
   هينتج 3 ملفات:
   - `test-payment-cash.pdf` - اختبار الدفع نقداً
   - `test-payment-check.pdf` - اختبار الدفع بشيك
   - `test-payment-bank_transfer.pdf` - اختبار الدفع بحوالة بنكية

4. **افتح الملفات وتحقق من:**
   - النص العربي يظهر صحيح (غير معكوس)
   - حقل Payment_Methode يحتوي على القيمة الصحيحة (Cash/Cheque/Transfer)
   - اللوجو يظهر في المكان الصحيح
   - جميع البيانات في الحقول الصحيحة
   - **JavaScript يعمل**: الحقول المناسبة تظهر/تختفي حسب طريقة الدفع

## النتيجة:

✅ اللوجو يظهر بوضوح
✅ حقل Payment_Methode يعمل مع JavaScript في الـ PDF
✅ النص العربي يظهر صحيح من قاعدة البيانات
✅ جميع الحقول في أماكنها الصحيحة

## ملاحظات مهمة:

1. **لا تعدل البيانات:** القيم تُرسل **كما هي** من قاعدة البيانات (مع mapping لطريقة الدفع)
2. **Payment Method Mapping:** 
   - قاعدة البيانات: `cash`, `check`, `bank_transfer`
   - PDF JavaScript: `Cash`, `Cheque`, `Transfer`
   - الـ mapping يتم تلقائياً في الكود
3. **JavaScript في PDF:** سيعمل تلقائياً لإظهار/إخفاء الحقول المناسبة:
   - `Cash`: يخفي جميع حقول البنك
   - `Cheque`: يظهر Bank_Name_Bank و Cheque_Number
   - `Transfer`: يظهر Bank_Name_Transfer و Transfer_Number
4. **NeedAppearances:** يجب أن يبقى `true` ليعمل الـ RTL support بشكل صحيح
5. **اللوجو:** يُرسم مباشرة على الصفحة للضمان أنه سيظهر دائماً

---

**تاريخ التحديث:** 24 ديسمبر 2025
