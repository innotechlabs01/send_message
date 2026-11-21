export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string | null;
          email: string;
          id: string;
          name: string | null;
          password_changed_at: string | null;
          password_hash: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          email: string;
          id?: string;
          name?: string | null;
          password_changed_at?: string | null;
          password_hash: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          email?: string;
          id?: string;
          name?: string | null;
          password_changed_at?: string | null;
          password_hash?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          amount: number;
          bold_response: Json | null;
          bold_status: string | null;
          created_at: string;
          currency: string;
          expected_amount_cop: number;
          gateway_raw: Json | null;
          gateway_reason: string | null;
          id: string;
          idempotency_key: string | null;
          items_json: Json;
          message_id: string | null;
          payment_method: string | null;
          reference_id: string;
          state: string | null;
          status: string;
          transaction_id: string | null;
          updated_at: string;
        };
        Insert: {
          amount: number;
          bold_response?: Json | null;
          bold_status?: string | null;
          created_at?: string;
          currency?: string;
          expected_amount_cop?: number;
          gateway_raw?: Json | null;
          gateway_reason?: string | null;
          id?: string;
          idempotency_key?: string | null;
          items_json?: Json;
          message_id?: string | null;
          payment_method?: string | null;
          reference_id: string;
          state?: string | null;
          status?: string;
          transaction_id?: string | null;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          bold_response?: Json | null;
          bold_status?: string | null;
          created_at?: string;
          currency?: string;
          expected_amount_cop?: number;
          gateway_raw?: Json | null;
          gateway_reason?: string | null;
          id?: string;
          idempotency_key?: string | null;
          items_json?: Json;
          message_id?: string | null;
          payment_method?: string | null;
          reference_id?: string;
          state?: string | null;
          status?: string;
          transaction_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      payment_events: {
        Row: {
          amount_cop: number | null;
          created_at: string;
          currency: string;
          event_type: string;
          id: string;
          metadata: Json;
          payment_method: string | null;
          reference_id: string;
        };
        Insert: {
          amount_cop?: number | null;
          created_at?: string;
          currency?: string;
          event_type: string;
          id?: string;
          metadata?: Json;
          payment_method?: string | null;
          reference_id: string;
        };
        Update: {
          amount_cop?: number | null;
          created_at?: string;
          currency?: string;
          event_type?: string;
          id?: string;
          metadata?: Json;
          payment_method?: string | null;
          reference_id?: string;
        };
        Relationships: [];
      };
      predefined_messages: {
        Row: {
          category_id: string;
          created_at: string | null;
          id: string;
          message_text: string;
          sort_order: number;
        };
        Insert: {
          category_id: string;
          created_at?: string | null;
          id?: string;
          message_text: string;
          sort_order: number;
        };
        Update: {
          category_id?: string;
          created_at?: string | null;
          id?: string;
          message_text?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      scheduled_messages: {
        Row: {
          attempts: number;
          created_at: string;
          id: string;
          idempotency_key: string | null;
          last_error: string | null;
          locked_at: string | null;
          max_attempts: number;
          next_retry_at: string | null;
          payment_reference_id: string | null;
          scheduled_for: string;
          sender_name: string | null;
          sender_phone: string | null;
          sent: boolean;
          sent_at: string | null;
          status: string;
          text: string | null;
          to_number: string;
        };
        Insert: {
          attempts?: number;
          created_at?: string;
          id?: string;
          idempotency_key?: string | null;
          last_error?: string | null;
          locked_at?: string | null;
          max_attempts?: number;
          next_retry_at?: string | null;
          payment_reference_id?: string | null;
          scheduled_for?: string;
          sender_name?: string | null;
          sender_phone?: string | null;
          sent?: boolean;
          sent_at?: string | null;
          status?: string;
          text?: string | null;
          to_number: string;
        };
        Update: {
          attempts?: number;
          created_at?: string;
          id?: string;
          idempotency_key?: string | null;
          last_error?: string | null;
          locked_at?: string | null;
          max_attempts?: number;
          next_retry_at?: string | null;
          payment_reference_id?: string | null;
          scheduled_for?: string;
          sender_name?: string | null;
          sender_phone?: string | null;
          sent?: boolean;
          sent_at?: string | null;
          status?: string;
          text?: string | null;
          to_number?: string;
        };
        Relationships: [];
      };
      whatsapp_logs: {
        Row: {
          created_at: string | null;
          error_code: string | null;
          error_message: string | null;
          id: string;
          payment_reference_id: string | null;
          provider: string | null;
          provider_status: string | null;
          recipient: string;
          scheduled_message_id: string | null;
          status: string | null;
          template_name: string | null;
          updated_at: string | null;
          wa_message_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          error_code?: string | null;
          error_message?: string | null;
          id?: string;
          payment_reference_id?: string | null;
          provider?: string | null;
          provider_status?: string | null;
          recipient: string;
          scheduled_message_id?: string | null;
          status?: string | null;
          template_name?: string | null;
          updated_at?: string | null;
          wa_message_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          error_code?: string | null;
          error_message?: string | null;
          id?: string;
          payment_reference_id?: string | null;
          provider?: string | null;
          provider_status?: string | null;
          recipient?: string;
          scheduled_message_id?: string | null;
          status?: string | null;
          template_name?: string | null;
          updated_at?: string | null;
          wa_message_id?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      v_kpi_payment_funnel: {
        Row: {
          total_intents: number | null;
          pending_count: number | null;
          success_count: number | null;
          blocked_count: number | null;
          failed_count: number | null;
          conversion_rate_pct: number | null;
          gross_revenue_cop: number | null;
          avg_ticket_cop: number | null;
        };
        Relationships: [];
      };
      v_kpi_delivery_health: {
        Row: {
          total_scheduled: number | null;
          pending_messages: number | null;
          sent_messages: number | null;
          failed_messages: number | null;
          dead_letter_messages: number | null;
          delivery_rate_pct: number | null;
          failure_rate_pct: number | null;
          dead_letter_rate_pct: number | null;
          avg_send_latency_seconds: number | null;
          wa_logs_total: number | null;
          wa_delivered_count: number | null;
          wa_failed_count: number | null;
        };
        Relationships: [];
      };
      v_kpi_daily_revenue: {
        Row: {
          day: string | null;
          total_orders: number | null;
          paid_orders: number | null;
          failed_orders: number | null;
          revenue_cop: number | null;
          conversion_rate_pct: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      claim_due_scheduled_messages: {
        Args: {
          batch_size?: number;
        };
        Returns: Database["public"]["Tables"]["scheduled_messages"]["Row"][];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
