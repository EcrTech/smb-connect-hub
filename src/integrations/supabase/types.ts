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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          is_super_admin: boolean | null
          permissions: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_super_admin?: boolean | null
          permissions?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_super_admin?: boolean | null
          permissions?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          company_id: string | null
          created_at: string | null
          data: Json | null
          event_type: string
          id: string
          ip_address: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          data?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          data?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      association_managers: {
        Row: {
          association_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          permissions: Json | null
          role: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          association_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          permissions?: Json | null
          role?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          association_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          permissions?: Json | null
          role?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "association_managers_association_id_fkey"
            columns: ["association_id"]
            isOneToOne: false
            referencedRelation: "associations"
            referencedColumns: ["id"]
          },
        ]
      }
      association_requests: {
        Row: {
          address: string | null
          admin_notes: string | null
          city: string | null
          contact_email: string
          contact_phone: string | null
          country: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          postal_code: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          state: string | null
          status: string | null
          updated_at: string | null
          user_id: string
          website: string | null
        }
        Insert: {
          address?: string | null
          admin_notes?: string | null
          city?: string | null
          contact_email: string
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          postal_code?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
          website?: string | null
        }
        Update: {
          address?: string | null
          admin_notes?: string | null
          city?: string | null
          contact_email?: string
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          postal_code?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      associations: {
        Row: {
          address: string | null
          city: string | null
          contact_email: string
          contact_phone: string | null
          country: string | null
          created_at: string | null
          description: string | null
          founded_year: number | null
          id: string
          industry: string | null
          is_active: boolean | null
          keywords: string[] | null
          logo: string | null
          name: string
          postal_code: string | null
          social_links: Json | null
          state: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_email: string
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          founded_year?: number | null
          id?: string
          industry?: string | null
          is_active?: boolean | null
          keywords?: string[] | null
          logo?: string | null
          name: string
          postal_code?: string | null
          social_links?: Json | null
          state?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_email?: string
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          founded_year?: number | null
          id?: string
          industry?: string | null
          is_active?: boolean | null
          keywords?: string[] | null
          logo?: string | null
          name?: string
          postal_code?: string | null
          social_links?: Json | null
          state?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          changes: Json | null
          created_at: string | null
          id: string
          ip_address: string | null
          resource: string
          resource_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          resource: string
          resource_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          resource?: string
          resource_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      certifications: {
        Row: {
          created_at: string | null
          credential_id: string | null
          credential_url: string | null
          display_order: number | null
          expiration_date: string | null
          id: string
          issue_date: string | null
          issuing_organization: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          credential_id?: string | null
          credential_url?: string | null
          display_order?: number | null
          expiration_date?: string | null
          id?: string
          issue_date?: string | null
          issuing_organization: string
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          credential_id?: string | null
          credential_url?: string | null
          display_order?: number | null
          expiration_date?: string | null
          id?: string
          issue_date?: string | null
          issuing_organization?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chat_participants: {
        Row: {
          chat_id: string
          company_id: string
          id: string
          is_muted: boolean | null
          joined_at: string | null
          last_read_at: string | null
        }
        Insert: {
          chat_id: string
          company_id: string
          id?: string
          is_muted?: boolean | null
          joined_at?: string | null
          last_read_at?: string | null
        }
        Update: {
          chat_id?: string
          company_id?: string
          id?: string
          is_muted?: boolean | null
          joined_at?: string | null
          last_read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_participants_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_participants_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          created_at: string | null
          id: string
          last_message_at: string | null
          name: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          name?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          name?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          address: string | null
          annual_turnover: number | null
          association_id: string
          business_type: string | null
          city: string | null
          country: string | null
          created_at: string | null
          description: string | null
          email: string
          employee_count: number | null
          gst_number: string | null
          id: string
          industry_type: string | null
          is_active: boolean | null
          is_verified: boolean | null
          logo: string | null
          name: string
          pan_number: string | null
          phone: string | null
          postal_code: string | null
          state: string | null
          subscription_tier: string | null
          updated_at: string | null
          verified_at: string | null
          website: string | null
          year_established: number | null
        }
        Insert: {
          address?: string | null
          annual_turnover?: number | null
          association_id: string
          business_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          email: string
          employee_count?: number | null
          gst_number?: string | null
          id?: string
          industry_type?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          logo?: string | null
          name: string
          pan_number?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
          verified_at?: string | null
          website?: string | null
          year_established?: number | null
        }
        Update: {
          address?: string | null
          annual_turnover?: number | null
          association_id?: string
          business_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          email?: string
          employee_count?: number | null
          gst_number?: string | null
          id?: string
          industry_type?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          logo?: string | null
          name?: string
          pan_number?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
          verified_at?: string | null
          website?: string | null
          year_established?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_association_id_fkey"
            columns: ["association_id"]
            isOneToOne: false
            referencedRelation: "associations"
            referencedColumns: ["id"]
          },
        ]
      }
      company_invitations: {
        Row: {
          accepted_at: string | null
          association_id: string
          company_name: string
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          status: string | null
          token: string
        }
        Insert: {
          accepted_at?: string | null
          association_id: string
          company_name: string
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          invited_by?: string | null
          status?: string | null
          token: string
        }
        Update: {
          accepted_at?: string | null
          association_id?: string
          company_name?: string
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          status?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_invitations_association_id_fkey"
            columns: ["association_id"]
            isOneToOne: false
            referencedRelation: "associations"
            referencedColumns: ["id"]
          },
        ]
      }
      connections: {
        Row: {
          created_at: string | null
          id: string
          message: string | null
          receiver_id: string
          responded_at: string | null
          sender_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string | null
          receiver_id: string
          responded_at?: string | null
          sender_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string | null
          receiver_id?: string
          responded_at?: string | null
          sender_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "connections_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connections_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      education: {
        Row: {
          created_at: string | null
          degree: string | null
          description: string | null
          display_order: number | null
          end_date: string | null
          field_of_study: string | null
          grade: string | null
          id: string
          school: string
          start_date: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          degree?: string | null
          description?: string | null
          display_order?: number | null
          end_date?: string | null
          field_of_study?: string | null
          grade?: string | null
          id?: string
          school: string
          start_date?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          degree?: string | null
          description?: string | null
          display_order?: number | null
          end_date?: string | null
          field_of_study?: string | null
          grade?: string | null
          id?: string
          school?: string
          start_date?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      key_functionaries: {
        Row: {
          association_id: string
          bio: string | null
          created_at: string | null
          designation: string
          display_order: number | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          photo: string | null
          updated_at: string | null
        }
        Insert: {
          association_id: string
          bio?: string | null
          created_at?: string | null
          designation: string
          display_order?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          photo?: string | null
          updated_at?: string | null
        }
        Update: {
          association_id?: string
          bio?: string | null
          created_at?: string | null
          designation?: string
          display_order?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          photo?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "key_functionaries_association_id_fkey"
            columns: ["association_id"]
            isOneToOne: false
            referencedRelation: "associations"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          company_id: string | null
          created_at: string | null
          department: string | null
          designation: string | null
          id: string
          is_active: boolean | null
          joined_at: string | null
          permissions: Json | null
          role: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          department?: string | null
          designation?: string | null
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          permissions?: Json | null
          role?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          department?: string | null
          designation?: string | null
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          permissions?: Json | null
          role?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachments: Json | null
          chat_id: string
          content: string | null
          created_at: string | null
          deleted_at: string | null
          id: string
          is_deleted: boolean | null
          is_edited: boolean | null
          message_type: string | null
          metadata: Json | null
          sender_id: string
          sent_at: string | null
          updated_at: string | null
        }
        Insert: {
          attachments?: Json | null
          chat_id: string
          content?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          message_type?: string | null
          metadata?: Json | null
          sender_id: string
          sent_at?: string | null
          updated_at?: string | null
        }
        Update: {
          attachments?: Json | null
          chat_id?: string
          content?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          message_type?: string | null
          metadata?: Json | null
          sender_id?: string
          sent_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          category: string
          created_at: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          post_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          post_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          post_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          comments_count: number | null
          content: string
          created_at: string | null
          id: string
          image_url: string | null
          likes_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comments_count?: number | null
          content: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          likes_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comments_count?: number | null
          content?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          likes_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar: string | null
          bio: string | null
          cover_image: string | null
          created_at: string | null
          current_context: string | null
          employment_status: string | null
          first_name: string
          headline: string | null
          id: string
          last_name: string
          linkedin_url: string | null
          location: string | null
          open_to_work: boolean | null
          phone: string | null
          twitter_url: string | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          avatar?: string | null
          bio?: string | null
          cover_image?: string | null
          created_at?: string | null
          current_context?: string | null
          employment_status?: string | null
          first_name: string
          headline?: string | null
          id: string
          last_name: string
          linkedin_url?: string | null
          location?: string | null
          open_to_work?: boolean | null
          phone?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          avatar?: string | null
          bio?: string | null
          cover_image?: string | null
          created_at?: string | null
          current_context?: string | null
          employment_status?: string | null
          first_name?: string
          headline?: string | null
          id?: string
          last_name?: string
          linkedin_url?: string | null
          location?: string | null
          open_to_work?: boolean | null
          phone?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      skills: {
        Row: {
          created_at: string | null
          display_order: number | null
          endorsements_count: number | null
          id: string
          skill_name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          endorsements_count?: number | null
          id?: string
          skill_name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          endorsements_count?: number | null
          id?: string
          skill_name?: string
          user_id?: string
        }
        Relationships: []
      }
      work_experience: {
        Row: {
          company: string
          created_at: string | null
          description: string | null
          display_order: number | null
          end_date: string | null
          id: string
          is_current: boolean | null
          location: string | null
          start_date: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          location?: string | null
          start_date: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          location?: string | null
          start_date?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      duplicate_companies_monitor: {
        Row: {
          association_id: string | null
          company_ids: string[] | null
          duplicate_count: number | null
          first_created: string | null
          last_created: string | null
          name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_association_id_fkey"
            columns: ["association_id"]
            isOneToOne: false
            referencedRelation: "associations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      check_company_admin_for_member: {
        Args: { member_company_id: string }
        Returns: boolean
      }
      get_user_role_context: {
        Args: { check_user_id: string }
        Returns: string
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      is_admin: {
        Args: { check_user_id: string }
        Returns: boolean
      }
      is_association_manager: {
        Args: { check_association_id: string; check_user_id: string }
        Returns: boolean
      }
      is_company_admin: {
        Args: { check_company_id: string; check_user_id: string }
        Returns: boolean
      }
      is_company_admin_safe: {
        Args: { check_company_id: string; check_user_id: string }
        Returns: boolean
      }
      is_super_admin: {
        Args: { check_user_id: string }
        Returns: boolean
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
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
