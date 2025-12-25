export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name_ar: string
          name_en: string
          entity_type: 'company' | 'establishment' | 'office' | 'other'
          commercial_registration: string | null
          tax_number: string | null
          address: string
          phone: string
          email: string
          logo_url: string | null
          description: string | null
          stamp_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name_ar: string
          name_en: string
          entity_type: 'company' | 'establishment' | 'office' | 'other'
          commercial_registration?: string | null
          tax_number?: string | null
          address: string
          phone: string
          email: string
          logo_url?: string | null
          description?: string | null
          stamp_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name_ar?: string
          name_en?: string
          entity_type?: 'company' | 'establishment' | 'office' | 'other'
          commercial_registration?: string | null
          tax_number?: string | null
          address?: string
          phone?: string
          email?: string
          logo_url?: string | null
          description?: string | null
          stamp_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          id: string
          organization_id: string
          full_name: string
          role: 'admin' | 'user' | 'accountant'
          created_at: string
        }
        Insert: {
          id: string
          organization_id: string
          full_name: string
          role: 'admin' | 'user' | 'accountant'
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          full_name?: string
          role?: 'admin' | 'user' | 'accountant'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      receipts: {
        Row: {
          id: string
          organization_id: string
          receipt_number: string
          receipt_type: 'receipt' | 'payment'
          amount: number
          recipient_name: string
          description: string | null
          payment_method: 'cash' | 'check' | 'bank_transfer' | null
          date: string
          created_by: string
          national_id_from: string | null
          national_id_to: string | null
          bank_name: string | null
          cheque_number: string | null
          transfer_number: string | null
          vat_amount: number | null
          total_amount: number | null
          barcode_id: string | null

          created_at: string
          pdf_url: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          receipt_number: string
          receipt_type: 'receipt' | 'payment'
          amount: number
          recipient_name: string
          description?: string | null
          payment_method?: 'cash' | 'check' | 'bank_transfer' | null
          date: string
          created_by: string
          created_at?: string
          pdf_url?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          receipt_number?: string
          receipt_type?: 'receipt' | 'payment'
          amount?: number
          recipient_name?: string
          description?: string | null
          payment_method?: 'cash' | 'check' | 'bank_transfer' | null
          date?: string
          created_by?: string
          created_at?: string
          pdf_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_receipt_number: {
        Args: {
          org_id: string
          receipt_type: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
