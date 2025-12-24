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

      // Check if organization has a logo before allowing receipt creation
      const { data: orgData } = await supabase
        .from('organizations')
        .select('logo_url')
        .eq('id', userData.organization_id)
        .single()

      if (!orgData?.logo_url || orgData.logo_url === '' || orgData.logo_url === 'PLACEHOLDER_LOGO_REQUIRED') {
        toast({
          variant: 'destructive',
          title: 'الشعار مطلوب',
          description: 'يجب رفع شعار الشركة قبل إنشاء أي سندات. يرجى إكمال عملية الإعداد.',
        })
        router.push('/onboarding')
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
<<<<<<< HEAD
        const errorData = await pdfResponse.json().catch(() => ({}));
        console.error('فشل في توليد PDF', errorData)
        toast({
            variant: 'destructive',
            title: 'فشل في توليد PDF',
            description: errorData.error || 'حدث خطأ غير معروف',
        })
=======
        const errorData = await pdfResponse.json()
        console.error('فشل في توليد PDF:', errorData)
        throw new Error(errorData.error || 'فشل في توليد PDF')
>>>>>>> 158353072a525fa064c786f5a92c37de028449f2
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
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center gap-3 md:gap-4">
        <Link href="/dashboard/receipts">
          <Button variant="ghost" size="icon" className="touch-target flex-shrink-0">
            <ArrowRight className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-xl md:text-3xl font-bold">سند جديد</h1>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader className="pb-3 md:pb-4 px-4 md:px-6">
          <CardTitle className="text-lg md:text-xl">بيانات السند</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-5 md:space-y-6 px-4 md:px-6">
            <div className="space-y-2">
              <Label className="text-sm md:text-base">نوع السند</Label>
              <div className="flex flex-wrap gap-4 md:gap-6">
                <label className="flex items-center gap-2 cursor-pointer touch-target">
                  <input
                    type="radio"
                    value="receipt"
                    {...register('receiptType')}
                    className="w-4 h-4 md:w-5 md:h-5"
                  />
                  <span className="text-sm md:text-base">سند قبض</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer touch-target">
                  <input
                    type="radio"
                    value="payment"
                    {...register('receiptType')}
                    className="w-4 h-4 md:w-5 md:h-5"
                  />
                  <span className="text-sm md:text-base">سند صرف</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <div className="space-y-2">
                <Label htmlFor="recipientName" className="text-sm md:text-base">
                  {receiptType === 'receipt' ? 'استلمنا من السيد/السادة' : 'صرفنا إلى السيد/السادة'}
                </Label>
                <Input
                  id="recipientName"
                  placeholder="الاسم"
                  {...register('recipientName')}
                  disabled={isLoading}
                  className="text-base"
                />
                {errors.recipientName && (
                  <p className="text-xs md:text-sm text-destructive">{errors.recipientName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="nationalIdFrom" className="text-sm md:text-base">
                  {receiptType === 'receipt' ? 'رقم الهوية (للمستلم منه)' : 'رقم الهوية (للمستفيد)'}
                </Label>
                <Input
                  id="nationalIdFrom"
                  placeholder="رقم الهوية"
                  {...register('nationalIdFrom')}
                  disabled={isLoading}
                  className="text-base"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
               <div className="space-y-2">
                <Label htmlFor="nationalIdTo" className="text-sm md:text-base">
                   {receiptType === 'receipt' ? 'رقم الهوية (للمستلم)' : 'رقم الهوية (للدافع)'}
                </Label>
                <Input
                  id="nationalIdTo"
                  placeholder="رقم الهوية"
                  {...register('nationalIdTo')}
                  disabled={isLoading}
                  className="text-base"
                />
              </div>
               <div className="space-y-2">
                <Label htmlFor="date" className="text-sm md:text-base">التاريخ</Label>
                <Input
                  id="date"
                  type="date"
                  {...register('date')}
                  disabled={isLoading}
                  className="text-base"
                />
                {errors.date && (
                  <p className="text-xs md:text-sm text-destructive">{errors.date.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-sm md:text-base">المبلغ (بدون ضريبة)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...register('amount')}
                  disabled={isLoading}
                  className="text-base"
                />
                {errors.amount && (
                  <p className="text-xs md:text-sm text-destructive">{errors.amount.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="vatAmount" className="text-sm md:text-base">قيمة الضريبة</Label>
                <Input
                  id="vatAmount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...register('vatAmount')}
                  disabled={isLoading}
                  className="text-base"
                />
              </div>
              <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                <Label className="text-sm md:text-base">الإجمالي</Label>
                <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-base font-semibold">
                  {totalAmount} ريال
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod" className="text-sm md:text-base">طريقة الدفع</Label>
              <select
                id="paymentMethod"
                className="flex h-10 md:h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...register('paymentMethod')}
                disabled={isLoading}
              >
                <option value="cash">نقداً</option>
                <option value="check">شيك</option>
                <option value="bank_transfer">تحويل بنكي</option>
              </select>
              {errors.paymentMethod && (
                  <p className="text-xs md:text-sm text-destructive">{errors.paymentMethod.message}</p>
              )}
            </div>

            {paymentMethod === 'check' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 p-3 md:p-4 border rounded-md bg-slate-50">
                <div className="space-y-2">
                  <Label htmlFor="bankName" className="text-sm md:text-base">اسم البنك</Label>
                  <Input
                    id="bankName"
                    placeholder="اسم البنك"
                    {...register('bankName')}
                    disabled={isLoading}
                    className="text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chequeNumber" className="text-sm md:text-base">رقم الشيك</Label>
                  <Input
                    id="chequeNumber"
                    placeholder="رقم الشيك"
                    {...register('chequeNumber')}
                    disabled={isLoading}
                    className="text-base"
                  />
                </div>
              </div>
            )}

            {paymentMethod === 'bank_transfer' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 p-3 md:p-4 border rounded-md bg-slate-50">
                <div className="space-y-2">
                  <Label htmlFor="bankName" className="text-sm md:text-base">اسم البنك</Label>
                  <Input
                    id="bankName"
                    placeholder="اسم البنك"
                    {...register('bankName')}
                    disabled={isLoading}
                    className="text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transferNumber" className="text-sm md:text-base">رقم الحوالة</Label>
                  <Input
                    id="transferNumber"
                    placeholder="رقم الحوالة"
                    {...register('transferNumber')}
                    disabled={isLoading}
                    className="text-base"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm md:text-base">البيان (وصف السند)</Label>
              <textarea
                id="description"
                className="flex min-h-[80px] md:min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
                placeholder="وصف السند أو ملاحظات إضافية"
                {...register('description')}
                disabled={isLoading}
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-3 md:gap-4 pt-2">
              <Link href="/dashboard/receipts" className="flex-1">
                <Button type="button" variant="outline" className="w-full h-11 md:h-10">
                  إلغاء
                </Button>
              </Link>
              <Button type="submit" disabled={isLoading} className="flex-1 h-11 md:h-10">
                {isLoading ? 'جاري الحفظ...' : 'حفظ السند'}
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  )
}
