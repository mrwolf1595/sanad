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
    <div className="flex gap-2">
      <Button 
        onClick={generateAndDownload} 
        variant="outline"
        disabled={isGenerating}
      >
        {isGenerating ? (
          <>
            <Loader2 className="ml-2 h-4 w-4 animate-spin" />
            جاري التوليد...
          </>
        ) : (
          <>
            <Download className="ml-2 h-4 w-4" />
            تحميل PDF
          </>
        )}
      </Button>
      
      <Button 
        onClick={openForPrinting} 
        variant="outline"
        disabled={isPrinting}
      >
        {isPrinting ? (
          <>
            <Loader2 className="ml-2 h-4 w-4 animate-spin" />
            جاري التحميل...
          </>
        ) : (
          <>
            <Printer className="ml-2 h-4 w-4" />
            طباعة
          </>
        )}
      </Button>
    </div>
  )
}
