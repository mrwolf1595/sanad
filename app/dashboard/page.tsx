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
    <div className="space-y-4 md:space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">مرحباً، {userData.full_name}</h1>
          <p className="text-muted-foreground text-sm md:text-base">{organization?.name_ar}</p>
        </div>
        <Link href="/dashboard/receipts/new">
          <Button className="w-full sm:w-auto">
            <FileText className="ml-2 h-4 w-4" />
            سند جديد
          </Button>
        </Link>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">إجمالي القبض</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{totalReceipts.toFixed(2)} ريال</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">إجمالي الصرف</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{totalPayments.toFixed(2)} ريال</div>
          </CardContent>
        </Card>

        <Card className="sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">عدد السندات</CardTitle>
            <Receipt className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Receipts */}
      <Card>
        <CardHeader className="pb-3 md:pb-4">
          <CardTitle className="text-lg md:text-xl">آخر السندات</CardTitle>
        </CardHeader>
        <CardContent>
          {recentReceipts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-10 md:h-12 w-10 md:w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm md:text-base">لا توجد سندات بعد</p>
              <Link href="/dashboard/receipts/new">
                <Button variant="link" className="mt-2">إنشاء أول سند</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentReceipts.map((receipt) => (
                <Link
                  key={receipt.id}
                  href={`/dashboard/receipts/${receipt.id}`}
                  className="block"
                >
                  <div className="flex items-center justify-between p-3 md:p-4 border rounded-lg hover:bg-gray-50 transition touch-target">
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className={`p-2 rounded-lg flex-shrink-0 ${
                        receipt.receipt_type === 'receipt' 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-red-100 text-red-600'
                      }`}>
                        <FileText className="h-4 w-4 md:h-5 md:w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm md:text-base truncate">{receipt.receipt_number}</p>
                        <p className="text-xs md:text-sm text-muted-foreground truncate">{receipt.recipient_name}</p>
                      </div>
                    </div>
                    <div className="text-left flex-shrink-0 mr-2">
                      <p className="font-bold text-sm md:text-base">{Number(receipt.amount).toFixed(2)} ريال</p>
                      <p className="text-xs md:text-sm text-muted-foreground">
                        {new Date(receipt.date).toLocaleDateString('ar-SA')}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
              <Link href="/dashboard/receipts">
                <Button variant="outline" className="w-full mt-2">
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
