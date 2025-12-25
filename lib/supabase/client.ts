import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient<Database> | undefined

export function createClient() {
  // Singleton pattern - create only one instance
  if (client) {
    return client
  }

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Better handling for auth flows
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
        flowType: 'pkce',
      },
      global: {
        headers: {
          'X-Client-Info': 'sanad-receipts',
        },
      },
    }
  ) as SupabaseClient<Database>

  return client
}
