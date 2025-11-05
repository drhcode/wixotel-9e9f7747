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
      bookings: {
        Row: {
          check_in: string
          check_out: string
          confirmation_number: string | null
          created_at: string
          full_name: string
          guest_count: number
          guest_email: string | null
          guest_id: string
          guest_phone: string | null
          hotel_id: string
          id: string
          notes: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          room_id: string
          source: string | null
          status: Database["public"]["Enums"]["booking_status"]
          total_amount: number
          updated_at: string
        }
        Insert: {
          check_in: string
          check_out: string
          confirmation_number?: string | null
          created_at?: string
          full_name: string
          guest_count?: number
          guest_email?: string | null
          guest_id: string
          guest_phone?: string | null
          hotel_id: string
          id?: string
          notes?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          room_id: string
          source?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          total_amount: number
          updated_at?: string
        }
        Update: {
          check_in?: string
          check_out?: string
          confirmation_number?: string | null
          created_at?: string
          full_name?: string
          guest_count?: number
          guest_email?: string | null
          guest_id?: string
          guest_phone?: string | null
          hotel_id?: string
          id?: string
          notes?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          room_id?: string
          source?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      cancellation_requests: {
        Row: {
          booking_id: string
          created_at: string | null
          hotel_id: string
          id: string
          reason: string | null
          requested_by: string
          reviewed_by: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string | null
          hotel_id: string
          id?: string
          reason?: string | null
          requested_by: string
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string | null
          hotel_id?: string
          id?: string
          reason?: string | null
          requested_by?: string
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cancellation_requests_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cancellation_requests_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      earnings: {
        Row: {
          booking_id: string | null
          commission_amount: number
          commission_rate: number
          created_at: string
          hotel_id: string
          id: string
          lead_id: string | null
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          commission_amount: number
          commission_rate?: number
          created_at?: string
          hotel_id: string
          id?: string
          lead_id?: string | null
          status?: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          hotel_id?: string
          id?: string
          lead_id?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "earnings_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "earnings_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "earnings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          created_at: string
          email_type: string
          error_message: string | null
          hotel_id: string
          id: string
          recipient_email: string
          status: string
          subject: string
        }
        Insert: {
          created_at?: string
          email_type: string
          error_message?: string | null
          hotel_id: string
          id?: string
          recipient_email: string
          status?: string
          subject: string
        }
        Update: {
          created_at?: string
          email_type?: string
          error_message?: string | null
          hotel_id?: string
          id?: string
          recipient_email?: string
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      guests: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          hotel_id: string
          id: string
          id_number: string | null
          name: string
          phone: string | null
          preferences: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          hotel_id: string
          id?: string
          id_number?: string | null
          name: string
          phone?: string | null
          preferences?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          hotel_id?: string
          id?: string
          id_number?: string | null
          name?: string
          phone?: string | null
          preferences?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guests_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      hotels: {
        Row: {
          about_us: string | null
          about_us_image: string | null
          address: string
          allow_data_clear: boolean
          amenities: string[] | null
          city: string | null
          country: string | null
          created_at: string
          description: string | null
          email: string | null
          facebook_url: string | null
          google_business_url: string | null
          google_maps_url: string | null
          id: string
          images: string[] | null
          instagram_url: string | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          name: string
          owner_id: string
          phone: string | null
          plan_id: string
          seo_description: string | null
          seo_title: string | null
          show_on_landing: boolean
          slug: string | null
          status: Database["public"]["Enums"]["hotel_status"]
          subscription_plan:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          updated_at: string
        }
        Insert: {
          about_us?: string | null
          about_us_image?: string | null
          address: string
          allow_data_clear?: boolean
          amenities?: string[] | null
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          facebook_url?: string | null
          google_business_url?: string | null
          google_maps_url?: string | null
          id?: string
          images?: string[] | null
          instagram_url?: string | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          owner_id: string
          phone?: string | null
          plan_id: string
          seo_description?: string | null
          seo_title?: string | null
          show_on_landing?: boolean
          slug?: string | null
          status?: Database["public"]["Enums"]["hotel_status"]
          subscription_plan?:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          updated_at?: string
        }
        Update: {
          about_us?: string | null
          about_us_image?: string | null
          address?: string
          allow_data_clear?: boolean
          amenities?: string[] | null
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          facebook_url?: string | null
          google_business_url?: string | null
          google_maps_url?: string | null
          id?: string
          images?: string[] | null
          instagram_url?: string | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          owner_id?: string
          phone?: string | null
          plan_id?: string
          seo_description?: string | null
          seo_title?: string | null
          show_on_landing?: boolean
          slug?: string | null
          status?: Database["public"]["Enums"]["hotel_status"]
          subscription_plan?:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotels_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      ical_sync_conflicts: {
        Row: {
          conflicting_booking_id: string | null
          created_at: string
          detected_at: string
          external_check_in: string
          external_check_out: string
          external_description: string | null
          external_summary: string | null
          external_uid: string | null
          feed_id: string
          hotel_id: string
          id: string
          notification_id: string | null
          platform: string
          resolution_notes: string | null
          resolution_status: string
          resolved_at: string | null
          room_id: string
          updated_at: string
        }
        Insert: {
          conflicting_booking_id?: string | null
          created_at?: string
          detected_at?: string
          external_check_in: string
          external_check_out: string
          external_description?: string | null
          external_summary?: string | null
          external_uid?: string | null
          feed_id: string
          hotel_id: string
          id?: string
          notification_id?: string | null
          platform: string
          resolution_notes?: string | null
          resolution_status?: string
          resolved_at?: string | null
          room_id: string
          updated_at?: string
        }
        Update: {
          conflicting_booking_id?: string | null
          created_at?: string
          detected_at?: string
          external_check_in?: string
          external_check_out?: string
          external_description?: string | null
          external_summary?: string | null
          external_uid?: string | null
          feed_id?: string
          hotel_id?: string
          id?: string
          notification_id?: string | null
          platform?: string
          resolution_notes?: string | null
          resolution_status?: string
          resolved_at?: string | null
          room_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_ical_sync_conflicts_room"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ical_sync_conflicts_conflicting_booking_id_fkey"
            columns: ["conflicting_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ical_sync_conflicts_feed_id_fkey"
            columns: ["feed_id"]
            isOneToOne: false
            referencedRelation: "room_ical_feeds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ical_sync_conflicts_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      ical_sync_logs: {
        Row: {
          bookings_created: number | null
          created_at: string
          error_message: string | null
          events_processed: number | null
          feed_id: string
          hotel_id: string
          id: string
          status: string
          sync_duration_ms: number | null
        }
        Insert: {
          bookings_created?: number | null
          created_at?: string
          error_message?: string | null
          events_processed?: number | null
          feed_id: string
          hotel_id: string
          id?: string
          status: string
          sync_duration_ms?: number | null
        }
        Update: {
          bookings_created?: number | null
          created_at?: string
          error_message?: string | null
          events_processed?: number | null
          feed_id?: string
          hotel_id?: string
          id?: string
          status?: string
          sync_duration_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ical_sync_logs_feed_id_fkey"
            columns: ["feed_id"]
            isOneToOne: false
            referencedRelation: "room_ical_feeds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ical_sync_logs_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          check_in: string
          check_out: string
          created_at: string
          email: string
          full_name: string
          guests: number
          hotel_id: string
          id: string
          is_read: boolean
          message: string | null
          phone: string
          room_id: string | null
          status: string
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          check_in: string
          check_out: string
          created_at?: string
          email: string
          full_name: string
          guests?: number
          hotel_id: string
          id?: string
          is_read?: boolean
          message?: string | null
          phone: string
          room_id?: string | null
          status?: string
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          check_in?: string
          check_out?: string
          created_at?: string
          email?: string
          full_name?: string
          guests?: number
          hotel_id?: string
          id?: string
          is_read?: boolean
          message?: string | null
          phone?: string
          room_id?: string | null
          status?: string
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          hotel_id: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          hotel_id: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          hotel_id?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      page_analytics: {
        Row: {
          browser: string | null
          city: string | null
          country: string | null
          created_at: string
          device_type: string | null
          hotel_id: string
          id: string
          page_path: string
          referrer: string | null
          session_id: string
          user_agent: string | null
          visitor_id: string
        }
        Insert: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          hotel_id: string
          id?: string
          page_path: string
          referrer?: string | null
          session_id: string
          user_agent?: string | null
          visitor_id: string
        }
        Update: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          hotel_id?: string
          id?: string
          page_path?: string
          referrer?: string | null
          session_id?: string
          user_agent?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          hotel_id: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          status: Database["public"]["Enums"]["payment_status"]
          stripe_id: string | null
          transaction_date: string
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          hotel_id: string
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_id?: string | null
          transaction_date?: string
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          hotel_id?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_id?: string | null
          transaction_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
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
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: string | null
          created_at: string
          guest_email: string
          hotel_id: string
          id: string
          photo_url: string | null
          rating: number
          review_text: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          guest_email: string
          hotel_id: string
          id?: string
          photo_url?: string | null
          rating: number
          review_text: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          guest_email?: string
          hotel_id?: string
          id?: string
          photo_url?: string | null
          rating?: number
          review_text?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      room_ical_feeds: {
        Row: {
          created_at: string
          feed_url: string
          hotel_id: string
          id: string
          is_active: boolean
          last_synced_at: string | null
          platform: string
          room_id: string
          sync_error: string | null
          sync_status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          feed_url: string
          hotel_id: string
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          platform: string
          room_id: string
          sync_error?: string | null
          sync_status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          feed_url?: string
          hotel_id?: string
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          platform?: string
          room_id?: string
          sync_error?: string | null
          sync_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_ical_feeds_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_ical_feeds_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          amenities: string[] | null
          capacity: number
          created_at: string
          description: string | null
          hotel_id: string
          id: string
          images: string[] | null
          is_available: boolean
          main_photo_url: string | null
          name: string
          price: number
          room_number: string | null
          room_type: string | null
          square_meters: number | null
          status: string | null
          updated_at: string
        }
        Insert: {
          amenities?: string[] | null
          capacity?: number
          created_at?: string
          description?: string | null
          hotel_id: string
          id?: string
          images?: string[] | null
          is_available?: boolean
          main_photo_url?: string | null
          name: string
          price: number
          room_number?: string | null
          room_type?: string | null
          square_meters?: number | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          amenities?: string[] | null
          capacity?: number
          created_at?: string
          description?: string | null
          hotel_id?: string
          id?: string
          images?: string[] | null
          is_available?: boolean
          main_photo_url?: string | null
          name?: string
          price?: number
          room_number?: string | null
          room_type?: string | null
          square_meters?: number | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      smtp_settings: {
        Row: {
          created_at: string
          from_email: string
          from_name: string
          host: string
          id: string
          is_active: boolean
          password: string
          port: number
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          from_email: string
          from_name?: string
          host: string
          id?: string
          is_active?: boolean
          password: string
          port?: number
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          from_email?: string
          from_name?: string
          host?: string
          id?: string
          is_active?: boolean
          password?: string
          port?: number
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          billing_period: string
          created_at: string
          features: string[] | null
          id: string
          is_active: boolean
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          billing_period?: string
          created_at?: string
          features?: string[] | null
          id?: string
          is_active?: boolean
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          billing_period?: string
          created_at?: string
          features?: string[] | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          end_date: string
          hotel_id: string
          id: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          plan_id: string
          start_date: string
          status: Database["public"]["Enums"]["payment_status"]
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          hotel_id: string
          id?: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          plan_id: string
          start_date?: string
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          hotel_id?: string
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          plan_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          created_at: string
          created_by: string
          description: string
          hotel_id: string
          id: string
          priority: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description: string
          hotel_id: string
          id?: string
          priority?: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          hotel_id?: string
          id?: string
          priority?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_replies: {
        Row: {
          attachments: string[] | null
          created_at: string
          id: string
          is_admin_reply: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          attachments?: string[] | null
          created_at?: string
          id?: string
          is_admin_reply?: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Update: {
          attachments?: string[] | null
          created_at?: string
          id?: string
          is_admin_reply?: boolean
          message?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_replies_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      auto_checkout_overdue_bookings: { Args: never; Returns: undefined }
      check_booking_overlap: {
        Args: {
          p_booking_id?: string
          p_check_in: string
          p_check_out: string
          p_room_id: string
        }
        Returns: boolean
      }
      create_review_with_validation: {
        Args: {
          p_confirmation_number: string
          p_hotel_id: string
          p_photo_url: string
          p_rating: number
          p_review: string
          p_title: string
        }
        Returns: string
      }
      get_available_rooms: {
        Args: {
          p_booking_id?: string
          p_check_in: string
          p_check_out: string
          p_hotel_id: string
        }
        Returns: {
          capacity: number
          id: string
          name: string
          price: number
          room_number: string
          room_type: string
        }[]
      }
      get_user_hotel_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      send_booking_confirmation_email:
        | {
            Args: {
              p_check_in: string
              p_check_out: string
              p_confirmation_number: string
              p_guest_email: string
              p_guest_name: string
              p_hotel_id: string
              p_room_name: string
              p_total_amount: number
            }
            Returns: undefined
          }
        | {
            Args: {
              p_check_in: string
              p_check_out: string
              p_guest_email: string
              p_guest_name: string
              p_hotel_id: string
              p_room_name: string
              p_total_amount: number
            }
            Returns: undefined
          }
      send_email_notification: {
        Args: {
          p_email_type: string
          p_hotel_id: string
          p_html_content: string
          p_recipient_email: string
          p_subject: string
        }
        Returns: undefined
      }
      send_lead_approved_email: {
        Args: {
          p_check_in: string
          p_check_out: string
          p_guest_email: string
          p_guest_name: string
          p_guests: number
          p_hotel_id: string
        }
        Returns: undefined
      }
      send_lead_rejected_email: {
        Args: {
          p_check_in: string
          p_check_out: string
          p_guest_email: string
          p_guest_name: string
          p_hotel_id: string
        }
        Returns: undefined
      }
      verify_booking_for_review: {
        Args: { p_confirmation_number: string; p_hotel_id: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "super_admin" | "hotel_admin"
      booking_status:
        | "pending"
        | "reserved"
        | "checked_in"
        | "checked_out"
        | "cancelled"
      hotel_status: "pending" | "active" | "suspended"
      payment_method: "cash" | "card" | "online"
      payment_status: "pending" | "completed" | "failed" | "refunded"
      subscription_plan: "basic" | "pro" | "premium"
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
      app_role: ["super_admin", "hotel_admin"],
      booking_status: [
        "pending",
        "reserved",
        "checked_in",
        "checked_out",
        "cancelled",
      ],
      hotel_status: ["pending", "active", "suspended"],
      payment_method: ["cash", "card", "online"],
      payment_status: ["pending", "completed", "failed", "refunded"],
      subscription_plan: ["basic", "pro", "premium"],
    },
  },
} as const
