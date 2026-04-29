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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          id: string
          payment_type: string
          service_request_id: string | null
          status: string | null
          stripe_payment_intent_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          id?: string
          payment_type: string
          service_request_id?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          payment_type?: string
          service_request_id?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_service_request_id_fkey"
            columns: ["service_request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approval_status: Database["public"]["Enums"]["approval_status"]
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          location: string | null
          phone: string | null
          role: string | null
          subscription_fee_paid: boolean | null
          updated_at: string | null
          user_id: string
          user_type: Database["public"]["Enums"]["user_type"]
        }
        Insert: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          location?: string | null
          phone?: string | null
          role?: string | null
          subscription_fee_paid?: boolean | null
          updated_at?: string | null
          user_id: string
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Update: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          location?: string | null
          phone?: string | null
          role?: string | null
          subscription_fee_paid?: boolean | null
          updated_at?: string | null
          user_id?: string
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Relationships: []
      }
      reviews: {
        Row: {
          client_id: string
          comment: string | null
          created_at: string | null
          id: string
          rating: number | null
          service_provider_id: string
          service_request_id: string
        }
        Insert: {
          client_id: string
          comment?: string | null
          created_at?: string | null
          id?: string
          rating?: number | null
          service_provider_id: string
          service_request_id: string
        }
        Update: {
          client_id?: string
          comment?: string | null
          created_at?: string | null
          id?: string
          rating?: number | null
          service_provider_id?: string
          service_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_service_provider_id_fkey"
            columns: ["service_provider_id"]
            isOneToOne: false
            referencedRelation: "service_provider_business_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_service_provider_id_fkey"
            columns: ["service_provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_service_request_id_fkey"
            columns: ["service_request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      service_providers: {
        Row: {
          business_description: string | null
          business_name: string | null
          certifications: string[] | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          facebook_url: string | null
          hourly_rate: number | null
          id: string
          instagram_url: string | null
          latitude: number | null
          license_number: string | null
          longitude: number | null
          portfolio_captions: Json | null
          portfolio_images: string[] | null
          profile_id: string
          rating: number | null
          service_categories: Database["public"]["Enums"]["service_category"][]
          total_jobs: number | null
          twitter_url: string | null
          updated_at: string | null
          whatsapp_number: string | null
          years_experience: number | null
        }
        Insert: {
          business_description?: string | null
          business_name?: string | null
          certifications?: string[] | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          facebook_url?: string | null
          hourly_rate?: number | null
          id?: string
          instagram_url?: string | null
          latitude?: number | null
          license_number?: string | null
          longitude?: number | null
          portfolio_captions?: Json | null
          portfolio_images?: string[] | null
          profile_id: string
          rating?: number | null
          service_categories: Database["public"]["Enums"]["service_category"][]
          total_jobs?: number | null
          twitter_url?: string | null
          updated_at?: string | null
          whatsapp_number?: string | null
          years_experience?: number | null
        }
        Update: {
          business_description?: string | null
          business_name?: string | null
          certifications?: string[] | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          facebook_url?: string | null
          hourly_rate?: number | null
          id?: string
          instagram_url?: string | null
          latitude?: number | null
          license_number?: string | null
          longitude?: number | null
          portfolio_captions?: Json | null
          portfolio_images?: string[] | null
          profile_id?: string
          rating?: number | null
          service_categories?: Database["public"]["Enums"]["service_category"][]
          total_jobs?: number | null
          twitter_url?: string | null
          updated_at?: string | null
          whatsapp_number?: string | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "service_providers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_requests: {
        Row: {
          budget_range: string | null
          client_id: string
          completed_at: string | null
          created_at: string | null
          description: string
          id: string
          location: string
          payment_status: string | null
          preferred_date: string | null
          service_id: string
          service_provider_id: string | null
          status: Database["public"]["Enums"]["request_status"] | null
          title: string
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          budget_range?: string | null
          client_id: string
          completed_at?: string | null
          created_at?: string | null
          description: string
          id?: string
          location: string
          payment_status?: string | null
          preferred_date?: string | null
          service_id: string
          service_provider_id?: string | null
          status?: Database["public"]["Enums"]["request_status"] | null
          title: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          budget_range?: string | null
          client_id?: string
          completed_at?: string | null
          created_at?: string | null
          description?: string
          id?: string
          location?: string
          payment_status?: string | null
          preferred_date?: string | null
          service_id?: string
          service_provider_id?: string | null
          status?: Database["public"]["Enums"]["request_status"] | null
          title?: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_service_provider_id_fkey"
            columns: ["service_provider_id"]
            isOneToOne: false
            referencedRelation: "service_provider_business_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_service_provider_id_fkey"
            columns: ["service_provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          base_price: number | null
          category: Database["public"]["Enums"]["service_category"]
          created_at: string | null
          description: string | null
          duration_estimate: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          base_price?: number | null
          category: Database["public"]["Enums"]["service_category"]
          created_at?: string | null
          description?: string | null
          duration_estimate?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          base_price?: number | null
          category?: Database["public"]["Enums"]["service_category"]
          created_at?: string | null
          description?: string | null
          duration_estimate?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_signup_errors: {
        Row: {
          auth_user_id: string | null
          created_at: string | null
          error_text: string | null
          id: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string | null
          error_text?: string | null
          id?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string | null
          error_text?: string | null
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      service_provider_business_info: {
        Row: {
          approval_status: Database["public"]["Enums"]["approval_status"] | null
          business_description: string | null
          business_name: string | null
          certifications: string[] | null
          hourly_rate: number | null
          id: string | null
          location: string | null
          portfolio_images: string[] | null
          rating: number | null
          service_categories:
            | Database["public"]["Enums"]["service_category"][]
            | null
          total_jobs: number | null
          user_type: Database["public"]["Enums"]["user_type"] | null
          years_experience: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      does_current_provider_match_service: {
        Args: { service_id: string }
        Returns: boolean
      }
      get_service_provider_business_info: {
        Args: { provider_id?: string }
        Returns: {
          business_description: string
          business_name: string
          certifications: string[]
          hourly_rate: number
          id: string
          location: string
          portfolio_images: string[]
          rating: number
          service_categories: Database["public"]["Enums"]["service_category"][]
          total_jobs: number
          years_experience: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_current_user_admin: { Args: never; Returns: boolean }
      is_service_provider_owner: { Args: { sp_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      approval_status: "pending" | "approved" | "rejected"
      request_status:
        | "pending"
        | "assigned"
        | "in_progress"
        | "completed"
        | "cancelled"
      service_category:
        | "construction"
        | "plumbing"
        | "electrical"
        | "roofing"
        | "tiling"
        | "surveying"
        | "maintenance"
        | "automotive"
        | "tech"
        | "creative"
        | "outdoor"
        | "education"
        | "events"
        | "painting"
        | "carpentry"
        | "landscaping"
      user_type: "client" | "service_provider" | "admin"
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
      app_role: ["admin", "moderator", "user"],
      approval_status: ["pending", "approved", "rejected"],
      request_status: [
        "pending",
        "assigned",
        "in_progress",
        "completed",
        "cancelled",
      ],
      service_category: [
        "construction",
        "plumbing",
        "electrical",
        "roofing",
        "tiling",
        "surveying",
        "maintenance",
        "automotive",
        "tech",
        "creative",
        "outdoor",
        "education",
        "events",
        "painting",
        "carpentry",
        "landscaping",
      ],
      user_type: ["client", "service_provider", "admin"],
    },
  },
} as const
