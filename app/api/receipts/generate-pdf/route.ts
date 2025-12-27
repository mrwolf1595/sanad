import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateReceiptPDF } from '@/lib/pdf/fillTemplate'

export const dynamic = 'force-dynamic'

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

    // Get organization
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

    // Check if organization has a valid logo
    if (!organization.logo_url || organization.logo_url === '' || organization.logo_url === 'PLACEHOLDER_LOGO_REQUIRED') {
      return NextResponse.json(
        { error: 'Organization logo is required. Please complete onboarding and upload a logo before generating receipts.' },
        { status: 400 }
      )
    }

    // DEBUG: Log receipt data
    console.log('='.repeat(60))
    console.log('📄 Generating PDF for receipt:', receipt.receipt_number)
    console.log('   Type:', receipt.receipt_type)
    console.log('   Payment method:', receipt.payment_method)
    console.log('   Amount:', receipt.amount)
    console.log('   Recipient:', receipt.recipient_name)
    if (receipt.payment_method === 'check') {
      console.log('   Bank:', receipt.bank_name)
      console.log('   Cheque #:', receipt.cheque_number)
    } else if (receipt.payment_method === 'bank_transfer') {
      console.log('   Bank:', receipt.bank_name)
      console.log('   Transfer #:', receipt.transfer_number)
    }
    console.log('='.repeat(60))

    // Determine App URL from request
    const host = request.headers.get('host')
    const protocol = host?.includes('localhost') ? 'http' : 'https'
    const appUrl = host ? `${protocol}://${host}` : undefined

    // Generate PDF
    const pdfBytes = await generateReceiptPDF({
      receipt,
      organization,
      createdBy: userData.full_name,
      appUrl,
    })

    console.log('✅ PDF generated successfully!')
    console.log('='.repeat(60))

    // Upload PDF to Supabase Storage
    const fileName = `${userData.organization_id}/${receipt.receipt_number}-${Date.now()}.pdf`
    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload PDF' },
        { status: 500 }
      )
    }

    // Update receipt with PDF path (not URL)
    const { error: updateError } = await supabase
      .from('receipts')
      .update({ pdf_url: fileName })
      .eq('id', receiptId)

    if (updateError) {
      console.error('Update error:', updateError)
    }

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${receipt.receipt_number}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error('PDF generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}
