'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

const receiptSchema = z.object({
  receiptType: z.enum(['receipt', 'payment']),
  recipientName: z.string().min(3, { message: 'اسم المستلم/الدافع مطلوب' }),
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: 'المبلغ يجب أن يكون أكبر من صفر',
  }),
  date: z.string().min(1, { message: 'التاريخ مطلوب' }),
  description: z.string().optional(),
  paymentMethod: z.enum(['cash', 'check', 'bank_transfer']),
  nationalIdFrom: z.string().optional(),
  nationalIdTo: z.string().optional(),
  bankName: z.string().optional(),
  chequeNumber: z.string().optional(),
  transferNumber: z.string().optional(),
  vatAmount: z.string().optional(),
}).refine((data) => {
  if (data.paymentMethod === 'check') {
    return !!data.bankName && !!data.chequeNumber;
  }
  if (data.paymentMethod === 'bank_transfer') {
    return !!data.bankName && !!data.transferNumber;
  }
  return true;
}, {
  message: "بيانات الدفع ناقصة (البنك ورقم الشيك/الحوالة مطلوبان)",
  path: ["paymentMethod"],
});

type ReceiptForm = z.infer<typeof receiptSchema>

export default function NewReceiptPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ReceiptForm>({
    resolver: zodResolver(receiptSchema),
    defaultValues: {
      receiptType: 'receipt',
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'cash',
      vatAmount: '0',
    },
  })

  const receiptType = watch('receiptType')
  const paymentMethod = watch('paymentMethod')
  const amount = watch('amount')
  const vatAmount = watch('vatAmount')

  const totalAmount = (Number(amount || 0) + Number(vatAmount || 0)).toFixed(2)

  const onSubmit = async (data: ReceiptForm) => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        toast({
          variant: 'destructive',
          title: 'خطأ',
          description: 'يجب تسجيل الدخول',
        })
        return
      }

      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (!userData) {
        toast({
          variant: 'destructive',
          title: 'خطأ',
          description: 'المستخدم غير موجود',
        })
        return
      }

      // Generate receipt number using database function
      const { data: receiptNumber } = await supabase
        .rpc('generate_receipt_number', {
          org_id: userData.organization_id,
          receipt_type: data.receiptType,
        })

      if (!receiptNumber) {
        throw new Error('فشل في توليد رقم السند')
      }

      // Create receipt
      const { data: receipt, error } = await supabase
        .from('receipts')
        .insert({
          organization_id: userData.organization_id,
          receipt_number: receiptNumber,
          receipt_type: data.receiptType,
          amount: Number(data.amount),
          recipient_name: data.recipientName,
          description: data.description || null,
          payment_method: data.paymentMethod,
          date: data.date,
          created_by: user.id,
          national_id_from: data.nationalIdFrom || null,
          national_id_to: data.nationalIdTo || null,
          bank_name: data.bankName || null,
          cheque_number: data.chequeNumber || null,
          transfer_number: data.transferNumber || null,
          vat_amount: Number(data.vatAmount || 0),
          total_amount: Number(totalAmount),
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      // Generate PDF
      const pdfResponse = await fetch('/api/receipts/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ receiptId: receipt.id }),
      })

      if (!pdfResponse.ok) {
        console.error('فشل في توليد PDF')
      }

      toast({
        title: 'تم إنشاء السند بنجاح',
        description: `رقم السند: ${receiptNumber}`,
      })

      router.push(`/dashboard/receipts/${receipt.id}`)
      router.refresh()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'حدث خطأ',
        description: error.message || 'حاول مرة أخرى',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/receipts">
          <Button variant="ghost" size="icon">
            <ArrowRight className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">سند جديد</h1>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>بيانات السند</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <          CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>نوع السند</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="receipt"
                    {...register('receiptType')}
                    className="w-4 h-4"
                  />
                  <span>سند قبض</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="payment"
                    {...register('receiptType')}
                    className="w-4 h-4"
                  />
                  <span>سند صرف</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="recipientName">
                  {receiptType === 'receipt' ? 'استلمنا من السيد/السادة' : 'صرفنا إلى السيد/السادة'}
                </Label>
                <Input
                  id="recipientName"
                  placeholder="الاسم"
                  {...register('recipientName')}
                  disabled={isLoading}
                />
                {errors.recipientName && (
                  <p className="text-sm text-destructive">{errors.recipientName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="nationalIdFrom">
                  {receiptType === 'receipt' ? 'رقم الهوية (للمستلم منه)' : 'رقم الهوية (للمستفيد)'}
                </Label>
                <Input
                  id="nationalIdFrom"
                  placeholder="رقم الهوية"
                  {...register('nationalIdFrom')}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-2">
                <Label htmlFor="nationalIdTo">
                   {receiptType === 'receipt' ? 'رقم الهوية (للمستلم)' : 'رقم الهوية (للدافع)'}
                </Label>
                <Input
                  id="nationalIdTo"
                  placeholder="رقم الهوية"
                  {...register('nationalIdTo')}
                  disabled={isLoading}
                />
              </div>
               <div className="space-y-2">
                <Label htmlFor="date">التاريخ</Label>
                <Input
                  id="date"
                  type="date"
                  {...register('date')}
                  disabled={isLoading}
                />
                {errors.date && (
                  <p className="text-sm text-destructive">{errors.date.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">المبلغ (بدون ضريبة)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...register('amount')}
                  disabled={isLoading}
                />
                {errors.amount && (
                  <p className="text-sm text-destructive">{errors.amount.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="vatAmount">قيمة الضريبة</Label>
                <Input
                  id="vatAmount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...register('vatAmount')}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label>الإجمالي</Label>
                <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm">
                  {totalAmount}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">طريقة الدفع</Label>
              <select
                id="paymentMethod"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...register('paymentMethod')}
                disabled={isLoading}
              >
                <option value="cash">نقداً</option>
                <option value="check">شيك</option>
                <option value="bank_transfer">تحويل بنكي</option>
              </select>
              {errors.paymentMethod && (
                  <p className="text-sm text-destructive">{errors.paymentMethod.message}</p>
              )}
            </div>

            {paymentMethod === 'check' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-md bg-slate-50">
                <div className="space-y-2">
                  <Label htmlFor="bankName">اسم البنك</Label>
                  <Input
                    id="bankName"
                    placeholder="اسم البنك"
                    {...register('bankName')}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chequeNumber">رقم الشيك</Label>
                  <Input
                    id="chequeNumber"
                    placeholder="رقم الشيك"
                    {...register('chequeNumber')}
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}

            {paymentMethod === 'bank_transfer' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-md bg-slate-50">
                <div className="space-y-2">
                  <Label htmlFor="bankName">اسم البنك</Label>
                  <Input
                    id="bankName"
                    placeholder="اسم البنك"
                    {...register('bankName')}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transferNumber">رقم الحوالة</Label>
                  <Input
                    id="transferNumber"
                    placeholder="رقم الحوالة"
                    {...register('transferNumber')}
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">البيان (وصف السند)</Label>
              <textarea
                id="description"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="وصف السند أو ملاحظات إضافية"
                {...register('description')}
                disabled={isLoading}
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? 'جاري الحفظ...' : 'حفظ السند'}
              </Button>
              <Link href="/dashboard/receipts" className="flex-1">
                <Button type="button" variant="outline" className="w-full">
                  إلغاء
                </Button>
              </Link>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  )
}
