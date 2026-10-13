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
      experiment_events: {
        Row: {
          created_at: string
          event_name: string
          id: number
          payload: Json | null
          session_id: string
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: never
          payload?: Json | null
          session_id: string
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: never
          payload?: Json | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "experiment_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "experiment_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      experiment_sessions: {
        Row: {
          activity_completed_at: string | null
          activity_status: string | null
          assigned_group: string
          classified_status: string
          comprehension_score: number | null
          comprehension_total: number
          continuation_choice: string | null
          created_at: string
          decision_reached_at: string | null
          id: string
          interaction_answers: Json | null
          interaction_completed_at: string | null
          is_demo: boolean
          lesson_completed_at: string | null
          meaningfulness: number | null
          next_module_started_at: string | null
          observation_text: string | null
          parent_help: number | null
          participant_code: string | null
          quiz_answers: Json | null
          quiz_completed_at: string | null
          session_token: string
          started_at: string
          updated_at: string
        }
        Insert: {
          activity_completed_at?: string | null
          activity_status?: string | null
          assigned_group: string
          classified_status?: string
          comprehension_score?: number | null
          comprehension_total?: number
          continuation_choice?: string | null
          created_at?: string
          decision_reached_at?: string | null
          id?: string
          interaction_answers?: Json | null
          interaction_completed_at?: string | null
          is_demo?: boolean
          lesson_completed_at?: string | null
          meaningfulness?: number | null
          next_module_started_at?: string | null
          observation_text?: string | null
          parent_help?: number | null
          participant_code?: string | null
          quiz_answers?: Json | null
          quiz_completed_at?: string | null
          session_token?: string
          started_at?: string
          updated_at?: string
        }
        Update: {
          activity_completed_at?: string | null
          activity_status?: string | null
          assigned_group?: string
          classified_status?: string
          comprehension_score?: number | null
          comprehension_total?: number
          continuation_choice?: string | null
          created_at?: string
          decision_reached_at?: string | null
          id?: string
          interaction_answers?: Json | null
          interaction_completed_at?: string | null
          is_demo?: boolean
          lesson_completed_at?: string | null
          meaningfulness?: number | null
          next_module_started_at?: string | null
          observation_text?: string | null
          parent_help?: number | null
          participant_code?: string | null
          quiz_answers?: Json | null
          quiz_completed_at?: string | null
          session_token?: string
          started_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      oceanx_create_session: {
        Args: { _id: string; _token: string; _code: string; _demo?: boolean }
        Returns: Json
      }
      oceanx_save_step: {
        Args: { _id: string; _token: string; _step: string; _payload?: Json }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin"
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
      app_role: ["admin"],
    },
  },
} as const
