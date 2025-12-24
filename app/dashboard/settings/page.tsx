import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!userData) {
    return null
  }

  const { data: organization } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', userData.organization_id)
    .single()

  return (
    <div className="space-y-4 md:space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold">الإعدادات</h1>

      <Card>
        <CardHeader className="pb-3 md:pb-4">
          <CardTitle className="text-lg md:text-xl">بيانات الشركة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 md:px-6">
          {organization && (
            <>
              {organization.logo_url && (
                <div className="mb-4 md:mb-6 flex justify-center">
                  <img 
                    src={organization.logo_url} 
                    alt="شعار الشركة" 
                    className="h-24 w-24 md:h-32 md:w-32 object-contain border rounded-lg p-2"
                  />
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-2">
                  <Label className="text-sm md:text-base">اسم الشركة (عربي)</Label>
                  <Input value={organization.name_ar} disabled className="text-base" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm md:text-base">اسم الشركة (إنجليزي)</Label>
                  <Input value={organization.name_en} disabled className="text-base" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm md:text-base">العنوان</Label>
                <Input value={organization.address} disabled className="text-base" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-2">
                  <Label className="text-sm md:text-base">الهاتف</Label>
                  <Input value={organization.phone} disabled className="text-base" dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm md:text-base">البريد الإلكتروني</Label>
                  <Input value={organization.email} disabled className="text-base" dir="ltr" />
                </div>
              </div>
              {organization.commercial_registration && (
                <div className="space-y-2">
                  <Label className="text-sm md:text-base">السجل التجاري</Label>
                  <Input value={organization.commercial_registration} disabled className="text-base" />
                </div>
              )}
              {organization.tax_number && (
                <div className="space-y-2">
                  <Label className="text-sm md:text-base">الرقم الضريبي</Label>
                  <Input value={organization.tax_number} disabled className="text-base" />
                </div>
              )}
              {organization.description && (
                <div className="space-y-2">
                  <Label className="text-sm md:text-base">وصف الشركة</Label>
                  <textarea 
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                    value={organization.description} 
                    disabled 
                  />
                </div>
              )}
              <div className="pt-4">
                <p className="text-xs md:text-sm text-muted-foreground">
                  لتعديل هذه البيانات، يرجى التواصل مع الدعم الفني
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 md:pb-4">
          <CardTitle className="text-lg md:text-xl">معلومات الحساب</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 md:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-2">
              <Label className="text-sm md:text-base">البريد الإلكتروني</Label>
              <Input value={user.email} disabled className="text-base" dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm md:text-base">تاريخ إنشاء الحساب</Label>
              <Input
                value={new Date(user.created_at).toLocaleDateString('ar-SA')}
                disabled
                className="text-base"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
