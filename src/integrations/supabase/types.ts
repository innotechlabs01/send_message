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
          password_hash: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          email: string;
          id?: string;
          name?: string | null;
          password_hash: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          email?: string;
          id?: string;
          name?: string | null;
          password_hash?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          amount: number;
          bold_response: Json | null;
          created_at: string;
          currency: string;
          gateway_raw: Json | null;
          gateway_reason: string | null;
          id: string;
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
          created_at?: string;
          currency?: string;
          gateway_raw?: Json | null;
          gateway_reason?: string | null;
          id?: string;
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
          created_at?: string;
          currency?: string;
          gateway_raw?: Json | null;
          gateway_reason?: string | null;
          id?: string;
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
          created_at: string;
          id: string;
          sender_name: string | null;
          sent: boolean;
          sent_at: string | null;
          text: string | null;
          to_number: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          sender_name?: string | null;
          sent?: boolean;
          sent_at?: string | null;
          text?: string | null;
          to_number: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          sender_name?: string | null;
          sent?: boolean;
          sent_at?: string | null;
          text?: string | null;
          to_number?: string;
        };
        Relationships: [];
      };
      whatsapp_logs: {
        Row: {
          created_at: string | null;
          id: string;
          provider: string | null;
          recipient: string;
          status: string | null;
          template_name: string | null;
          wa_message_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          provider?: string | null;
          recipient: string;
          status?: string | null;
          template_name?: string | null;
          wa_message_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          provider?: string | null;
          recipient?: string;
          status?: string | null;
          template_name?: string | null;
          wa_message_id?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
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
