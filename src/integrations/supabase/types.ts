export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      announcement_targets: {
        Row: {
          announcement_id: string
          created_at: string
          id: string
          store_id: string
        }
        Insert: {
          announcement_id: string
          created_at?: string
          id?: string
          store_id: string
        }
        Update: {
          announcement_id?: string
          created_at?: string
          id?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_targets_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_targets_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          audience: string
          created_at: string
          id: string
          is_active: boolean
          message: string
          updated_at: string
        }
        Insert: {
          audience?: string
          created_at?: string
          id?: string
          is_active?: boolean
          message: string
          updated_at?: string
        }
        Update: {
          audience?: string
          created_at?: string
          id?: string
          is_active?: boolean
          message?: string
          updated_at?: string
        }
        Relationships: []
      }
      branch_secrets: {
        Row: {
          branch_id: string
          failed_attempts: number
          locked_until: string | null
          pin_hash: string
        }
        Insert: {
          branch_id: string
          failed_attempts?: number
          locked_until?: string | null
          pin_hash: string
        }
        Update: {
          branch_id?: string
          failed_attempts?: number
          locked_until?: string | null
          pin_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_secrets_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: true
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          auth_user_id: string
          branch_store_id: string
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          parent_store_id: string
          updated_at: string
        }
        Insert: {
          auth_user_id: string
          branch_store_id: string
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          parent_store_id: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
          branch_store_id?: string
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          parent_store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_branch_store_id_fkey"
            columns: ["branch_store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branches_parent_store_id_fkey"
            columns: ["parent_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          balance: number
          created_at: string
          customer_type: string
          id: string
          name: string
          note: string | null
          phone: string | null
          store_id: string
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          customer_type?: string
          id?: string
          name: string
          note?: string | null
          phone?: string | null
          store_id: string
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          customer_type?: string
          id?: string
          name?: string
          note?: string | null
          phone?: string | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      debt_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string
          note: string | null
          party_id: string
          party_type: string
          store_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method?: string
          note?: string | null
          party_id: string
          party_type: string
          store_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string
          note?: string | null
          party_id?: string
          party_type?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "debt_payments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          id: string
          note: string | null
          paid_with: string
          spent_at: string
          store_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          id?: string
          note?: string | null
          paid_with?: string
          spent_at?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          id?: string
          note?: string | null
          paid_with?: string
          spent_at?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      held_orders: {
        Row: {
          cart_data: Json
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          store_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          cart_data?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          store_id: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          cart_data?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          store_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "held_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          item_id: string
          movement_type: string
          note: string | null
          quantity: number
          reference_id: string | null
          store_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          item_id: string
          movement_type: string
          note?: string | null
          quantity: number
          reference_id?: string | null
          store_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          item_id?: string
          movement_type?: string
          note?: string | null
          quantity?: number
          reference_id?: string | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      item_units: {
        Row: {
          conversion: number
          created_at: string
          id: string
          is_default: boolean
          item_id: string
          price: number
          unit_name: string
          updated_at: string
        }
        Insert: {
          conversion: number
          created_at?: string
          id?: string
          is_default?: boolean
          item_id: string
          price: number
          unit_name: string
          updated_at?: string
        }
        Update: {
          conversion?: number
          created_at?: string
          id?: string
          is_default?: boolean
          item_id?: string
          price?: number
          unit_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_units_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          barcode: string | null
          category: string
          cost_price: number
          created_at: string
          id: string
          image_url: string | null
          min_stock_threshold: number
          name: string
          price: number
          qr_value: string | null
          sku: string
          stock_quantity: number
          store_id: string
        }
        Insert: {
          barcode?: string | null
          category?: string
          cost_price?: number
          created_at?: string
          id?: string
          image_url?: string | null
          min_stock_threshold?: number
          name: string
          price: number
          qr_value?: string | null
          sku: string
          stock_quantity?: number
          store_id: string
        }
        Update: {
          barcode?: string | null
          category?: string
          cost_price?: number
          created_at?: string
          id?: string
          image_url?: string | null
          min_stock_threshold?: number
          name?: string
          price?: number
          qr_value?: string | null
          sku?: string
          stock_quantity?: number
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          account: string
          amount: number
          created_at: string
          direction: string
          entry_date: string
          id: string
          memo: string | null
          reference_id: string | null
          reference_type: string | null
          store_id: string
        }
        Insert: {
          account: string
          amount: number
          created_at?: string
          direction: string
          entry_date?: string
          id?: string
          memo?: string | null
          reference_id?: string | null
          reference_type?: string | null
          store_id: string
        }
        Update: {
          account?: string
          amount?: number
          created_at?: string
          direction?: string
          entry_date?: string
          id?: string
          memo?: string | null
          reference_id?: string | null
          reference_type?: string | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string
          email: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      purchase_items: {
        Row: {
          created_at: string
          id: string
          item_id: string
          purchase_id: string
          quantity: number
          unit_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          purchase_id: string
          quantity: number
          unit_cost: number
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          purchase_id?: string
          quantity?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          amount_paid: number
          created_at: string
          id: string
          notes: string | null
          received_at: string | null
          status: string
          store_id: string
          supplier_id: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          created_at?: string
          id?: string
          notes?: string | null
          received_at?: string | null
          status?: string
          store_id: string
          supplier_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          id?: string
          notes?: string | null
          received_at?: string | null
          status?: string
          store_id?: string
          supplier_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          conversion: number | null
          id: string
          item_id: string
          quantity: number
          sale_id: string
          unit_name: string | null
          unit_price: number
        }
        Insert: {
          conversion?: number | null
          id?: string
          item_id: string
          quantity: number
          sale_id: string
          unit_name?: string | null
          unit_price: number
        }
        Update: {
          conversion?: number | null
          id?: string
          item_id?: string
          quantity?: number
          sale_id?: string
          unit_name?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          created_at: string
          customer_id: string | null
          id: string
          is_offline_sync: boolean
          notes: string | null
          payment_breakdown: Json
          payment_method: string
          payment_status: string
          refund_note: string | null
          refund_reason: string | null
          refunded_at: string | null
          status: string
          store_id: string
          table_number: number | null
          total_amount: number
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          id?: string
          is_offline_sync?: boolean
          notes?: string | null
          payment_breakdown?: Json
          payment_method?: string
          payment_status?: string
          refund_note?: string | null
          refund_reason?: string | null
          refunded_at?: string | null
          status?: string
          store_id: string
          table_number?: number | null
          total_amount: number
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          id?: string
          is_offline_sync?: boolean
          notes?: string | null
          payment_breakdown?: Json
          payment_method?: string
          payment_status?: string
          refund_note?: string | null
          refund_reason?: string | null
          refunded_at?: string | null
          status?: string
          store_id?: string
          table_number?: number | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          note: string | null
          phone: string | null
          store_id: string
          telegram: string | null
          updated_at: string
          viber: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          note?: string | null
          phone?: string | null
          store_id: string
          telegram?: string | null
          updated_at?: string
          viber?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          note?: string | null
          phone?: string | null
          store_id?: string
          telegram?: string | null
          updated_at?: string
          viber?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_contacts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_members: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          is_active: boolean
          pin_code: string | null
          role: Database["public"]["Enums"]["app_role"]
          store_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          pin_code?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          store_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          pin_code?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          store_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_members_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string | null
          advanced_accounting_mode: boolean
          business_type: string
          cashier_name: string | null
          created_at: string
          currency_symbol: string
          id: string
          is_pro: boolean
          logo_url: string | null
          name: string
          owner_id: string
          parent_store_id: string | null
          phone_numbers: string[]
          receipt_footer: string | null
          receipt_header: string | null
          tax_rate: number
          telegram_chat_id: string | null
          telegram_notify_enabled: boolean | null
          telegram_username: string | null
        }
        Insert: {
          address?: string | null
          advanced_accounting_mode?: boolean
          business_type?: string
          cashier_name?: string | null
          created_at?: string
          currency_symbol?: string
          id?: string
          is_pro?: boolean
          logo_url?: string | null
          name: string
          owner_id: string
          parent_store_id?: string | null
          phone_numbers?: string[]
          receipt_footer?: string | null
          receipt_header?: string | null
          tax_rate?: number
          telegram_chat_id?: string | null
          telegram_notify_enabled?: boolean | null
          telegram_username?: string | null
        }
        Update: {
          address?: string | null
          advanced_accounting_mode?: boolean
          business_type?: string
          cashier_name?: string | null
          created_at?: string
          currency_symbol?: string
          id?: string
          is_pro?: boolean
          logo_url?: string | null
          name?: string
          owner_id?: string
          parent_store_id?: string | null
          phone_numbers?: string[]
          receipt_footer?: string | null
          receipt_header?: string | null
          tax_rate?: number
          telegram_chat_id?: string | null
          telegram_notify_enabled?: boolean | null
          telegram_username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stores_parent_store_id_fkey"
            columns: ["parent_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          balance: number
          created_at: string
          id: string
          name: string
          note: string | null
          phone: string | null
          store_id: string
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          name: string
          note?: string | null
          phone?: string | null
          store_id: string
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          name?: string
          note?: string | null
          phone?: string | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_store_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _store_id: string
        }
        Returns: boolean
      }
      is_platform_admin: { Args: never; Returns: boolean }
      is_store_member: { Args: { _store_id: string }; Returns: boolean }
      owns_store: { Args: { _store_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "OWNER" | "CASHIER" | "MANAGER"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["OWNER", "CASHIER", "MANAGER"],
    },
  },
} as const
