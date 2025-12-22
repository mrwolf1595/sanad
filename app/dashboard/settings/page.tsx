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
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">الإعدادات</h1>

      <Card>
        <CardHeader>
          <CardTitle>بيانات الشركة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {organization && (
            <>
              {organization.logo_url && (
                <div className="mb-6 flex justify-center">
                  <img 
                    src={organization.logo_url} 
                    alt="شعار الشركة" 
                    className="h-32 w-32 object-contain border rounded-lg p-2"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>اسم الشركة (عربي)</Label>
                  <Input value={organization.name_ar} disabled />
                </div>
                <div className="space-y-2">
                  <Label>اسم الشركة (إنجليزي)</Label>
                  <Input value={organization.name_en} disabled />
                </div>
              </div>
              <div className="space-y-2">
                <Label>العنوان</Label>
                <Input value={organization.address} disabled />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الهاتف</Label>
                  <Input value={organization.phone} disabled />
                </div>
                <div className="space-y-2">
                  <Label>البريد الإلكتروني</Label>
                  <Input value={organization.email} disabled />
                </div>
              </div>
              {organization.commercial_registration && (
                <div className="space-y-2">
                  <Label>السجل التجاري</Label>
                  <Input value={organization.commercial_registration} disabled />
                </div>
              )}
              {organization.tax_number && (
                <div className="space-y-2">
                  <Label>الرقم الضريبي</Label>
                  <Input value={organization.tax_number} disabled />
                </div>
              )}
              {organization.description && (
                <div className="space-y-2">
                  <Label>وصف الشركة</Label>
                  <textarea 
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                    value={organization.description} 
                    disabled 
                  />
                </div>
              )}
              <div className="pt-4">
                <p className="text-sm text-muted-foreground">
                  لتعديل هذه البيانات، يرجى التواصل مع الدعم الفني
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>معلومات الحساب</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>البريد الإلكتروني</Label>
            <Input value={user.email} disabled />
          </div>
          <div className="space-y-2">
            <Label>تاريخ إنشاء الحساب</Label>
            <Input
              value={new Date(user.created_at).toLocaleDateString('ar-SA')}
              disabled
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
