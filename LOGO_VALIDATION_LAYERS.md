# Logo Validation - Multi-Layer Security

تم تطبيق التحقق من وجود اللوجو على **4 مستويات** لضمان عدم السماح بإنشاء أي بيانات بدون لوجو.

## ✅ المستويات الأربعة

### 1️⃣ UI Layer (Frontend Form)
**الملف:** `app/(auth)/onboarding/page.tsx`

```typescript
const onSubmit = async (data: OrganizationForm) => {
  // CRITICAL: Check if logo is provided
  if (!logoFile && !existingLogoUrl) {
    toast({
      variant: 'destructive',
      title: 'الشعار مطلوب',
      description: 'يجب رفع شعار الشركة قبل المتابعة. لا يمكن حفظ أي بيانات بدون شعار.',
    })
    return
  }
  
  // Double check after upload
  if (!logoUrl) {
    toast({
      variant: 'destructive',
      title: 'خطأ - الشعار إلزامي',
      description: 'فشل رفع الشعار. يرجى المحاولة مرة أخرى.',
    })
    return
  }
}
```

---

### 2️⃣ Dashboard Pages (Receipt Creation)
**الملف:** `app/dashboard/receipts/new/page.tsx`

```typescript
// Check if organization has a logo before allowing receipt creation
const { data: orgData } = await supabase
  .from('organizations')
  .select('logo_url')
  .eq('id', userData.organization_id)
  .single()

if (!orgData?.logo_url || orgData.logo_url === '' || orgData.logo_url === 'PLACEHOLDER_LOGO_REQUIRED') {
  toast({
    variant: 'destructive',
    title: 'اللوجو مطلوب',
    description: 'يجب رفع شعار الشركة أولاً...',
  })
  router.push('/dashboard/settings')
  return
}
```

---

### 3️⃣ API Layer (PDF Generation)
**الملف:** `app/api/receipts/generate-pdf/route.ts`

```typescript
// Check if organization has a valid logo
if (!organization.logo_url || organization.logo_url === '' || organization.logo_url === 'PLACEHOLDER_LOGO_REQUIRED') {
  return NextResponse.json(
    { error: 'Organization logo is required. Please complete onboarding...' },
    { status: 400 }
  )
}
```

---

### 4️⃣ Database Layer (PostgreSQL Trigger)
**الملف:** `supabase/migrations/009_require_logo.sql`

```sql
-- Make logo_url NOT NULL at database level
ALTER TABLE organizations 
ALTER COLUMN logo_url SET NOT NULL;

-- Add check constraint
ALTER TABLE organizations 
ADD CONSTRAINT logo_url_not_empty 
CHECK (logo_url != '' AND logo_url != 'PLACEHOLDER_LOGO_REQUIRED');

-- Trigger function (with fixed search_path)
CREATE OR REPLACE FUNCTION check_organization_has_logo()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  SELECT logo_url INTO org_logo_url
  FROM organizations
  WHERE id = NEW.organization_id;

  IF org_logo_url IS NULL OR org_logo_url = '' THEN
    RAISE EXCEPTION 'Cannot create receipts: Organization must have a valid logo';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to receipts table
CREATE TRIGGER check_logo_before_receipt
  BEFORE INSERT ON receipts
  FOR EACH ROW
  EXECUTE FUNCTION check_organization_has_logo();
```

---

## 🔒 Security Fixes Applied

### Fixed search_path Warning (Dec 2024)
**الملف:** `supabase/migrations/010_fix_search_path.sql`

تم إصلاح تحذير Supabase الأمني:
- ✅ إضافة `SET search_path = public, pg_temp`
- ✅ إضافة `SECURITY DEFINER`
- ✅ لم يتم تغيير أي منطق في الكود

---

## 📋 Flow Summary

```
1. User signs up → Redirected to Onboarding
2. Onboarding Form → Logo is REQUIRED (UI validation)
3. Submit Form → Double validation before DB insert
4. Receipt Creation → Blocked if no logo (Dashboard + Trigger)
5. PDF Generation → Blocked if no logo (API)
```

## 🧪 Testing

يمكن اختبار التحقق من اللوجو على كل مستوى:

```bash
# 1. Try to skip logo in form (should show error)
# 2. Try to create receipt without logo (should redirect)
# 3. Try to generate PDF without logo (should return 400)
# 4. Try to insert receipt in DB without org logo (trigger will fail)
```

---

**آخر تحديث:** 25 ديسمبر 2024  
**الحالة:** ✅ جميع المستويات تعمل بشكل صحيح
