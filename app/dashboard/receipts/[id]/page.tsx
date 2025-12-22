import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight } from 'lucide-react'
import { PDFActions } from '@/components/dashboard/pdf-actions'

export default async function ReceiptDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, full_name')
    .eq('id', user.id)
    .single()

  if (!userData) {
    return notFound()
  }

  const { data: receipt } = await supabase
    .from('receipts')
    .select('*')
    .eq('id', id)
    .eq('organization_id', userData.organization_id)
    .single()

  if (!receipt) {
    notFound()
  }

  const { data: organization } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', userData.organization_id)
    .single()

  const paymentMethodLabels: Record<string, string> = {
    cash: 'نقدي',
    check: 'شيك',
    bank_transfer: 'تحويل بنكي',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/receipts">
            <Button variant="ghost" size="icon">
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">تفاصيل السند</h1>
            <p className="text-muted-foreground">رقم السند: {receipt.receipt_number}</p>
          </div>
        </div>
        <PDFActions receiptId={receipt.id} receiptNumber={receipt.receipt_number} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>بيانات السند</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">نوع السند</p>
              <p className="font-medium">
                {receipt.receipt_type === 'receipt' ? 'سند قبض' : 'سند صرف'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {receipt.receipt_type === 'receipt' ? 'المستلم' : 'الدافع'}
              </p>
              <p className="font-medium">{receipt.recipient_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">المبلغ</p>
              <p className="text-2xl font-bold">{Number(receipt.amount).toFixed(2)} ريال</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">التاريخ</p>
              <p className="font-medium">
                {new Date(receipt.date).toLocaleDateString('ar-SA', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            {receipt.payment_method && (
              <div>
                <p className="text-sm text-muted-foreground">طريقة الدفع</p>
                <p className="font-medium">{paymentMethodLabels[receipt.payment_method]}</p>
              </div>
            )}
            {receipt.description && (
              <div>
                <p className="text-sm text-muted-foreground">البيان</p>
                <p className="font-medium">{receipt.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>بيانات الشركة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {organization && (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">اسم الشركة</p>
                  <p className="font-medium">{organization.name_ar}</p>
                  <p className="text-sm text-muted-foreground">{organization.name_en}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">العنوان</p>
                  <p className="font-medium">{organization.address}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">الهاتف</p>
                  <p className="font-medium">{organization.phone}</p>
                </div>
                {organization.commercial_registration && (
                  <div>
                    <p className="text-sm text-muted-foreground">السجل التجاري</p>
                    <p className="font-medium">{organization.commercial_registration}</p>
                  </div>
                )}
                {organization.tax_number && (
                  <div>
                    <p className="text-sm text-muted-foreground">الرقم الضريبي</p>
                    <p className="font-medium">{organization.tax_number}</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
