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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          created_at: string
          id: string
          pin_hash: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          pin_hash: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          pin_hash?: string
          updated_at?: string
        }
        Relationships: []
      }
      bank_ledger: {
        Row: {
          balance_after: number
          bank_id: string
          created_at: string
          credit: number
          date: string
          debit: number
          description: string
          id: string
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          balance_after?: number
          bank_id: string
          created_at?: string
          credit?: number
          date?: string
          debit?: number
          description: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          balance_after?: number
          bank_id?: string
          created_at?: string
          credit?: number
          date?: string
          debit?: number
          description?: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_ledger_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "banks"
            referencedColumns: ["id"]
          },
        ]
      }
      banks: {
        Row: {
          account_number: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          account_number: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          account_number?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      credit_cards: {
        Row: {
          created_at: string
          credit_limit: number
          due_date: number
          id: string
          name: string
          outstanding: number
        }
        Insert: {
          created_at?: string
          credit_limit: number
          due_date?: number
          id?: string
          name: string
          outstanding?: number
        }
        Update: {
          created_at?: string
          credit_limit?: number
          due_date?: number
          id?: string
          name?: string
          outstanding?: number
        }
        Relationships: []
      }
      ipo_applications: {
        Row: {
          allotment_date: string | null
          amount: number
          application_date: string
          bank_id: string
          company_name: string
          created_at: string
          id: string
          shares_allotted: number | null
          shares_applied: number
          status: Database["public"]["Enums"]["ipo_status"]
        }
        Insert: {
          allotment_date?: string | null
          amount: number
          application_date?: string
          bank_id: string
          company_name: string
          created_at?: string
          id?: string
          shares_allotted?: number | null
          shares_applied: number
          status?: Database["public"]["Enums"]["ipo_status"]
        }
        Update: {
          allotment_date?: string | null
          amount?: number
          application_date?: string
          bank_id?: string
          company_name?: string
          created_at?: string
          id?: string
          shares_allotted?: number | null
          shares_applied?: number
          status?: Database["public"]["Enums"]["ipo_status"]
        }
        Relationships: [
          {
            foreignKeyName: "ipo_applications_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "banks"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          borrower_name: string
          created_at: string
          id: string
          is_paid: boolean
          outstanding_amount: number
          principal_amount: number
          source_bank_id: string | null
          source_credit_card_id: string | null
          source_id: string | null
          source_type: string
        }
        Insert: {
          borrower_name: string
          created_at?: string
          id?: string
          is_paid?: boolean
          outstanding_amount: number
          principal_amount: number
          source_bank_id?: string | null
          source_credit_card_id?: string | null
          source_id?: string | null
          source_type?: string
        }
        Update: {
          borrower_name?: string
          created_at?: string
          id?: string
          is_paid?: boolean
          outstanding_amount?: number
          principal_amount?: number
          source_bank_id?: string | null
          source_credit_card_id?: string | null
          source_id?: string | null
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "loans_source_bank_id_fkey"
            columns: ["source_bank_id"]
            isOneToOne: false
            referencedRelation: "banks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loans_source_credit_card_id_fkey"
            columns: ["source_credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          email: string
          id: string
          is_recurring: boolean
          is_sent: boolean
          message: string
          recurrence_day: number | null
          scheduled_date: string
          title: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_recurring?: boolean
          is_sent?: boolean
          message: string
          recurrence_day?: number | null
          scheduled_date: string
          title: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_recurring?: boolean
          is_sent?: boolean
          message?: string
          recurrence_day?: number | null
          scheduled_date?: string
          title?: string
        }
        Relationships: []
      }
      persons: {
        Row: {
          created_at: string
          id: string
          is_self: boolean
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_self?: boolean
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_self?: boolean
          name?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          bank_id: string
          created_at: string
          created_loan_id: string | null
          date: string
          description: string
          expense_owner: string
          id: string
        }
        Insert: {
          amount: number
          bank_id: string
          created_at?: string
          created_loan_id?: string | null
          date?: string
          description: string
          expense_owner?: string
          id?: string
        }
        Update: {
          amount?: number
          bank_id?: string
          created_at?: string
          created_loan_id?: string | null
          date?: string
          description?: string
          expense_owner?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "banks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_ledger_entry: {
        Args: {
          p_bank_id: string
          p_credit?: number
          p_date: string
          p_debit?: number
          p_description: string
          p_reference_id?: string
          p_reference_type?: string
        }
        Returns: string
      }
      get_bank_balance: { Args: { p_bank_id: string }; Returns: number }
    }
    Enums: {
      ipo_status: "APPLIED" | "ALLOTTED" | "REFUNDED"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      ipo_status: ["APPLIED", "ALLOTTED", "REFUNDED"],
    },
  },
} as const
