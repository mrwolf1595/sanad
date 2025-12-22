import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, TrendingUp, TrendingDown, Receipt } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Get user's organization
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, full_name, role')
    .eq('id', user.id)
    .single()

  if (!userData) return null

  // Get organization details
  const { data: organization } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', userData.organization_id)
    .single()

  // Get receipts statistics
  const { data: receipts } = await supabase
    .from('receipts')
    .select('*')
    .eq('organization_id', userData.organization_id)
    .order('created_at', { ascending: false })

  const totalReceipts = receipts?.filter(r => r.receipt_type === 'receipt').reduce((sum, r) => sum + Number(r.amount), 0) || 0
  const totalPayments = receipts?.filter(r => r.receipt_type === 'payment').reduce((sum, r) => sum + Number(r.amount), 0) || 0
  const totalCount = receipts?.length || 0

  const recentReceipts = receipts?.slice(0, 5) || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">مرحباً، {userData.full_name}</h1>
          <p className="text-muted-foreground">{organization?.name_ar}</p>
        </div>
        <Link href="/dashboard/receipts/new">
          <Button>
            <FileText className="ml-2 h-4 w-4" />
            سند جديد
          </Button>
        </Link>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">إجمالي القبض</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReceipts.toFixed(2)} ريال</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الصرف</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPayments.toFixed(2)} ريال</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">عدد السندات</CardTitle>
            <Receipt className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Receipts */}
      <Card>
        <CardHeader>
          <CardTitle>آخر السندات</CardTitle>
        </CardHeader>
        <CardContent>
          {recentReceipts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد سندات بعد</p>
              <Link href="/dashboard/receipts/new">
                <Button variant="link">إنشاء أول سند</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {recentReceipts.map((receipt) => (
                <Link
                  key={receipt.id}
                  href={`/dashboard/receipts/${receipt.id}`}
                  className="block"
                >
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${
                        receipt.receipt_type === 'receipt' 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-red-100 text-red-600'
                      }`}>
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{receipt.receipt_number}</p>
                        <p className="text-sm text-muted-foreground">{receipt.recipient_name}</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="font-bold">{Number(receipt.amount).toFixed(2)} ريال</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(receipt.date).toLocaleDateString('ar-SA')}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
              <Link href="/dashboard/receipts">
                <Button variant="outline" className="w-full">
                  عرض جميع السندات
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
