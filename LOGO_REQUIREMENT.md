# Logo Requirement Implementation

## Overview
This document describes the implementation of mandatory logo upload requirement for all organizations. **No data can be stored in the database until the user uploads a company logo.**

## Changes Made

### 1. Database Level (Migration: 009_require_logo.sql)

#### Schema Changes:
- Made `logo_url` column NOT NULL in organizations table
- Added check constraint to ensure logo_url is not empty
- Added database trigger to prevent receipt creation without valid logo

#### Database Trigger:
```sql
CREATE TRIGGER check_logo_before_receipt
  BEFORE INSERT ON receipts
  FOR EACH ROW
  EXECUTE FUNCTION check_organization_has_logo();
```

This trigger automatically blocks any attempt to insert receipts if the organization doesn't have a valid logo.

### 2. Onboarding Page ([app/(auth)/onboarding/page.tsx](app/(auth)/onboarding/page.tsx))

#### Changes:
- **Logo is now mandatory** - users cannot complete onboarding without uploading a logo
- Added state to track existing logo: `existingLogoUrl`
- Added validation before form submission:
  ```typescript
  if (!logoFile && !existingLogoUrl) {
    toast({
      variant: 'destructive',
      title: 'الشعار مطلوب',
      description: 'يجب رفع شعار الشركة قبل المتابعة. لا يمكن حفظ أي بيانات بدون شعار.',
    })
    return
  }
  ```

#### UI Changes:
- Label changed from "رفع الشعار (اختياري)" to "**رفع الشعار (مطلوب) \***"
- Added warning message: "⚠️ الشعار مطلوب: لا يمكنك إنشاء سندات أو حفظ أي بيانات بدون رفع شعار الشركة"
- Added visual indicators:
  - ✓ Green checkmark when file is selected
  - ✓ Green checkmark when existing logo is found
  - ⚠️ Red warning when no logo is present

### 3. Dashboard Layout ([app/dashboard/layout.tsx](app/dashboard/layout.tsx))

#### Additional Check:
```typescript
// Check if organization has a logo uploaded
const { data: organization } = await supabase
  .from('organizations')
  .select('logo_url')
  .eq('id', userData.organization_id)
  .single()

// If organization exists but has no logo, redirect back to onboarding
if (!organization?.logo_url || organization.logo_url === '' || 
    organization.logo_url === 'PLACEHOLDER_LOGO_REQUIRED') {
  redirect('/onboarding')
}
```

This ensures that even if a user somehow bypasses the onboarding, they cannot access the dashboard without a logo.

### 4. Receipt Creation Page ([app/dashboard/receipts/new/page.tsx](app/dashboard/receipts/new/page.tsx))

#### Validation Added:
```typescript
// Check if organization has a logo before allowing receipt creation
const { data: orgData } = await supabase
  .from('organizations')
  .select('logo_url')
  .eq('id', userData.organization_id)
  .single()

if (!orgData?.logo_url || orgData.logo_url === '' || 
    orgData.logo_url === 'PLACEHOLDER_LOGO_REQUIRED') {
  toast({
    variant: 'destructive',
    title: 'الشعار مطلوب',
    description: 'يجب رفع شعار الشركة قبل إنشاء أي سندات. يرجى إكمال عملية الإعداد.',
  })
  router.push('/onboarding')
  return
}
```

This prevents receipt creation at the application level before it reaches the database.

### 5. PDF Generation API ([app/api/receipts/generate-pdf/route.ts](app/api/receipts/generate-pdf/route.ts))

#### Validation Added:
```typescript
// Check if organization has a valid logo
if (!organization.logo_url || organization.logo_url === '' || 
    organization.logo_url === 'PLACEHOLDER_LOGO_REQUIRED') {
  return NextResponse.json(
    { error: 'Organization logo is required. Please complete onboarding and upload a logo before generating receipts.' },
    { status: 400 }
  )
}
```

This ensures PDFs cannot be generated without a logo, protecting the API endpoint.

## Security Layers

The implementation uses **5 layers of protection**:

1. **Database Trigger** - Blocks INSERT at database level
2. **Dashboard Layout** - Redirects to onboarding if no logo
3. **Onboarding Form** - Prevents submission without logo
4. **Receipt Creation** - Validates before INSERT query
5. **PDF Generation API** - Validates before generating PDF

## Migration Instructions

### To Apply This Update:

1. **Run the database migration:**
   - Open Supabase SQL Editor
   - Execute `supabase/migrations/009_require_logo.sql`

2. **Handle existing organizations without logos:**
   - The migration sets placeholder value for existing orgs without logos
   - These users will be redirected to onboarding on next login
   - They must upload a logo to continue using the system

3. **Test the implementation:**
   ```bash
   # Try to create a receipt without logo
   # System should block and redirect to onboarding
   
   # Upload logo in onboarding
   # Verify receipt creation now works
   ```

## User Experience Flow

### For New Users:
1. Sign up → Redirected to onboarding
2. Complete steps 1 & 2 (company info)
3. **Step 3: MUST upload logo** (cannot proceed without it)
4. Access dashboard and create receipts

### For Existing Users Without Logo:
1. Login → Redirected to dashboard layout check
2. No logo detected → Redirected to onboarding
3. **Must upload logo in step 3**
4. Only then can access dashboard

## Error Messages (Arabic)

| Situation | Message |
|-----------|---------|
| No logo on submit | "الشعار مطلوب: يجب رفع شعار الشركة قبل المتابعة. لا يمكن حفظ أي بيانات بدون شعار." |
| Creating receipt without logo | "يجب رفع شعار الشركة قبل إنشاء أي سندات. يرجى إكمال عملية الإعداد." |
| Database trigger | "Cannot create receipts: Organization must have a valid logo. Please complete onboarding first." |

## Technical Notes

### Database Constraint:
- `PLACEHOLDER_LOGO_REQUIRED` is a temporary value set by migration
- The check constraint prevents this value from being saved again
- Valid logo URLs must be actual URLs, not empty or placeholder

### File Upload:
- Accepted formats: PNG, JPG, JPEG
- Recommended size: 500×500 pixels
- Stored in Supabase Storage bucket: `logos`
- File naming: `{user_id}-{timestamp}.{extension}`

### Row Level Security:
- All existing RLS policies remain in place
- Logo requirement is enforced BEFORE RLS checks
- Trigger runs at database level before policies

## Testing Checklist

- [ ] New user signup → forced to upload logo
- [ ] Existing user without logo → redirected to onboarding
- [ ] Cannot create receipt without logo
- [ ] Cannot generate PDF without logo
- [ ] Database trigger blocks INSERT without logo
- [ ] Dashboard access blocked without logo
- [ ] Onboarding form blocks submission without logo

## Rollback Instructions

If you need to rollback this change:

```sql
-- Remove the trigger
DROP TRIGGER IF EXISTS check_logo_before_receipt ON receipts;
DROP FUNCTION IF EXISTS check_organization_has_logo();

-- Remove the check constraint
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS logo_url_not_empty;

-- Make logo_url nullable again
ALTER TABLE organizations ALTER COLUMN logo_url DROP NOT NULL;
```

Then revert the code changes in the affected files.

## Future Enhancements

Potential improvements for the future:

1. **Logo Validation:**
   - Check image dimensions
   - Validate file size (max 5MB)
   - Auto-resize/optimize uploaded images

2. **Logo Preview:**
   - Show preview before uploading
   - Display existing logo in onboarding if already uploaded

3. **Default Logo:**
   - Provide system default logos for quick setup
   - Allow selection from predefined templates

4. **Branding:**
   - Add support for secondary logos
   - Custom color schemes
   - Multiple logo versions (light/dark)

## Support

For issues or questions about this implementation, please refer to:
- [README.md](README.md) - General project documentation
- [PDF_FIXES.md](PDF_FIXES.md) - PDF generation with Arabic support
- [SUPABASE_SECURITY_FIXES.md](SUPABASE_SECURITY_FIXES.md) - Security implementations
