import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateReceiptPDF } from '@/lib/pdf/fillTemplate'

export async function POST(request: NextRequest) {
  try {
    const { receiptId } = await request.json()

    if (!receiptId) {
      return NextResponse.json(
        { error: 'Receipt ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's organization
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, full_name')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get receipt
    const { data: receipt } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', receiptId)
      .eq('organization_id', userData.organization_id)
      .single()

    if (!receipt) {
      return NextResponse.json(
        { error: 'Receipt not found' },
        { status: 404 }
      )
    }

    // Check if PDF already exists in storage
    if (receipt.pdf_url) {
      let storagePath = receipt.pdf_url

      // Handle legacy full URLs by extracting the path
      if (receipt.pdf_url.startsWith('http')) {
        const parts = receipt.pdf_url.split('/receipts/')
        if (parts.length > 1) {
          storagePath = parts[1]
        }
      }

      // Try to download existing PDF
      const { data: existingPdf, error: downloadError } = await supabase.storage
        .from('receipts')
        .download(storagePath)

      if (!downloadError && existingPdf) {
        // PDF exists, return it
        const buffer = await existingPdf.arrayBuffer()
        return new NextResponse(Buffer.from(buffer), {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${receipt.receipt_number}.pdf"`,
          },
        })
      }
    }

    // PDF doesn't exist, generate it
    const { data: organization } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', userData.organization_id)
      .single()

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Determine App URL from request
    const host = request.headers.get('host')
    const protocol = host?.includes('localhost') ? 'http' : 'https'
    const appUrl = host ? `${protocol}://${host}` : undefined

    // Generate PDF
    const pdfBytes = await generateReceiptPDF({
      receipt,
      organization,
      createdBy: userData.full_name,
      appUrl
    })

    // Upload PDF to Supabase Storage
    const fileName = `${userData.organization_id}/${receipt.receipt_number}-${Date.now()}.pdf`
    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: false, // Don't overwrite if exists
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      // Continue anyway and return the generated PDF
    } else {
      // Update receipt with PDF path
      await supabase
        .from('receipts')
        .update({ pdf_url: fileName })
        .eq('id', receiptId)
    }

    // Return the PDF for viewing
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${receipt.receipt_number}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error('PDF retrieval error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get PDF' },
      { status: 500 }
    )
  }
}
