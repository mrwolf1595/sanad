'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { CheckCircle2, XCircle, Loader2, Search } from 'lucide-react'

interface VerificationResult {
  valid: boolean
  message: string
  message_en: string
  receipt?: {
    id: string
    receipt_number: string
    receipt_type: string
    receipt_type_ar: string
    amount: number
    recipient_name: string
    date: string
    created_at: string
    barcode_id: string
    organization: {
      name_ar: string
      name_en: string
      commercial_registration: string
      tax_number: string
    }
  }
}

export default function VerifyReceiptPage() {
  const [barcodeId, setBarcodeId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleVerify = async () => {
    if (!barcodeId.trim()) {
      setError('الرجاء إدخال رقم الباركود')
      return
    }

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch(`/api/receipts/verify?barcode_id=${encodeURIComponent(barcodeId)}`)
      const data = await response.json()

      if (response.ok) {
        setResult(data)
      } else {
        setError(data.message || data.error || 'حدث خطأ أثناء التحقق')
      }
    } catch (err) {
      setError('فشل الاتصال بالخادم')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleVerify()
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'SAR'
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8" dir="rtl">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            التحقق من الإيصالات
          </h1>
          <p className="text-gray-600">
            أدخل رقم الباركود للتحقق من صحة الإيصال
          </p>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>التحقق من الإيصال</CardTitle>
            <CardDescription>
              صيغة الباركود: RCP-YYYY-NNNNNN (مثال: RCP-2024-000001)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="barcode">رقم الباركود</Label>
                <div className="flex gap-2">
                  <Input
                    id="barcode"
                    type="text"
                    placeholder="RCP-2024-000001"
                    value={barcodeId}
                    onChange={(e) => setBarcodeId(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="font-mono text-lg"
                    disabled={isLoading}
                  />
                  <Button
                    onClick={handleVerify}
                    disabled={isLoading}
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        جاري التحقق...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        تحقق
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <p className="text-red-800">{error}</p>
                </div>
              )}

              {result && (
                <div className={`p-6 rounded-lg border-2 ${
                  result.valid 
                    ? 'bg-green-50 border-green-300' 
                    : 'bg-red-50 border-red-300'
                }`}>
                  <div className="flex items-center gap-3 mb-4">
                    {result.valid ? (
                      <>
                        <CheckCircle2 className="h-8 w-8 text-green-600" />
                        <div>
                          <h3 className="text-xl font-bold text-green-900">
                            إيصال صحيح ✓
                          </h3>
                          <p className="text-green-700">{result.message}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-8 w-8 text-red-600" />
                        <div>
                          <h3 className="text-xl font-bold text-red-900">
                            إيصال غير صحيح ✗
                          </h3>
                          <p className="text-red-700">{result.message}</p>
                        </div>
                      </>
                    )}
                  </div>

                  {result.valid && result.receipt && (
                    <div className="mt-6 space-y-4 bg-white p-6 rounded-lg">
                      <h4 className="font-semibold text-lg mb-4 text-gray-900 border-b pb-2">
                        تفاصيل الإيصال
                      </h4>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">رقم الإيصال</p>
                          <p className="font-semibold text-gray-900">{result.receipt.receipt_number}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">نوع الإيصال</p>
                          <p className="font-semibold text-gray-900">{result.receipt.receipt_type_ar}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">المبلغ</p>
                          <p className="font-bold text-lg text-green-700">
                            {formatAmount(result.receipt.amount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">التاريخ</p>
                          <p className="font-semibold text-gray-900">{formatDate(result.receipt.date)}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-sm text-gray-600">اسم المستلم</p>
                          <p className="font-semibold text-gray-900">{result.receipt.recipient_name}</p>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t">
                        <h5 className="font-semibold text-sm mb-3 text-gray-700">معلومات الجهة المُصدرة</h5>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-gray-600">الاسم: </span>
                            <span className="font-medium text-gray-900">{result.receipt.organization.name_ar}</span>
                          </div>
                          {result.receipt.organization.commercial_registration && (
                            <div>
                              <span className="text-gray-600">السجل التجاري: </span>
                              <span className="font-medium text-gray-900 font-mono">
                                {result.receipt.organization.commercial_registration}
                              </span>
                            </div>
                          )}
                          {result.receipt.organization.tax_number && (
                            <div>
                              <span className="text-gray-600">الرقم الضريبي: </span>
                              <span className="font-medium text-gray-900 font-mono">
                                {result.receipt.organization.tax_number}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-gray-600">
          <p>هذه الخدمة مجانية ومتاحة للجميع للتحقق من صحة الإيصالات</p>
          <p className="mt-1">Public Receipt Verification Service</p>
        </div>
      </div>
    </div>
  )
}
