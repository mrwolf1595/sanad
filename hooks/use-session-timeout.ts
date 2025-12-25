'use client'

import { useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface UseSessionTimeoutOptions {
  /**
   * Session timeout in milliseconds (default: 15 minutes)
   */
  timeout?: number
  /**
   * Events that reset the activity timer
   */
  activityEvents?: string[]
  /**
   * Callback before logout (optional)
   */
  onBeforeLogout?: () => void
  /**
   * Warning time before logout in milliseconds (default: 1 minute before)
   */
  warningTime?: number
  /**
   * Callback when warning time is reached
   */
  onWarning?: (remainingTime: number) => void
}

const DEFAULT_TIMEOUT = 15 * 60 * 1000 // 15 minutes
const DEFAULT_WARNING_TIME = 1 * 60 * 1000 // 1 minute before logout
const DEFAULT_ACTIVITY_EVENTS = [
  'mousedown',
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
  'click',
  'wheel',
]

export function useSessionTimeout(options: UseSessionTimeoutOptions = {}) {
  const {
    timeout = DEFAULT_TIMEOUT,
    activityEvents = DEFAULT_ACTIVITY_EVENTS,
    onBeforeLogout,
    warningTime = DEFAULT_WARNING_TIME,
    onWarning,
  } = options

  const router = useRouter()
  const supabase = createClient()
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const warningRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(Date.now())
  const isWarningShownRef = useRef<boolean>(false)

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current)
      warningRef.current = null
    }
  }, [])

  const handleLogout = useCallback(async () => {
    clearTimers()
    onBeforeLogout?.()
    
    // Clear local storage session data
    localStorage.removeItem('session-last-activity')
    
    // Sign out from Supabase
    await supabase.auth.signOut()
    
    // Redirect to login with timeout message
    router.push('/login?reason=session_expired')
    router.refresh()
  }, [supabase, router, clearTimers, onBeforeLogout])

  const resetTimer = useCallback(() => {
    const now = Date.now()
    lastActivityRef.current = now
    localStorage.setItem('session-last-activity', now.toString())
    isWarningShownRef.current = false
    
    clearTimers()

    // Set warning timer
    if (onWarning && warningTime < timeout) {
      warningRef.current = setTimeout(() => {
        if (!isWarningShownRef.current) {
          isWarningShownRef.current = true
          onWarning(warningTime)
        }
      }, timeout - warningTime)
    }

    // Set logout timer
    timeoutRef.current = setTimeout(() => {
      handleLogout()
    }, timeout)
  }, [timeout, warningTime, onWarning, handleLogout, clearTimers])

  const handleActivity = useCallback(() => {
    resetTimer()
  }, [resetTimer])

  // Check for expired session on mount (in case user was away)
  const checkStoredSession = useCallback(async () => {
    // First check if user is actually logged in
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      // No user logged in, don't start timer
      return false
    }

    const storedLastActivity = localStorage.getItem('session-last-activity')
    if (storedLastActivity) {
      const lastActivity = parseInt(storedLastActivity, 10)
      const now = Date.now()
      const elapsed = now - lastActivity

      if (elapsed >= timeout) {
        // Session already expired while user was away
        handleLogout()
        return false
      }
    } else {
      // No stored activity, initialize it
      localStorage.setItem('session-last-activity', Date.now().toString())
    }
    return true
  }, [timeout, handleLogout, supabase])

  useEffect(() => {
    // Check if session is already expired
    checkStoredSession().then((isValid) => {
      if (!isValid) {
        return
      }

      // Initialize timer
      resetTimer()

      // Add activity listeners
      activityEvents.forEach((event) => {
        window.addEventListener(event, handleActivity, { passive: true })
      })

      // Check session on visibility change (when user comes back to tab)
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          checkStoredSession().then((isValid) => {
            if (!isValid) {
              return
            }
            resetTimer()
          })
        }
      }
      document.addEventListener('visibilitychange', handleVisibilityChange)

      // Cleanup
      return () => {
        clearTimers()
        activityEvents.forEach((event) => {
          window.removeEventListener(event, handleActivity)
        })
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    })
  }, [activityEvents, handleActivity, resetTimer, checkStoredSession, clearTimers])

  // Get remaining time
  const getRemainingTime = useCallback(() => {
    const elapsed = Date.now() - lastActivityRef.current
    return Math.max(0, timeout - elapsed)
  }, [timeout])

  // Manual extend session
  const extendSession = useCallback(() => {
    resetTimer()
  }, [resetTimer])

  return {
    getRemainingTime,
    extendSession,
    logout: handleLogout,
  }
}
