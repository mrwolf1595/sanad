import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
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

    // Get first receipt
    const { data: receipt } = await supabase
      .from('receipts')
      .select('*')
      .eq('organization_id', userData.organization_id)
      .limit(1)
      .single()

    // Get organization
    const { data: organization } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', userData.organization_id)
      .single()

    // Return raw data to inspect
    return NextResponse.json({
      receipt_data: receipt,
      organization_data: organization,
      user_data: userData,
      analysis: {
        receipt_name: {
          value: receipt?.recipient_name,
          length: receipt?.recipient_name?.length,
          chars: receipt?.recipient_name?.split('').map((c: string, i: number) => ({
            index: i,
            char: c,
            code: c.charCodeAt(0),
            hex: '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')
          }))
        },
        org_name: {
          value: organization?.name_ar,
          length: organization?.name_ar?.length,
          chars: organization?.name_ar?.split('').map((c: string, i: number) => ({
            index: i,
            char: c,
            code: c.charCodeAt(0),
            hex: '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')
          }))
        },
        description: {
          value: receipt?.description,
          length: receipt?.description?.length
        }
      }
    })
  } catch (error: any) {
    console.error('Test data error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch test data' },
      { status: 500 }
    )
  }
}
