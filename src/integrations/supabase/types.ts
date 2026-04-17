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
      cover_letters: {
        Row: {
          cover_letter: string
          created_at: string
          id: string
          job_id: string
          tailored_summary: string | null
        }
        Insert: {
          cover_letter: string
          created_at?: string
          id?: string
          job_id: string
          tailored_summary?: string | null
        }
        Update: {
          cover_letter?: string
          created_at?: string
          id?: string
          job_id?: string
          tailored_summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cover_letters_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      fetch_runs: {
        Row: {
          error: string | null
          finished_at: string | null
          id: string
          jobs_found: number | null
          jobs_new: number | null
          jobs_scored: number | null
          started_at: string
          status: string
        }
        Insert: {
          error?: string | null
          finished_at?: string | null
          id?: string
          jobs_found?: number | null
          jobs_new?: number | null
          jobs_scored?: number | null
          started_at?: string
          status?: string
        }
        Update: {
          error?: string | null
          finished_at?: string | null
          id?: string
          jobs_found?: number | null
          jobs_new?: number | null
          jobs_scored?: number | null
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          company: string
          company_logo: string | null
          created_at: string
          description: string | null
          fit_gaps: string[] | null
          fit_score: number | null
          fit_strengths: string[] | null
          fit_summary: string | null
          id: string
          job_type: string | null
          location: string | null
          posted_at: string | null
          salary: string | null
          source: string
          source_id: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          company: string
          company_logo?: string | null
          created_at?: string
          description?: string | null
          fit_gaps?: string[] | null
          fit_score?: number | null
          fit_strengths?: string[] | null
          fit_summary?: string | null
          id?: string
          job_type?: string | null
          location?: string | null
          posted_at?: string | null
          salary?: string | null
          source: string
          source_id: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          company?: string
          company_logo?: string | null
          created_at?: string
          description?: string | null
          fit_gaps?: string[] | null
          fit_score?: number | null
          fit_strengths?: string[] | null
          fit_summary?: string | null
          id?: string
          job_type?: string | null
          location?: string | null
          posted_at?: string | null
          salary?: string | null
          source?: string
          source_id?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      profile: {
        Row: {
          created_at: string
          cv_text: string | null
          email: string | null
          exclude_keywords: string[] | null
          full_name: string | null
          github_url: string | null
          id: string
          linkedin_url: string | null
          min_fit_score: number | null
          portfolio_url: string | null
          target_keywords: string[] | null
          target_role: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          cv_text?: string | null
          email?: string | null
          exclude_keywords?: string[] | null
          full_name?: string | null
          github_url?: string | null
          id?: string
          linkedin_url?: string | null
          min_fit_score?: number | null
          portfolio_url?: string | null
          target_keywords?: string[] | null
          target_role?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          cv_text?: string | null
          email?: string | null
          exclude_keywords?: string[] | null
          full_name?: string | null
          github_url?: string | null
          id?: string
          linkedin_url?: string | null
          min_fit_score?: number | null
          portfolio_url?: string | null
          target_keywords?: string[] | null
          target_role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
