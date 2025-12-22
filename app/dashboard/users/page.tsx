import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users as UsersIcon } from 'lucide-react'

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  // Check if user is admin
  if (!userData || userData.role !== 'admin') {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">المستخدمين</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              غير مصرح لك بالوصول إلى هذه الصفحة
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { data: users } = await supabase
    .from('users')
    .select('*')
    .eq('organization_id', userData.organization_id)
    .order('created_at', { ascending: false })

  const roleLabels: Record<string, string> = {
    admin: 'مدير',
    user: 'مستخدم',
    accountant: 'محاسب',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">المستخدمين</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>قائمة المستخدمين</CardTitle>
        </CardHeader>
        <CardContent>
          {!users || users.length === 0 ? (
            <div className="text-center py-12">
              <UsersIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">لا يوجد مستخدمين</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-right p-4">الاسم</th>
                    <th className="text-right p-4">الصلاحية</th>
                    <th className="text-right p-4">تاريخ الإضافة</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b hover:bg-gray-50">
                      <td className="p-4 font-medium">{u.full_name}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-sm ${
                          u.role === 'admin'
                            ? 'bg-blue-100 text-blue-700'
                            : u.role === 'accountant'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {roleLabels[u.role]}
                        </span>
                      </td>
                      <td className="p-4">
                        {new Date(u.created_at).toLocaleDateString('ar-SA')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
