'use client'

import { useEffect } from 'react'

/**
 * Global Error Suppressor for Auth Errors
 * Suppresses "Invalid Refresh Token" errors in console for unauthenticated users
 */
export function ErrorSuppressor() {
  useEffect(() => {
    // Suppress auth errors in console for better UX
    const originalConsoleError = console.error
    console.error = (...args: any[]) => {
      const errorMessage = args[0]?.toString() || ''
      
      // Suppress known auth errors for unauthenticated users
      const suppressedErrors = [
        'Invalid Refresh Token',
        'Refresh Token Not Found',
        'AuthApiError: Invalid Refresh Token',
        'AuthSessionMissingError',
      ]

      const shouldSuppress = suppressedErrors.some(err => 
        errorMessage.includes(err)
      )

      if (!shouldSuppress) {
        originalConsoleError(...args)
      }
    }

    return () => {
      console.error = originalConsoleError
    }
  }, [])

  return null
}
