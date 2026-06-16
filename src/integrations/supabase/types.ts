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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      app_profiles: {
        Row: { id: string; email: string; full_name: string | null; role: Database["public"]["Enums"]["app_role"]; created_at: string; updated_at: string }
        Insert: { id: string; email: string; full_name?: string | null; role?: Database["public"]["Enums"]["app_role"]; created_at?: string; updated_at?: string }
        Update: { id?: string; email?: string; full_name?: string | null; role?: Database["public"]["Enums"]["app_role"]; created_at?: string; updated_at?: string }
      }
      recruitment_searches: {
        Row: { id: string; title: string; job_description: string | null; manager_profile: Json; parsed_requirements: Json; role_category: string | null; created_by: string | null; created_at: string; updated_at: string; archived_at: string | null }
        Insert: { id?: string; title: string; job_description?: string | null; manager_profile?: Json; parsed_requirements?: Json; role_category?: string | null; created_by?: string | null; created_at?: string; updated_at?: string; archived_at?: string | null }
        Update: { id?: string; title?: string; job_description?: string | null; manager_profile?: Json; parsed_requirements?: Json; role_category?: string | null; created_by?: string | null; created_at?: string; updated_at?: string; archived_at?: string | null }
      }
      candidates: {
        Row: { id: string; canonical_key: string; name: string; current_role: string | null; company: string | null; years_of_experience: number | null; skills: string[]; location: string | null; linkedin_url: string | null; email: string | null; phone: string | null; avatar_url: string | null; profile_image_url: string | null; data_confidence: Json; first_seen_at: string; last_seen_at: string; created_at: string; updated_at: string }
        Insert: { id?: string; canonical_key: string; name: string; current_role?: string | null; company?: string | null; years_of_experience?: number | null; skills?: string[]; location?: string | null; linkedin_url?: string | null; email?: string | null; phone?: string | null; avatar_url?: string | null; profile_image_url?: string | null; data_confidence?: Json; first_seen_at?: string; last_seen_at?: string; created_at?: string; updated_at?: string }
        Update: { id?: string; canonical_key?: string; name?: string; current_role?: string | null; company?: string | null; years_of_experience?: number | null; skills?: string[]; location?: string | null; linkedin_url?: string | null; email?: string | null; phone?: string | null; avatar_url?: string | null; profile_image_url?: string | null; data_confidence?: Json; first_seen_at?: string; last_seen_at?: string; created_at?: string; updated_at?: string }
      }
      candidate_sources: {
        Row: { id: string; candidate_id: string; source_name: string; source_url: string | null; raw_payload: Json; found_at: string }
        Insert: { id?: string; candidate_id: string; source_name: string; source_url?: string | null; raw_payload?: Json; found_at?: string }
        Update: { id?: string; candidate_id?: string; source_name?: string; source_url?: string | null; raw_payload?: Json; found_at?: string }
      }
      search_candidates: {
        Row: { id: string; search_id: string; candidate_id: string; score: number; score_breakdown: Json; matched_skills: string[]; missing_skills: string[]; skill_evidence: Json; decision_summary: string | null; red_flags: string[]; recommendation: Database["public"]["Enums"]["candidate_recommendation"]; pipeline_status: Database["public"]["Enums"]["pipeline_status"]; feedback: Database["public"]["Enums"]["feedback_tag"] | null; assigned_to: string | null; shortlisted_at: string | null; last_contacted_at: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; search_id: string; candidate_id: string; score?: number; score_breakdown?: Json; matched_skills?: string[]; missing_skills?: string[]; skill_evidence?: Json; decision_summary?: string | null; red_flags?: string[]; recommendation?: Database["public"]["Enums"]["candidate_recommendation"]; pipeline_status?: Database["public"]["Enums"]["pipeline_status"]; feedback?: Database["public"]["Enums"]["feedback_tag"] | null; assigned_to?: string | null; shortlisted_at?: string | null; last_contacted_at?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; search_id?: string; candidate_id?: string; score?: number; score_breakdown?: Json; matched_skills?: string[]; missing_skills?: string[]; skill_evidence?: Json; decision_summary?: string | null; red_flags?: string[]; recommendation?: Database["public"]["Enums"]["candidate_recommendation"]; pipeline_status?: Database["public"]["Enums"]["pipeline_status"]; feedback?: Database["public"]["Enums"]["feedback_tag"] | null; assigned_to?: string | null; shortlisted_at?: string | null; last_contacted_at?: string | null; created_at?: string; updated_at?: string }
      }
      candidate_notes: {
        Row: { id: string; search_candidate_id: string; body: string; created_by: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; search_candidate_id: string; body: string; created_by?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; search_candidate_id?: string; body?: string; created_by?: string | null; created_at?: string; updated_at?: string }
      }
      candidate_events: {
        Row: { id: string; candidate_id: string | null; search_candidate_id: string | null; event_type: Database["public"]["Enums"]["event_type"]; message: string; metadata: Json; created_by: string | null; created_at: string }
        Insert: { id?: string; candidate_id?: string | null; search_candidate_id?: string | null; event_type: Database["public"]["Enums"]["event_type"]; message: string; metadata?: Json; created_by?: string | null; created_at?: string }
        Update: { id?: string; candidate_id?: string | null; search_candidate_id?: string | null; event_type?: Database["public"]["Enums"]["event_type"]; message?: string; metadata?: Json; created_by?: string | null; created_at?: string }
      }
      enrichment_requests: {
        Row: { id: string; candidate_id: string; provider: string | null; status: string; result: Json; requested_by: string | null; requested_at: string; completed_at: string | null }
        Insert: { id?: string; candidate_id: string; provider?: string | null; status?: string; result?: Json; requested_by?: string | null; requested_at?: string; completed_at?: string | null }
        Update: { id?: string; candidate_id?: string; provider?: string | null; status?: string; result?: Json; requested_by?: string | null; requested_at?: string; completed_at?: string | null }
      }
      data_exports: {
        Row: { id: string; search_id: string | null; exported_candidate_ids: string[]; export_reason: string | null; created_by: string | null; created_at: string }
        Insert: { id?: string; search_id?: string | null; exported_candidate_ids?: string[]; export_reason?: string | null; created_by?: string | null; created_at?: string }
        Update: { id?: string; search_id?: string | null; exported_candidate_ids?: string[]; export_reason?: string | null; created_by?: string | null; created_at?: string }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "admin" | "recruiter" | "manager" | "viewer"
      pipeline_status: "Ny" | "Intressant" | "Kontaktad" | "Svarat" | "Ej aktuell" | "Intervju" | "Kontakta" | "Avvakta" | "Ej relevant" | "Skickad till Cinode"
      feedback_tag: "Relevant" | "Inte relevant" | "Fel bransch" | "För junior" | "Fel geografi" | "Saknar nyckelkompetens"
      candidate_recommendation: "Kontakta nu" | "Kanske" | "Avvakta" | "Ej relevant"
      event_type: "created" | "shortlisted" | "status_changed" | "feedback_added" | "note_added" | "contacted" | "exported" | "enrichment_requested" | "deleted"
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
      app_role: ["admin", "recruiter", "manager", "viewer"],
      pipeline_status: ["Ny", "Intressant", "Kontaktad", "Svarat", "Ej aktuell", "Intervju"],
      feedback_tag: ["Relevant", "Inte relevant", "Fel bransch", "För junior", "Fel geografi", "Saknar nyckelkompetens"],
      candidate_recommendation: ["Kontakta nu", "Kanske", "Avvakta", "Ej relevant"],
      event_type: ["created", "shortlisted", "status_changed", "feedback_added", "note_added", "contacted", "exported", "enrichment_requested", "deleted"],
    },
  },
} as const
