import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    // Ignore auth errors for unauthenticated users
    if (!error && user) {
      redirect('/dashboard')
    }
  } catch (error) {
    // Silently catch and redirect to login for any auth errors
    console.log('Auth check error (expected for new users):', error)
  }
  
  redirect('/login')
}
