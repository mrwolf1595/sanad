'use client'

import { SessionProvider } from '@/components/auth/session-provider'
import { SessionWarningDialog } from '@/components/auth/session-warning-dialog'

interface DashboardProvidersProps {
  children: React.ReactNode
}

export function DashboardProviders({ children }: DashboardProvidersProps) {
  return (
    <SessionProvider timeoutMinutes={15} warningMinutes={1}>
      {children}
      <SessionWarningDialog />
    </SessionProvider>
  )
}
