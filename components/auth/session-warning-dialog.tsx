'use client'

import { useEffect, useState } from 'react'
import { useSession } from './session-provider'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Clock } from 'lucide-react'

export function SessionWarningDialog() {
  const { showWarning, setShowWarning, extendSession, getRemainingTime } = useSession()
  const [remainingSeconds, setRemainingSeconds] = useState(60)

  useEffect(() => {
    if (!showWarning) return

    const interval = setInterval(() => {
      const remaining = Math.ceil(getRemainingTime() / 1000)
      setRemainingSeconds(remaining)
      
      if (remaining <= 0) {
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [showWarning, getRemainingTime])

  const handleStayLoggedIn = () => {
    extendSession()
    setShowWarning(false)
  }

  if (!showWarning) return null

  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = remainingSeconds % 60

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-gray-900">
              تحذير: انتهاء الجلسة
            </h2>
            <p className="text-gray-600">
              سيتم تسجيل خروجك تلقائياً بسبب عدم النشاط
            </p>
          </div>

          <div className="flex items-center gap-2 text-2xl font-mono font-bold text-red-600 bg-red-50 px-4 py-2 rounded-lg">
            <Clock className="w-5 h-5" />
            <span>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
            <Button
              onClick={handleStayLoggedIn}
              className="flex-1"
              size="lg"
            >
              البقاء متصلاً
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
