import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Verify Receipt API
 * Public endpoint to verify receipt authenticity using barcode ID
 * GET /api/receipts/verify?barcode_id=RCP-2024-000001
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const barcodeId = searchParams.get('barcode_id')

    if (!barcodeId) {
      return NextResponse.json(
        { error: 'Barcode ID is required', valid: false },
        { status: 400 }
      )
    }

    // Create Admin Client to bypass RLS for public verification
    // This is secure because we only expose specific receipt details for verification
    const { createClient: createSupabaseClient } = require('@supabase/supabase-js')
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Query receipt by barcode_id OR receipt_number
    // We try looking up by EITHER field to be robust
    let query = supabaseAdmin
      .from('receipts')
      .select(`
        id,
        receipt_number,
        receipt_type,
        amount,
        recipient_name,
        date,
        created_at,
        barcode_id,
        organization_id,
        organizations (
          name_ar,
          name_en,
          commercial_registration,
          tax_number
        )
      `)

    // Check if input looks like a specific format, but ultimately search both
    if (barcodeId.startsWith('REC-')) {
      // Priority to receipt_number
      query = query.or(`receipt_number.eq.${barcodeId},barcode_id.eq.${barcodeId}`)
    } else {
      // Priority matching
      query = query.or(`barcode_id.eq.${barcodeId},receipt_number.eq.${barcodeId}`)
    }

    const { data: receipt, error } = await query.maybeSingle()

    if (error || !receipt) {
      console.log('Verification failed for:', barcodeId)
      return NextResponse.json(
        {
          valid: false,
          message: 'الإيصال غير موجود أو الباركود غير صحيح',
          message_en: 'Receipt not found or invalid barcode'
        },
        { status: 404 }
      )
    }

    // Return receipt information
    return NextResponse.json({
      valid: true,
      message: 'تم التحقق من الإيصال بنجاح',
      message_en: 'Receipt verified successfully',
      receipt: {
        id: receipt.id,
        receipt_number: receipt.receipt_number,
        receipt_type: receipt.receipt_type,
        receipt_type_ar: receipt.receipt_type === 'receipt' ? 'سند قبض' : 'سند صرف',
        amount: receipt.amount,
        recipient_name: receipt.recipient_name,
        date: receipt.date,
        created_at: receipt.created_at,
        barcode_id: receipt.barcode_id,
        organization: {
          name_ar: receipt.organizations?.name_ar,
          name_en: receipt.organizations?.name_en,
          commercial_registration: receipt.organizations?.commercial_registration,
          tax_number: receipt.organizations?.tax_number,
        }
      }
    })

  } catch (error) {
    console.error('Error verifying receipt:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        valid: false
      },
      { status: 500 }
    )
  }
}
