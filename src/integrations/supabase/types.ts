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
      agenda_business_settings: {
        Row: {
          about_image_position_x: number
          about_image_position_y: number
          about_image_scale: number
          about_image_url: string | null
          about_text: string | null
          about_title: string | null
          accent_hsl: string
          address: string | null
          admin_whatsapp: string | null
          business_type: string
          cancellation_notice_hours: number
          closed_message: string | null
          display_name: string
          facebook_url: string | null
          hero_image_position_x: number
          hero_image_position_y: number
          hero_image_scale: number
          hero_image_url: string | null
          hero_subtitle: string | null
          hero_title: string | null
          id: string
          instagram_url: string | null
          location_image_url: string | null
          logo_size: number
          logo_url: string | null
          owner_user_id: string
          pix_key: string | null
          pix_merchant_name: string | null
          primary_hsl: string
          professional_label: string
          public_booking_enabled: boolean
          public_queue_visible: boolean
          reminder_24h_enabled: boolean
          reminder_2h_enabled: boolean
          reminder_30m_enabled: boolean
          reminder_enabled: boolean
          reschedule_notice_hours: number
          service_label: string
          service_mode: string
          slug: string
          sound_cancellation_enabled: boolean
          sound_completion_enabled: boolean
          sound_new_appointment_enabled: boolean
          sound_notifications_enabled: boolean
          sound_reschedule_enabled: boolean
          store_account_id: string
          success_hsl: string
          tagline: string
          team_image_url: string | null
          whatsapp: string | null
        }
        Insert: {
          about_image_position_x?: number
          about_image_position_y?: number
          about_image_scale?: number
          about_image_url?: string | null
          about_text?: string | null
          about_title?: string | null
          accent_hsl?: string
          address?: string | null
          admin_whatsapp?: string | null
          business_type?: string
          cancellation_notice_hours?: number
          closed_message?: string | null
          display_name: string
          facebook_url?: string | null
          hero_image_position_x?: number
          hero_image_position_y?: number
          hero_image_scale?: number
          hero_image_url?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          instagram_url?: string | null
          location_image_url?: string | null
          logo_size?: number
          logo_url?: string | null
          owner_user_id: string
          pix_key?: string | null
          pix_merchant_name?: string | null
          primary_hsl?: string
          professional_label?: string
          public_booking_enabled?: boolean
          public_queue_visible?: boolean
          reminder_24h_enabled?: boolean
          reminder_2h_enabled?: boolean
          reminder_30m_enabled?: boolean
          reminder_enabled?: boolean
          reschedule_notice_hours?: number
          service_label?: string
          service_mode?: string
          slug: string
          sound_cancellation_enabled?: boolean
          sound_completion_enabled?: boolean
          sound_new_appointment_enabled?: boolean
          sound_notifications_enabled?: boolean
          sound_reschedule_enabled?: boolean
          store_account_id: string
          success_hsl?: string
          tagline?: string
          team_image_url?: string | null
          whatsapp?: string | null
        }
        Update: {
          about_image_position_x?: number
          about_image_position_y?: number
          about_image_scale?: number
          about_image_url?: string | null
          about_text?: string | null
          about_title?: string | null
          accent_hsl?: string
          address?: string | null
          admin_whatsapp?: string | null
          business_type?: string
          cancellation_notice_hours?: number
          closed_message?: string | null
          display_name?: string
          facebook_url?: string | null
          hero_image_position_x?: number
          hero_image_position_y?: number
          hero_image_scale?: number
          hero_image_url?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          instagram_url?: string | null
          location_image_url?: string | null
          logo_size?: number
          logo_url?: string | null
          owner_user_id?: string
          pix_key?: string | null
          pix_merchant_name?: string | null
          primary_hsl?: string
          professional_label?: string
          public_booking_enabled?: boolean
          public_queue_visible?: boolean
          reminder_24h_enabled?: boolean
          reminder_2h_enabled?: boolean
          reminder_30m_enabled?: boolean
          reminder_enabled?: boolean
          reschedule_notice_hours?: number
          service_label?: string
          service_mode?: string
          slug?: string
          sound_cancellation_enabled?: boolean
          sound_completion_enabled?: boolean
          sound_new_appointment_enabled?: boolean
          sound_notifications_enabled?: boolean
          sound_reschedule_enabled?: boolean
          store_account_id?: string
          success_hsl?: string
          tagline?: string
          team_image_url?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agenda_business_settings_store_account_id_fkey"
            columns: ["store_account_id"]
            isOneToOne: true
            referencedRelation: "store_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      agenda_clients: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          owner_user_id: string
          phone: string
          store_account_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          owner_user_id: string
          phone?: string
          store_account_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          owner_user_id?: string
          phone?: string
          store_account_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_clients_store_account_id_fkey"
            columns: ["store_account_id"]
            isOneToOne: false
            referencedRelation: "store_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      agenda_product_order_items: {
        Row: {
          created_at: string
          id: string
          line_total: number
          order_id: string
          product_id: string
          product_name: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          line_total: number
          order_id: string
          product_id: string
          product_name: string
          quantity: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          line_total?: number
          order_id?: string
          product_id?: string
          product_name?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "agenda_product_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "agenda_product_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_product_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "agenda_products"
            referencedColumns: ["id"]
          },
        ]
      }
      agenda_product_orders: {
        Row: {
          client_id: string | null
          client_name: string
          client_phone: string | null
          created_at: string
          id: string
          notes: string | null
          order_status: string
          owner_user_id: string
          payment_method: string
          payment_status: string
          store_account_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          client_name: string
          client_phone?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_status?: string
          owner_user_id: string
          payment_method?: string
          payment_status?: string
          store_account_id: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          client_name?: string
          client_phone?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_status?: string
          owner_user_id?: string
          payment_method?: string
          payment_status?: string
          store_account_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_product_orders_store_account_id_fkey"
            columns: ["store_account_id"]
            isOneToOne: false
            referencedRelation: "store_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      agenda_products: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          owner_user_id: string
          price: number
          stock_quantity: number
          store_account_id: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          owner_user_id: string
          price?: number
          stock_quantity?: number
          store_account_id: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          owner_user_id?: string
          price?: number
          stock_quantity?: number
          store_account_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_products_store_account_id_fkey"
            columns: ["store_account_id"]
            isOneToOne: false
            referencedRelation: "store_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_services: {
        Row: {
          added_at: string
          added_by_barber: boolean
          appointment_id: string
          id: string
          owner_user_id: string | null
          service_id: string
          store_account_id: string | null
        }
        Insert: {
          added_at?: string
          added_by_barber?: boolean
          appointment_id: string
          id?: string
          owner_user_id?: string | null
          service_id: string
          store_account_id?: string | null
        }
        Update: {
          added_at?: string
          added_by_barber?: boolean
          appointment_id?: string
          id?: string
          owner_user_id?: string | null
          service_id?: string
          store_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_services_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_services_store_account_id_fkey"
            columns: ["store_account_id"]
            isOneToOne: false
            referencedRelation: "store_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          appointment_type: string
          barber_id: string
          client_id: string | null
          client_name: string
          client_phone: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          owner_user_id: string | null
          payment_method: string | null
          payment_status: string | null
          service_id: string
          status: Database["public"]["Enums"]["appointment_status"]
          store_account_id: string | null
          updated_at: string
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          appointment_type?: string
          barber_id: string
          client_id?: string | null
          client_name: string
          client_phone?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          owner_user_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          service_id: string
          status?: Database["public"]["Enums"]["appointment_status"]
          store_account_id?: string | null
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          appointment_type?: string
          barber_id?: string
          client_id?: string | null
          client_name?: string
          client_phone?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          owner_user_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          service_id?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          store_account_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_store_account_id_fkey"
            columns: ["store_account_id"]
            isOneToOne: false
            referencedRelation: "store_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      barbers: {
        Row: {
          bio: string | null
          commission: number
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          owner_user_id: string | null
          password_hash: string | null
          phone: string | null
          photo_url: string | null
          store_account_id: string | null
          updated_at: string
          user_id: string | null
          username: string | null
        }
        Insert: {
          bio?: string | null
          commission?: number
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          owner_user_id?: string | null
          password_hash?: string | null
          phone?: string | null
          photo_url?: string | null
          store_account_id?: string | null
          updated_at?: string
          user_id?: string | null
          username?: string | null
        }
        Update: {
          bio?: string | null
          commission?: number
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          owner_user_id?: string | null
          password_hash?: string | null
          phone?: string | null
          photo_url?: string | null
          store_account_id?: string | null
          updated_at?: string
          user_id?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "barbers_store_account_id_fkey"
            columns: ["store_account_id"]
            isOneToOne: false
            referencedRelation: "store_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      business_hours: {
        Row: {
          close_time: string
          day_of_week: number
          id: string
          is_open: boolean
          open_time: string
          owner_user_id: string | null
          store_account_id: string | null
        }
        Insert: {
          close_time?: string
          day_of_week: number
          id?: string
          is_open?: boolean
          open_time?: string
          owner_user_id?: string | null
          store_account_id?: string | null
        }
        Update: {
          close_time?: string
          day_of_week?: number
          id?: string
          is_open?: boolean
          open_time?: string
          owner_user_id?: string | null
          store_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_hours_store_account_id_fkey"
            columns: ["store_account_id"]
            isOneToOne: false
            referencedRelation: "store_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      business_locations: {
        Row: {
          address: string
          created_at: string
          google_maps_embed_url: string | null
          id: string
          is_active: boolean
          latitude: number | null
          longitude: number | null
          name: string
          owner_user_id: string | null
          phone: string | null
          store_account_id: string | null
          updated_at: string
        }
        Insert: {
          address: string
          created_at?: string
          google_maps_embed_url?: string | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          owner_user_id?: string | null
          phone?: string | null
          store_account_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          google_maps_embed_url?: string | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          owner_user_id?: string | null
          phone?: string | null
          store_account_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_locations_store_account_id_fkey"
            columns: ["store_account_id"]
            isOneToOne: false
            referencedRelation: "store_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          owner_user_id: string | null
          phone: string | null
          store_account_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          owner_user_id?: string | null
          phone?: string | null
          store_account_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          owner_user_id?: string | null
          phone?: string | null
          store_account_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_store_account_id_fkey"
            columns: ["store_account_id"]
            isOneToOne: false
            referencedRelation: "store_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_programs: {
        Row: {
          created_at: string
          description: string | null
          goal_count: number
          id: string
          is_active: boolean
          name: string
          owner_user_id: string | null
          reward_description: string
          service_id: string | null
          store_account_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          goal_count?: number
          id?: string
          is_active?: boolean
          name: string
          owner_user_id?: string | null
          reward_description?: string
          service_id?: string | null
          store_account_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          goal_count?: number
          id?: string
          is_active?: boolean
          name?: string
          owner_user_id?: string | null
          reward_description?: string
          service_id?: string | null
          store_account_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_programs_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_programs_store_account_id_fkey"
            columns: ["store_account_id"]
            isOneToOne: false
            referencedRelation: "store_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_progress: {
        Row: {
          agenda_client_id: string | null
          client_id: string | null
          client_name: string
          client_phone: string | null
          completed: boolean
          created_at: string
          current_count: number
          id: string
          owner_user_id: string | null
          program_id: string
          reward_claimed: boolean
          store_account_id: string | null
          updated_at: string
        }
        Insert: {
          agenda_client_id?: string | null
          client_id?: string | null
          client_name: string
          client_phone?: string | null
          completed?: boolean
          created_at?: string
          current_count?: number
          id?: string
          owner_user_id?: string | null
          program_id: string
          reward_claimed?: boolean
          store_account_id?: string | null
          updated_at?: string
        }
        Update: {
          agenda_client_id?: string | null
          client_id?: string | null
          client_name?: string
          client_phone?: string | null
          completed?: boolean
          created_at?: string
          current_count?: number
          id?: string
          owner_user_id?: string | null
          program_id?: string
          reward_claimed?: boolean
          store_account_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_progress_agenda_client_id_fkey"
            columns: ["agenda_client_id"]
            isOneToOne: false
            referencedRelation: "agenda_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_progress_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_progress_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "loyalty_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_progress_store_account_id_fkey"
            columns: ["store_account_id"]
            isOneToOne: false
            referencedRelation: "store_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          owner_user_id: string | null
          price: number
          stock_quantity: number
          store_account_id: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          owner_user_id?: string | null
          price?: number
          stock_quantity?: number
          store_account_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          owner_user_id?: string | null
          price?: number
          stock_quantity?: number
          store_account_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_store_account_id_fkey"
            columns: ["store_account_id"]
            isOneToOne: false
            referencedRelation: "store_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          owner_user_id: string | null
          phone: string | null
          updated_at: string
          user_id: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id: string
          owner_user_id?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          owner_user_id?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      services: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          name: string
          owner_user_id: string | null
          price: number
          store_account_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name: string
          owner_user_id?: string | null
          price: number
          store_account_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name?: string
          owner_user_id?: string | null
          price?: number
          store_account_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_store_account_id_fkey"
            columns: ["store_account_id"]
            isOneToOne: false
            referencedRelation: "store_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      store_accounts: {
        Row: {
          created_at: string
          id: string
          owner_user_id: string
          product_context: string
          test_access_ends_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          owner_user_id: string
          product_context?: string
          test_access_ends_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          owner_user_id?: string
          product_context?: string
          test_access_ends_at?: string | null
        }
        Relationships: []
      }
      store_subscriptions: {
        Row: {
          created_at: string
          current_period_ends_at: string | null
          id: string
          owner_user_id: string
          plan_id: string
          product_context: string
          status: string
        }
        Insert: {
          created_at?: string
          current_period_ends_at?: string | null
          id?: string
          owner_user_id: string
          plan_id: string
          product_context?: string
          status?: string
        }
        Update: {
          created_at?: string
          current_period_ends_at?: string | null
          id?: string
          owner_user_id?: string
          plan_id?: string
          product_context?: string
          status?: string
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
          role?: Database["public"]["Enums"]["app_role"]
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
      add_service_to_appointment: {
        Args: {
          p_appointment_id: string
          p_barber_id: string
          p_service_id: string
          p_session_token?: string
        }
        Returns: boolean
      }
      appointment_total_duration_minutes: {
        Args: { p_appointment_id: string }
        Returns: number
      }
      assert_no_appointment_overlap: {
        Args: {
          p_appointment_date: string
          p_barber_id: string
          p_duration_minutes: number
          p_ignore_appointment_id?: string
          p_start_time: string
        }
        Returns: undefined
      }
      authenticate_barber: {
        Args: { p_password: string; p_username: string }
        Returns: {
          barber_id: string
          barber_name: string
          session_token: string
          user_id: string
        }[]
      }
      barber_cancel_appointment: {
        Args: {
          p_appointment_id: string
          p_barber_id: string
          p_session_token?: string
        }
        Returns: boolean
      }
      cancel_client_appointment: {
        Args: { p_appointment_id: string }
        Returns: boolean
      }
      confirm_agenda_appointment_payment: {
        Args: { p_appointment_id: string }
        Returns: boolean
      }
      create_agenda_product_order: {
        Args: {
          p_client_name: string
          p_client_phone?: string
          p_items: Json
          p_notes?: string
          p_payment_method?: string
          p_store_account_id: string
        }
        Returns: string
      }
      create_appointment_with_services: {
        Args: {
          p_appointment_date: string
          p_appointment_time: string
          p_barber_id: string
          p_client_name: string
          p_client_phone?: string
          p_notes?: string
          p_payment_method?: string
          p_service_ids: string[]
        }
        Returns: string
      }
      create_barber_appointment: {
        Args: {
          p_appointment_date: string
          p_appointment_time: string
          p_barber_id: string
          p_client_name: string
          p_client_phone: string
          p_service_id: string
          p_session_token: string
        }
        Returns: string
      }
      create_walk_in_queue_entry: {
        Args: {
          p_barber_id: string
          p_client_name: string
          p_client_phone?: string
          p_notes?: string
          p_payment_method?: string
          p_service_ids: string[]
        }
        Returns: string
      }
      get_appointment_extra_services: {
        Args: { p_appointment_ids: string[] }
        Returns: {
          appointment_id: string
          service_duration: number
          service_id: string
          service_name: string
          service_price: number
        }[]
      }
      get_barber_appointment_extra_services: {
        Args: {
          p_appointment_ids: string[]
          p_barber_id: string
          p_session_token?: string
        }
        Returns: {
          appointment_id: string
          service_duration: number
          service_id: string
          service_name: string
          service_price: number
        }[]
      }
      get_barber_appointments: {
        Args: { p_barber_id: string; p_session_token?: string }
        Returns: {
          appointment_date: string
          appointment_time: string
          client_name: string
          client_phone: string
          id: string
          payment_method: string
          payment_status: string
          service_duration: number
          service_id: string
          service_name: string
          service_price: number
          status: Database["public"]["Enums"]["appointment_status"]
        }[]
      }
      get_barber_booked_slots: {
        Args: { p_appointment_date: string; p_barber_id: string }
        Returns: {
          appointment_time: string
          duration_minutes: number
        }[]
      }
      get_public_waiting_queue: {
        Args: { p_store_account_id: string }
        Returns: {
          barber_name: string
          client_name: string
          created_at: string
          id: string
          position: number
          service_name: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      reschedule_client_appointment: {
        Args: {
          p_appointment_date: string
          p_appointment_id: string
          p_appointment_time: string
        }
        Returns: boolean
      }
      set_barber_password: {
        Args: { p_barber_id: string; p_password: string; p_username: string }
        Returns: boolean
      }
      verify_barber_session: {
        Args: { p_barber_id: string; p_session_token: string }
        Returns: boolean
      }
      verify_email_phone: {
        Args: { p_email: string; p_phone: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "client" | "barber"
      appointment_status: "scheduled" | "completed" | "cancelled"
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
      app_role: ["admin", "client", "barber"],
      appointment_status: ["scheduled", "completed", "cancelled"],
    },
  },
} as const
