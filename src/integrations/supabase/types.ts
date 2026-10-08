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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      answers: {
        Row: {
          answered_by: string
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          content: string
          created_at: string
          doubt_id: string
          id: string
          is_teacher_answer: boolean
        }
        Insert: {
          answered_by: string
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          content: string
          created_at?: string
          doubt_id: string
          id?: string
          is_teacher_answer?: boolean
        }
        Update: {
          answered_by?: string
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string
          created_at?: string
          doubt_id?: string
          id?: string
          is_teacher_answer?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "answers_doubt_id_fkey"
            columns: ["doubt_id"]
            isOneToOne: false
            referencedRelation: "doubts"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          created_at: string
          doubt_id: string
          id: string
          message: string | null
          sender_id: string
          sender_role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          created_at?: string
          doubt_id: string
          id?: string
          message?: string | null
          sender_id: string
          sender_role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          created_at?: string
          doubt_id?: string
          id?: string
          message?: string | null
          sender_id?: string
          sender_role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_doubt_id_fkey"
            columns: ["doubt_id"]
            isOneToOne: false
            referencedRelation: "doubts"
            referencedColumns: ["id"]
          },
        ]
      }
      doubt_votes: {
        Row: {
          created_at: string
          doubt_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          doubt_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          doubt_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doubt_votes_doubt_id_fkey"
            columns: ["doubt_id"]
            isOneToOne: false
            referencedRelation: "doubts"
            referencedColumns: ["id"]
          },
        ]
      }
      doubts: {
        Row: {
          anonymous_id: string
          created_at: string
          created_by: string
          description: string
          id: string
          is_reported: boolean
          status: string
          subject_id: string
          topic: string
          updated_at: string
          vote_count: number
        }
        Insert: {
          anonymous_id: string
          created_at?: string
          created_by: string
          description: string
          id?: string
          is_reported?: boolean
          status?: string
          subject_id: string
          topic: string
          updated_at?: string
          vote_count?: number
        }
        Update: {
          anonymous_id?: string
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          is_reported?: boolean
          status?: string
          subject_id?: string
          topic?: string
          updated_at?: string
          vote_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "doubts_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["app_role"]
          subject_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          subject_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          subject_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          branch: string | null
          created_at: string
          email: string | null
          id: string
          is_blocked: boolean
          is_profile_complete: boolean
          name: string
          role: Database["public"]["Enums"]["app_role"] | null
          section: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          branch?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_blocked?: boolean
          is_profile_complete?: boolean
          name?: string
          role?: Database["public"]["Enums"]["app_role"] | null
          section?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          branch?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_blocked?: boolean
          is_profile_complete?: boolean
          name?: string
          role?: Database["public"]["Enums"]["app_role"] | null
          section?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          doubt_id: string
          id: string
          reason: string
          reported_by: string
          status: string
        }
        Insert: {
          created_at?: string
          doubt_id: string
          id?: string
          reason?: string
          reported_by: string
          status?: string
        }
        Update: {
          created_at?: string
          doubt_id?: string
          id?: string
          reason?: string
          reported_by?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_doubt_id_fkey"
            columns: ["doubt_id"]
            isOneToOne: false
            referencedRelation: "doubts"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          branch: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          join_code: string
          name: string
          section: string
          teacher_id: string | null
        }
        Insert: {
          branch: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          join_code: string
          name: string
          section: string
          teacher_id?: string | null
        }
        Update: {
          branch?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          join_code?: string
          name?: string
          section?: string
          teacher_id?: string | null
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
      generate_join_code: { Args: never; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_enrolled: {
        Args: { _subject_id: string; _user_id: string }
        Returns: boolean
      }
      join_subject_by_code: {
        Args: { _code: string }
        Returns: {
          branch: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          join_code: string
          name: string
          section: string
          teacher_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "subjects"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "student" | "teacher" | "admin"
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
      app_role: ["student", "teacher", "admin"],
    },
  },
} as const
