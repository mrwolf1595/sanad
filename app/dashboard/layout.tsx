import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardNav } from '@/components/dashboard/nav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user has completed onboarding
  const { data: userData, error } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  // If user record doesn't exist or has no organization, redirect to onboarding
  if (error || !userData?.organization_id) {
    redirect('/onboarding')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav />
      <main className="container mx-auto py-6 px-4">
        {children}
      </main>
    </div>
  )
}
