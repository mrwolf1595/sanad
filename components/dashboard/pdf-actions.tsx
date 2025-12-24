'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Printer, Loader2 } from 'lucide-react'

interface PDFActionsProps {
  receiptId: string
  receiptNumber: string
}

export function PDFActions({ receiptId, receiptNumber }: PDFActionsProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)

  const generateAndDownload = async () => {
    setIsGenerating(true)
    try {
      // Use get-pdf API which checks for existing PDF first
      const response = await fetch('/api/receipts/get-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ receiptId }),
      })

      if (!response.ok) {
        throw new Error('فشل جلب PDF')
      }

      // Download the PDF
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${receiptNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error downloading PDF:', error)
      alert('حدث خطأ أثناء تحميل PDF')
    } finally {
      setIsGenerating(false)
    }
  }

  const openForPrinting = async () => {
    setIsPrinting(true)
    try {
      const response = await fetch('/api/receipts/get-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ receiptId }),
      })

      if (!response.ok) {
        throw new Error('فشل جلب PDF')
      }

      // Open PDF in new tab for printing
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch (error) {
      console.error('Error getting PDF:', error)
      alert('حدث خطأ أثناء جلب PDF')
    } finally {
      setIsPrinting(false)
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button 
        onClick={generateAndDownload} 
        variant="outline"
        disabled={isGenerating}
        size="sm"
        className="h-9 md:h-10 text-xs md:text-sm"
      >
        {isGenerating ? (
          <>
            <Loader2 className="ml-1 md:ml-2 h-3 w-3 md:h-4 md:w-4 animate-spin" />
            <span className="hidden sm:inline">جاري التوليد...</span>
            <span className="sm:hidden">جاري...</span>
          </>
        ) : (
          <>
            <Download className="ml-1 md:ml-2 h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">تحميل PDF</span>
            <span className="sm:hidden">تحميل</span>
          </>
        )}
      </Button>
      
      <Button 
        onClick={openForPrinting} 
        variant="outline"
        disabled={isPrinting}
        size="sm"
        className="h-9 md:h-10 text-xs md:text-sm"
      >
        {isPrinting ? (
          <>
            <Loader2 className="ml-1 md:ml-2 h-3 w-3 md:h-4 md:w-4 animate-spin" />
            <span className="hidden sm:inline">جاري التحميل...</span>
            <span className="sm:hidden">جاري...</span>
          </>
        ) : (
          <>
            <Printer className="ml-1 md:ml-2 h-3 w-3 md:h-4 md:w-4" />
            طباعة
          </>
        )}
      </Button>
    </div>
  )
}
