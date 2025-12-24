'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'

const loginSchema = z.object({
  email: z.string().email({ message: 'البريد الإلكتروني غير صحيح' }),
  password: z.string().min(6, { message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (error) {
        let errorMessage = error.message
        if (error.message === 'Email not confirmed') {
          errorMessage = 'البريد الإلكتروني غير مفعل. يرجى التحقق من بريدك الإلكتروني.'
        } else if (error.message === 'Invalid login credentials') {
          errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
        }

        toast({
          variant: 'destructive',
          title: 'خطأ في تسجيل الدخول',
          description: errorMessage,
        })
        return
      }

      toast({
        title: 'تم تسجيل الدخول بنجاح',
      })

      if (authData.user) {
        const { data: userProfile } = await supabase
          .from('users')
          .select('organization_id')
          .eq('id', authData.user.id)
          .single()

        if (userProfile?.organization_id) {
          router.push('/dashboard')
        } else {
          router.push('/onboarding')
        }
        router.refresh()
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'حدث خطأ',
        description: 'حاول مرة أخرى',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 sm:space-y-2 px-4 sm:px-6">
          <CardTitle className="text-xl sm:text-2xl font-bold text-center">
            تسجيل الدخول
          </CardTitle>
          <CardDescription className="text-center text-sm sm:text-base">
            أدخل بياناتك للوصول إلى حسابك
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4 px-4 sm:px-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm sm:text-base">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@company.com"
                {...register('email')}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm sm:text-base">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                {...register('password')}
                disabled={isLoading}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 px-4 sm:px-6">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              ليس لديك حساب؟{' '}
              <Link href="/signup" className="text-primary hover:underline">
                إنشاء حساب جديد
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
