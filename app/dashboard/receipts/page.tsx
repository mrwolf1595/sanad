import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Plus } from 'lucide-react'

export default async function ReceiptsPage() {
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

  const { data: receipts } = await supabase
    .from('receipts')
    .select('*')
    .eq('organization_id', userData.organization_id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">السندات</h1>
        <Link href="/dashboard/receipts/new">
          <Button>
            <Plus className="ml-2 h-4 w-4" />
            سند جديد
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>جميع السندات</CardTitle>
        </CardHeader>
        <CardContent>
          {!receipts || receipts.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">لا توجد سندات</p>
              <Link href="/dashboard/receipts/new">
                <Button>
                  <Plus className="ml-2 h-4 w-4" />
                  إنشاء سند جديد
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-right p-4">رقم السند</th>
                    <th className="text-right p-4">النوع</th>
                    <th className="text-right p-4">المستلم/الدافع</th>
                    <th className="text-right p-4">المبلغ</th>
                    <th className="text-right p-4">التاريخ</th>
                    <th className="text-right p-4">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((receipt) => (
                    <tr key={receipt.id} className="border-b hover:bg-gray-50">
                      <td className="p-4 font-medium">{receipt.receipt_number}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-sm ${
                          receipt.receipt_type === 'receipt'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {receipt.receipt_type === 'receipt' ? 'قبض' : 'صرف'}
                        </span>
                      </td>
                      <td className="p-4">{receipt.recipient_name}</td>
                      <td className="p-4 font-bold">{Number(receipt.amount).toFixed(2)} ريال</td>
                      <td className="p-4">
                        {new Date(receipt.date).toLocaleDateString('ar-SA')}
                      </td>
                      <td className="p-4">
                        <Link href={`/dashboard/receipts/${receipt.id}`}>
                          <Button variant="outline" size="sm">
                            عرض
                          </Button>
                        </Link>
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
