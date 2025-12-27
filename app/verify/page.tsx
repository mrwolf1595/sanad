'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { CheckCircle2, XCircle, Loader2, Search, Building2, Calendar, FileText, Banknote } from 'lucide-react'

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

function VerifyContent() {
  const searchParams = useSearchParams()
  const urlBarcode = searchParams.get('barcode_id') || searchParams.get('id') || searchParams.get('barcode') || ''

  const [barcodeId, setBarcodeId] = useState(urlBarcode)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasAutoVerified, setHasAutoVerified] = useState(false)

  const handleVerify = async (idToVerify: string = barcodeId) => {
    if (!idToVerify.trim()) {
      setError('الرجاء إدخال رقم الباركود')
      return
    }

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch(`/api/receipts/verify?barcode_id=${encodeURIComponent(idToVerify)}`)
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

  useEffect(() => {
    if (urlBarcode && !hasAutoVerified) {
      handleVerify(urlBarcode)
      setHasAutoVerified(true)
    }
  }, [urlBarcode, hasAutoVerified])

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
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          نظام التحقق من السندات
        </h1>
        <p className="text-gray-600">
          أدخل رقم الباركود أو امسح رمز QR للتحقق من صحة السند ومصدره
        </p>
      </div>

      <Card className="shadow-xl border-t-4 border-t-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            التحقق من السند
          </CardTitle>
          <CardDescription>
            صيغة الباركود: RCP-YYYY-NNNNNN أو REC-YYYY-NNNNNN
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="barcode">رقم الباركود</Label>
              <div className="flex gap-2">
                <Input
                  id="barcode"
                  type="text"
                  placeholder="Scan QR or enter code..."
                  value={barcodeId}
                  onChange={(e) => setBarcodeId(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="font-mono text-lg text-left"
                  dir="ltr"
                  disabled={isLoading}
                />
                <Button
                  onClick={() => handleVerify()}
                  disabled={isLoading}
                  size="lg"
                  className="min-w-[100px]"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    'تحقق'
                  )}
                </Button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg animate-in fade-in slide-in-from-top-2">
                <XCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
                <p className="text-red-800 font-medium">{error}</p>
              </div>
            )}

            {result && (
              <div className={`rounded-xl border shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-4 ${result.valid
                ? 'bg-gradient-to-br from-white to-green-50/30 border-green-200'
                : 'bg-gradient-to-br from-white to-red-50/30 border-red-200'
                }`}>
                {/* Status Banner */}
                <div className={`p-4 flex items-center justify-center gap-2 border-b ${result.valid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                  {result.valid ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : (
                    <XCircle className="h-6 w-6" />
                  )}
                  <span className="text-lg font-bold">{result.message}</span>
                </div>

                {result.valid && result.receipt && (
                  <div className="p-6">
                    {/* Organization Info - Top Card */}
                    <div className="flex items-center justify-between mb-8 pb-6 border-b border-dashed border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <Building2 className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 mb-1">الجهة المصدرة</p>
                          <h3 className="font-bold text-gray-900 text-lg">
                            {result.receipt.organization.name_ar}
                          </h3>
                        </div>
                      </div>
                      <div className="text-left">
                        {result.receipt.organization.commercial_registration && (
                          <p className="text-xs text-gray-500 font-mono">
                            CR: {result.receipt.organization.commercial_registration}
                          </p>
                        )}
                        {result.receipt.organization.tax_number && (
                          <p className="text-xs text-gray-500 font-mono">
                            VAT: {result.receipt.organization.tax_number}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Receipt Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                          <div className="flex items-center gap-2 text-gray-500 mb-1">
                            <Banknote className="h-4 w-4" />
                            <span className="text-sm">قيمة السند</span>
                          </div>
                          <p className="text-2xl font-bold text-green-600">
                            {formatAmount(result.receipt.amount)}
                          </p>
                        </div>

                        <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                          <div className="flex items-center gap-2 text-gray-500 mb-1">
                            <FileText className="h-4 w-4" />
                            <span className="text-sm">نوع السند</span>
                          </div>
                          <p className="font-semibold text-gray-900">
                            {result.receipt.receipt_type_ar}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                          <div className="flex items-center gap-2 text-gray-500 mb-1">
                            <Calendar className="h-4 w-4" />
                            <span className="text-sm">تاريخ السند</span>
                          </div>
                          <p className="font-semibold text-gray-900">
                            {formatDate(result.receipt.date)}
                          </p>
                        </div>

                        <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                          <div className="flex items-center gap-2 text-gray-500 mb-1">
                            <span className="text-sm">رقم السند</span>
                          </div>
                          <p className="font-mono font-semibold text-gray-900 text-lg">
                            {result.receipt.receipt_number}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-gray-100">
                      <p className="text-sm text-center text-gray-500">
                        تم إصدار هذا السند من خلال نظام سند الإلكتروني
                      </p>
                      <p className="text-gray-400 text-xs mt-1 text-center">
                        اسم المستلم: {result.receipt.recipient_name}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 text-center text-sm text-gray-500">
        <p>Sanad Verification System</p>
      </div>
    </div>
  )
}

export default function VerifyReceiptPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8" dir="rtl">
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }>
        <VerifyContent />
      </Suspense>
    </div>
  )
}
