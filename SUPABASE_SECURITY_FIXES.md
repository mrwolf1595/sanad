# Security and Bug Fixes

I have addressed the reported issues. Please follow these steps to complete the fixes.

## 1. Database Function Security (Search Path Mutable)

I have created a new migration file `supabase/migrations/009_fix_search_path.sql` that fixes the security vulnerabilities in `generate_receipt_number` and `get_user_org_id` by setting a fixed `search_path`.

**Action Required:**
1.  Go to your Supabase Dashboard.
2.  Open the **SQL Editor**.
3.  Copy the content of `supabase/migrations/009_fix_search_path.sql`.
4.  Run the SQL query.

## 2. PDF Arabic Rendering

I have updated `lib/pdf/fillTemplate.ts` to improve Arabic text rendering.
-   **Fix:** Added logic to detect Arabic text.
-   **Fix:** Only applies reshaping and reversing to Arabic text (fixing issues with English IDs like "REC-00001" appearing reversed).
-   **Fix:** Enforced `Right` text alignment for fields, which is crucial for correct Arabic display.

**Action Required:**
-   None. The code is updated. You can test by generating a new receipt.

## 3. Leaked Password Protection (Supabase Auth)

This is a configuration setting in Supabase that cannot be changed via code.

**Action Required:**
1.  Go to your Supabase Dashboard.
2.  Navigate to **Authentication** -> **Configuration** (or **Settings**).
3.  Look for **Security** or **Password Protection** section.
4.  Enable **"Enable Leaked Password Protection"** (checks against HaveIBeenPwned.org).
5.  Click **Save**.

## Summary of Changes

-   `supabase/migrations/009_fix_search_path.sql`: Created to fix function security.
-   `lib/pdf/fillTemplate.ts`: Updated to fix Arabic PDF rendering and English text reversal.
