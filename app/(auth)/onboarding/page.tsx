'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import { Building2, FileText, Upload } from 'lucide-react'

const organizationSchema = z.object({
  nameAr: z.string().min(3, { message: 'اسم الشركة بالعربي مطلوب (3 أحرف على الأقل)' }),
  nameEn: z.string().min(3, { message: 'اسم الشركة بالإنجليزي مطلوب (3 أحرف على الأقل)' }),
  entityType: z.enum(['company', 'establishment', 'office', 'other']),
  commercialRegistration: z.string().optional(),
  taxNumber: z.string().optional(),
  address: z.string().min(5, { message: 'العنوان مطلوب (5 أحرف على الأقل)' }),
  phone: z.string().min(9, { message: 'رقم الهاتف مطلوب' }),
  email: z.string().email({ message: 'البريد الإلكتروني غير صحيح' }),
  description: z.string().optional(),
  logo: z.any().optional(),
})

type OrganizationForm = z.infer<typeof organizationSchema>

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [existingOrgId, setExistingOrgId] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  const {
    register,
    handleSubmit,
    formState: { errors },
    trigger,
    setValue,
  } = useForm<OrganizationForm>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      entityType: 'company',
    },
  })

  useEffect(() => {
    if (isInitialized) return
    
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast({
          variant: 'destructive',
          title: 'تنبيه',
          description: 'يجب تسجيل الدخول للوصول إلى هذه الصفحة',
        })
        router.push('/login')
        return
      }

      // Check if user has already completed onboarding
      const { data: userProfile } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (userProfile?.organization_id) {
        // Fetch existing organization data
        const { data: org } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', userProfile.organization_id)
          .single()
        
        if (org) {
          setExistingOrgId(org.id)
          setValue('nameAr', org.name_ar)
          setValue('nameEn', org.name_en)
          setValue('entityType', org.entity_type as any)
          setValue('commercialRegistration', org.commercial_registration || '')
          setValue('taxNumber', org.tax_number || '')
          setValue('address', org.address)
          setValue('phone', org.phone)
          setValue('email', org.email)
          setValue('description', org.description || '')
        }
      }
      
      setIsInitialized(true)
    }
    checkUser()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const nextStep = async () => {
    let fieldsToValidate: (keyof OrganizationForm)[] = []
    
    if (step === 1) {
      fieldsToValidate = ['nameAr', 'nameEn', 'entityType', 'commercialRegistration', 'taxNumber']
    } else if (step === 2) {
      fieldsToValidate = ['address', 'phone', 'email']
    }

    const isValid = await trigger(fieldsToValidate)
    if (isValid) {
      setStep(step + 1)
    }
  }

  const prevStep = () => {
    setStep(step - 1)
  }

  const onSubmit = async (data: OrganizationForm) => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        toast({
          variant: 'destructive',
          title: 'خطأ',
          description: 'يجب تسجيل الدخول أولاً',
        })
        router.push('/login')
        return
      }

      // Upload logo if provided
      let logoUrl = null
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop()
        const fileName = `${user.id}-${Date.now()}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(fileName, logoFile)

        if (uploadError) {
          throw uploadError
        }

        const { data: publicUrlData } = supabase.storage
          .from('logos')
          .getPublicUrl(fileName)

        logoUrl = publicUrlData.publicUrl
      }

      let orgId = existingOrgId

      if (existingOrgId) {
        // Update existing organization
        const { error: updateError } = await supabase
          .from('organizations')
          .update({
            name_ar: data.nameAr,
            name_en: data.nameEn,
            entity_type: data.entityType,
            commercial_registration: data.commercialRegistration || null,
            tax_number: data.taxNumber || null,
            address: data.address,
            phone: data.phone,
            email: data.email,
            description: data.description || null,
            ...(logoUrl ? { logo_url: logoUrl } : {}),
          })
          .eq('id', existingOrgId)

        if (updateError) throw updateError
      } else {
        // Create organization
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name_ar: data.nameAr,
            name_en: data.nameEn,
            entity_type: data.entityType,
            commercial_registration: data.commercialRegistration || null,
            tax_number: data.taxNumber || null,
            address: data.address,
            phone: data.phone,
            email: data.email,
            description: data.description || null,
            logo_url: logoUrl,
            created_by: user.id,
          })
          .select()
          .single()

        if (orgError) throw orgError
        orgId = orgData.id
      }

      // Create or update user profile
      const { error: userError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          organization_id: orgId!,
          full_name: user.user_metadata.full_name || user.email!.split('@')[0],
          role: 'admin' as const,
        })

      if (userError) {
        throw userError
      }

      toast({
        title: existingOrgId ? 'تم تحديث البيانات بنجاح' : 'تم إنشاء الشركة بنجاح',
        description: 'مرحباً بك في نظام سندات القبض والصرف',
      })

      router.push('/dashboard')
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            إعداد بيانات الشركة
          </CardTitle>
          <CardDescription className="text-center">
            الخطوة {step} من 3
          </CardDescription>
          <div className="flex gap-2 mt-4">
            <div className={`flex-1 h-2 rounded ${step >= 1 ? 'bg-primary' : 'bg-gray-200'}`} />
            <div className={`flex-1 h-2 rounded ${step >= 2 ? 'bg-primary' : 'bg-gray-200'}`} />
            <div className={`flex-1 h-2 rounded ${step >= 3 ? 'bg-primary' : 'bg-gray-200'}`} />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Basic Information */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Building2 className="w-5 h-5" />
                <span>البيانات الأساسية</span>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="nameAr">اسم الشركة/المؤسسة (عربي)</Label>
                <Input
                  id="nameAr"
                  placeholder="شركة المثال للتجارة"
                  {...register('nameAr')}
                />
                {errors.nameAr && (
                  <p className="text-sm text-destructive">{errors.nameAr.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="nameEn">اسم الشركة/المؤسسة (إنجليزي)</Label>
                <Input
                  id="nameEn"
                  placeholder="Example Trading Company"
                  {...register('nameEn')}
                />
                {errors.nameEn && (
                  <p className="text-sm text-destructive">{errors.nameEn.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="entityType">نوع الكيان</Label>
                <select
                  id="entityType"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...register('entityType')}
                >
                  <option value="company">شركة</option>
                  <option value="establishment">مؤسسة</option>
                  <option value="office">مكتب</option>
                  <option value="other">أخرى</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="commercialRegistration">رقم السجل التجاري (اختياري)</Label>
                <Input
                  id="commercialRegistration"
                  placeholder="1234567890"
                  {...register('commercialRegistration')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxNumber">الرقم الضريبي (اختياري)</Label>
                <Input
                  id="taxNumber"
                  placeholder="300000000000003"
                  {...register('taxNumber')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">وصف الشركة (اختياري)</Label>
                <textarea
                  id="description"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="نبذة مختصرة عن نشاط الشركة"
                  {...register('description')}
                />
              </div>
            </div>
          )}

          {/* Step 2: Contact Information */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <FileText className="w-5 h-5" />
                <span>بيانات الاتصال</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">العنوان الكامل</Label>
                <Input
                  id="address"
                  placeholder="الرياض، شارع الملك فهد، مبنى رقم 123"
                  {...register('address')}
                />
                {errors.address && (
                  <p className="text-sm text-destructive">{errors.address.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">رقم الهاتف</Label>
                <Input
                  id="phone"
                  placeholder="0501234567"
                  {...register('phone')}
                />
                {errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني الرسمي</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="info@company.com"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Logo Upload */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Upload className="w-5 h-5" />
                <span>شعار الشركة</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo">رفع الشعار (اختياري)</Label>
                <div className="flex items-center gap-4">
                  <input
                    id="logo"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setLogoFile(file)
                      }
                    }}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  يفضل استخدام صورة بصيغة PNG أو JPG بحجم 500×500 بكسل
                </p>
                {logoFile && (
                  <p className="text-sm text-green-600">
                    تم اختيار الملف: {logoFile.name}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-4 pt-4">
            {step > 1 && (
              <Button type="button" variant="outline" onClick={prevStep} className="flex-1">
                السابق
              </Button>
            )}
            {step < 3 ? (
              <Button type="button" onClick={nextStep} className="flex-1">
                التالي
              </Button>
            ) : (
              <Button 
                type="button" 
                disabled={isLoading} 
                className="flex-1"
                onClick={handleSubmit(onSubmit)}
              >
                {isLoading ? 'جاري الحفظ...' : 'إنهاء الإعداد'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
