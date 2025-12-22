'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'

interface GeneratePDFButtonProps {
  receiptId: string
  receiptNumber: string
}

export function GeneratePDFButton({ receiptId, receiptNumber }: GeneratePDFButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/receipts/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ receiptId }),
      })

      if (!response.ok) {
        throw new Error('فشل توليد PDF')
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

      // Refresh the page to show the new PDF link
      window.location.reload()
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('حدث خطأ أثناء توليد PDF')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Button 
      onClick={handleGenerate} 
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
          توليد PDF
        </>
      )}
    </Button>
  )
}
