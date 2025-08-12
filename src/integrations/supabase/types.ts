export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          details: Json | null
          id: string
          ip_address: unknown | null
          target_id: string | null
          target_type: string
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          target_id?: string | null
          target_type: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          target_id?: string | null
          target_type?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      admin_settings: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
          updated_by: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string
        }
        Relationships: []
      }
      analytics: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          file_processing_size: number | null
          id: string
          ip_address: unknown | null
          page_url: string | null
          processing_time_ms: number | null
          session_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          file_processing_size?: number | null
          id?: string
          ip_address?: unknown | null
          page_url?: string | null
          processing_time_ms?: number | null
          session_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          file_processing_size?: number | null
          id?: string
          ip_address?: unknown | null
          page_url?: string | null
          processing_time_ms?: number | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      content_library: {
        Row: {
          content: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          status: string
          tags: string[] | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          status?: string
          tags?: string[] | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          status?: string
          tags?: string[] | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      custom_prompts: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          prompt_text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          prompt_text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          prompt_text?: string
          updated_at?: string
        }
        Relationships: []
      }
      dismissed_recommendations: {
        Row: {
          created_at: string
          dismissed_at: string
          expires_at: string | null
          id: string
          reason: string | null
          recommendation_key: string
          recommendation_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dismissed_at?: string
          expires_at?: string | null
          id?: string
          reason?: string | null
          recommendation_key: string
          recommendation_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          dismissed_at?: string
          expires_at?: string | null
          id?: string
          reason?: string | null
          recommendation_key?: string
          recommendation_type?: string
          user_id?: string
        }
        Relationships: []
      }
      doctor_notes: {
        Row: {
          attached_file_url: string | null
          content: string | null
          created_at: string
          facility_name: string | null
          id: string
          note_date: string
          note_type: string
          physician_name: string | null
          related_report_ids: string[]
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attached_file_url?: string | null
          content?: string | null
          created_at?: string
          facility_name?: string | null
          id?: string
          note_date?: string
          note_type?: string
          physician_name?: string | null
          related_report_ids?: string[]
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attached_file_url?: string | null
          content?: string | null
          created_at?: string
          facility_name?: string | null
          id?: string
          note_date?: string
          note_type?: string
          physician_name?: string | null
          related_report_ids?: string[]
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      emergency_contacts: {
        Row: {
          created_at: string
          id: string
          name: string
          phone_number: string
          priority: number
          relationship: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          phone_number: string
          priority?: number
          relationship: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          phone_number?: string
          priority?: number
          relationship?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      export_jobs: {
        Row: {
          created_at: string
          error_message: string | null
          expires_at: string | null
          export_type: string
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          parameters: Json | null
          progress_percentage: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          expires_at?: string | null
          export_type: string
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          parameters?: Json | null
          progress_percentage?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          expires_at?: string | null
          export_type?: string
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          parameters?: Json | null
          progress_percentage?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      family_members: {
        Row: {
          created_at: string
          date_of_birth: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          first_name: string
          gender: string | null
          id: string
          last_name: string
          medical_notes: string | null
          phone_number: string | null
          photo_url: string | null
          relationship: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name: string
          gender?: string | null
          id?: string
          last_name: string
          medical_notes?: string | null
          phone_number?: string | null
          photo_url?: string | null
          relationship: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          last_name?: string
          medical_notes?: string | null
          phone_number?: string | null
          photo_url?: string | null
          relationship?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      health_insights: {
        Row: {
          action_items: string[] | null
          confidence_score: number | null
          created_at: string
          data_source_ids: string[] | null
          description: string
          dismissed_at: string | null
          expires_at: string | null
          id: string
          insight_data: Json | null
          insight_type: string
          is_dismissed: boolean
          severity: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_items?: string[] | null
          confidence_score?: number | null
          created_at?: string
          data_source_ids?: string[] | null
          description: string
          dismissed_at?: string | null
          expires_at?: string | null
          id?: string
          insight_data?: Json | null
          insight_type: string
          is_dismissed?: boolean
          severity?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_items?: string[] | null
          confidence_score?: number | null
          created_at?: string
          data_source_ids?: string[] | null
          description?: string
          dismissed_at?: string | null
          expires_at?: string | null
          id?: string
          insight_data?: Json | null
          insight_type?: string
          is_dismissed?: boolean
          severity?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          citations: Json | null
          content: string
          context_documents: Json | null
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          citations?: Json | null
          content: string
          context_documents?: Json | null
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          citations?: Json | null
          content?: string
          context_documents?: Json | null
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_deliveries: {
        Row: {
          created_at: string
          delivered_at: string | null
          delivery_details: Json | null
          delivery_method: string
          error_message: string | null
          id: string
          notification_id: string
          sent_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          delivery_details?: Json | null
          delivery_method: string
          error_message?: string | null
          id?: string
          notification_id: string
          sent_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          delivery_details?: Json | null
          delivery_method?: string
          error_message?: string | null
          id?: string
          notification_id?: string
          sent_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_notification_deliveries_notification_id"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          category: string
          created_at: string
          expires_at: string | null
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          priority: number
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          category?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          priority?: number
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          category?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          priority?: number
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      processing_queue: {
        Row: {
          attempt_count: number
          created_at: string
          error_message: string | null
          estimated_completion_time: string | null
          id: string
          max_attempts: number
          metadata: Json | null
          priority: number
          processing_completed_at: string | null
          processing_started_at: string | null
          processing_time_ms: number | null
          report_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          error_message?: string | null
          estimated_completion_time?: string | null
          id?: string
          max_attempts?: number
          metadata?: Json | null
          priority?: number
          processing_completed_at?: string | null
          processing_started_at?: string | null
          processing_time_ms?: number | null
          report_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          error_message?: string | null
          estimated_completion_time?: string | null
          id?: string
          max_attempts?: number
          metadata?: Json | null
          priority?: number
          processing_completed_at?: string | null
          processing_started_at?: string | null
          processing_time_ms?: number | null
          report_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accessibility_needs: string[] | null
          address: string | null
          avatar_url: string | null
          created_at: string
          date_of_birth: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          first_name: string | null
          gender: string | null
          id: string
          insurance_policy_number: string | null
          insurance_provider: string | null
          last_name: string | null
          notification_preferences: Json | null
          phone_number: string | null
          physician_address: string | null
          physician_name: string | null
          physician_phone: string | null
          preferred_language: string | null
          privacy_settings: Json | null
          recommendation_preferences: Json | null
          sos_countdown_duration: number
          sos_enabled: boolean
          sos_message: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accessibility_needs?: string[] | null
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          last_name?: string | null
          notification_preferences?: Json | null
          phone_number?: string | null
          physician_address?: string | null
          physician_name?: string | null
          physician_phone?: string | null
          preferred_language?: string | null
          privacy_settings?: Json | null
          recommendation_preferences?: Json | null
          sos_countdown_duration?: number
          sos_enabled?: boolean
          sos_message?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accessibility_needs?: string[] | null
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          last_name?: string | null
          notification_preferences?: Json | null
          phone_number?: string | null
          physician_address?: string | null
          physician_name?: string | null
          physician_phone?: string | null
          preferred_language?: string | null
          privacy_settings?: Json | null
          recommendation_preferences?: Json | null
          sos_countdown_duration?: number
          sos_enabled?: boolean
          sos_message?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          description: string | null
          extracted_text: string | null
          extraction_confidence: number | null
          facility_name: string | null
          family_member_id: string | null
          file_name: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          id: string
          is_critical: boolean | null
          notes: string | null
          parsed_data: Json | null
          parsing_confidence: number | null
          parsing_model: string | null
          parsing_status: string | null
          physician_name: string | null
          processing_error: string | null
          report_date: string
          report_type: string | null
          tags: string[] | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          extracted_text?: string | null
          extraction_confidence?: number | null
          facility_name?: string | null
          family_member_id?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_critical?: boolean | null
          notes?: string | null
          parsed_data?: Json | null
          parsing_confidence?: number | null
          parsing_model?: string | null
          parsing_status?: string | null
          physician_name?: string | null
          processing_error?: string | null
          report_date: string
          report_type?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          extracted_text?: string | null
          extraction_confidence?: number | null
          facility_name?: string | null
          family_member_id?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_critical?: boolean | null
          notes?: string | null
          parsed_data?: Json | null
          parsing_confidence?: number | null
          parsing_model?: string | null
          parsing_status?: string | null
          physician_name?: string | null
          processing_error?: string | null
          report_date?: string
          report_type?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_family_member_id_fkey"
            columns: ["family_member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      sos_activations: {
        Row: {
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          id: string
          location_data: Json | null
          sms_sent: boolean
          status: string
          triggered_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          location_data?: Json | null
          sms_sent?: boolean
          status?: string
          triggered_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          location_data?: Json | null
          sms_sent?: boolean
          status?: string
          triggered_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      summaries: {
        Row: {
          ai_model_used: string | null
          confidence_score: number | null
          content: string
          created_at: string
          generated_at: string
          id: string
          is_pinned: boolean | null
          source_report_ids: string[] | null
          summary_type: string
          title: string
          updated_at: string
          user_feedback: string | null
          user_id: string
          user_rating: number | null
        }
        Insert: {
          ai_model_used?: string | null
          confidence_score?: number | null
          content: string
          created_at?: string
          generated_at: string
          id?: string
          is_pinned?: boolean | null
          source_report_ids?: string[] | null
          summary_type: string
          title: string
          updated_at?: string
          user_feedback?: string | null
          user_id: string
          user_rating?: number | null
        }
        Update: {
          ai_model_used?: string | null
          confidence_score?: number | null
          content?: string
          created_at?: string
          generated_at?: string
          id?: string
          is_pinned?: boolean | null
          source_report_ids?: string[] | null
          summary_type?: string
          title?: string
          updated_at?: string
          user_feedback?: string | null
          user_id?: string
          user_rating?: number | null
        }
        Relationships: []
      }
      system_metrics: {
        Row: {
          details: Json | null
          id: string
          metric_name: string
          metric_type: string
          recorded_at: string
          status: string
          unit: string
          value: number
        }
        Insert: {
          details?: Json | null
          id?: string
          metric_name: string
          metric_type: string
          recorded_at?: string
          status?: string
          unit: string
          value: number
        }
        Update: {
          details?: Json | null
          id?: string
          metric_name?: string
          metric_type?: string
          recorded_at?: string
          status?: string
          unit?: string
          value?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "user" | "moderator" | "admin" | "super_admin"
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
      app_role: ["user", "moderator", "admin", "super_admin"],
    },
  },
} as const
