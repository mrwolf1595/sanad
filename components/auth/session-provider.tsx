'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useSessionTimeout } from '@/hooks/use-session-timeout'
import { useToast } from '@/hooks/use-toast'

interface SessionContextType {
  extendSession: () => void
  logout: () => Promise<void>
  getRemainingTime: () => number
  showWarning: boolean
  setShowWarning: (show: boolean) => void
}

const SessionContext = createContext<SessionContextType | undefined>(undefined)

interface SessionProviderProps {
  children: React.ReactNode
  /**
   * Session timeout in minutes (default: 15)
   */
  timeoutMinutes?: number
  /**
   * Warning time before logout in minutes (default: 1)
   */
  warningMinutes?: number
}

export function SessionProvider({
  children,
  timeoutMinutes = 15,
  warningMinutes = 1,
}: SessionProviderProps) {
  const { toast } = useToast()
  const [showWarning, setShowWarning] = useState(false)

  const handleWarning = useCallback((remainingTime: number) => {
    const remainingMinutes = Math.ceil(remainingTime / 1000 / 60)
    setShowWarning(true)
    
    toast({
      title: 'تحذير: انتهاء الجلسة',
      description: `ستنتهي جلستك خلال ${remainingMinutes} دقيقة. قم بأي نشاط للبقاء متصلاً.`,
      variant: 'destructive',
      duration: 10000,
    })
  }, [toast])

  const handleBeforeLogout = useCallback(() => {
    toast({
      title: 'انتهت الجلسة',
      description: 'تم تسجيل خروجك تلقائياً بسبب عدم النشاط.',
      variant: 'destructive',
    })
  }, [toast])

  const { extendSession, logout, getRemainingTime } = useSessionTimeout({
    timeout: timeoutMinutes * 60 * 1000,
    warningTime: warningMinutes * 60 * 1000,
    onWarning: handleWarning,
    onBeforeLogout: handleBeforeLogout,
  })

  // Hide warning when session is extended
  const handleExtendSession = useCallback(() => {
    setShowWarning(false)
    extendSession()
  }, [extendSession])

  return (
    <SessionContext.Provider
      value={{
        extendSession: handleExtendSession,
        logout,
        getRemainingTime,
        showWarning,
        setShowWarning,
      }}
    >
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const context = useContext(SessionContext)
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  return context
}
