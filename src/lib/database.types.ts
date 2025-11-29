export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      banks: {
        Row: {
          id: string
          name: string
          code: string
          active: boolean
          contact_person: string | null
          contact_email: string | null
          contact_phone: string | null
          address: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          code: string
          active?: boolean
          contact_person?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          address?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string
          active?: boolean
          contact_person?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          address?: string | null
          metadata?: Json
          created_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          phone: string | null
          role: 'admin' | 'engineer'
          bank_id: string | null
          region: string | null
          skills: Json
          status: 'pending_approval' | 'active' | 'suspended' | 'inactive'
          avatar_url: string | null
          last_location_lat: number | null
          last_location_lng: number | null
          last_location_updated_at: string | null
          totp_enabled: boolean
          metadata: Json
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          phone?: string | null
          role?: 'admin' | 'engineer'
          bank_id?: string | null
          region?: string | null
          skills?: Json
          status?: 'pending_approval' | 'active' | 'suspended' | 'inactive'
          avatar_url?: string | null
          last_location_lat?: number | null
          last_location_lng?: number | null
          last_location_updated_at?: string | null
          totp_enabled?: boolean
          metadata?: Json
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          phone?: string | null
          role?: 'admin' | 'engineer'
          bank_id?: string | null
          region?: string | null
          skills?: Json
          status?: 'pending_approval' | 'active' | 'suspended' | 'inactive'
          avatar_url?: string | null
          last_location_lat?: number | null
          last_location_lng?: number | null
          last_location_updated_at?: string | null
          totp_enabled?: boolean
          metadata?: Json
          active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      photos: {
        Row: {
          id: string
          device_id: string
          call_id: string | null
          uploaded_by: string
          photo_type: 'before' | 'after' | 'damage' | 'serial_number' | 'installation'
          storage_path: string
          caption: string | null
          created_at: string
        }
        Insert: {
          id?: string
          device_id: string
          call_id?: string | null
          uploaded_by: string
          photo_type: 'before' | 'after' | 'damage' | 'serial_number' | 'installation'
          storage_path: string
          caption?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          device_id?: string
          call_id?: string | null
          uploaded_by?: string
          photo_type?: 'before' | 'after' | 'damage' | 'serial_number' | 'installation'
          storage_path?: string
          caption?: string | null
          created_at?: string
        }
      }
      devices: {
        Row: {
          id: string
          serial_number: string
          model: string
          device_bank: string
          status: 'warehouse' | 'issued' | 'installed' | 'faulty' | 'returned'
          assigned_to: string | null
          installed_at_client: string | null
          installation_date: string | null
          warranty_expiry: string | null
          firmware_version: string | null
          last_maintenance_date: string | null
          notes: string
          metadata: Json
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          serial_number: string
          model: string
          device_bank: string
          status?: 'warehouse' | 'issued' | 'installed' | 'faulty' | 'returned'
          assigned_to?: string | null
          installed_at_client?: string | null
          installation_date?: string | null
          warranty_expiry?: string | null
          firmware_version?: string | null
          last_maintenance_date?: string | null
          notes?: string
          metadata?: Json
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          serial_number?: string
          model?: string
          device_bank?: string
          status?: 'warehouse' | 'issued' | 'installed' | 'faulty' | 'returned'
          assigned_to?: string | null
          installed_at_client?: string | null
          installation_date?: string | null
          warranty_expiry?: string | null
          firmware_version?: string | null
          last_maintenance_date?: string | null
          notes?: string
          metadata?: Json
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      calls: {
        Row: {
          id: string
          call_number: string
          type: 'install' | 'swap' | 'deinstall' | 'maintenance' | 'breakdown'
          status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
          client_bank: string
          client_name: string
          client_contact: string | null
          client_phone: string | null
          client_address: string
          latitude: number | null
          longitude: number | null
          scheduled_date: string
          scheduled_time_window: string | null
          assigned_engineer: string | null
          started_at: string | null
          completed_at: string | null
          priority: 'low' | 'medium' | 'high' | 'urgent'
          description: string
          resolution_notes: string | null
          estimated_duration_minutes: number | null
          actual_duration_minutes: number | null
          requires_photo: boolean
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          call_number: string
          type: 'install' | 'swap' | 'deinstall' | 'maintenance' | 'breakdown'
          status?: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
          client_bank: string
          client_name: string
          client_contact?: string | null
          client_phone?: string | null
          client_address: string
          latitude?: number | null
          longitude?: number | null
          scheduled_date: string
          scheduled_time_window?: string | null
          assigned_engineer?: string | null
          started_at?: string | null
          completed_at?: string | null
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          description?: string
          resolution_notes?: string | null
          estimated_duration_minutes?: number | null
          actual_duration_minutes?: number | null
          requires_photo?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          call_number?: string
          type?: 'install' | 'swap' | 'deinstall' | 'maintenance' | 'breakdown'
          status?: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
          client_bank?: string
          client_name?: string
          client_contact?: string | null
          client_phone?: string | null
          client_address?: string
          latitude?: number | null
          longitude?: number | null
          scheduled_date?: string
          scheduled_time_window?: string | null
          assigned_engineer?: string | null
          started_at?: string | null
          completed_at?: string | null
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          description?: string
          resolution_notes?: string | null
          estimated_duration_minutes?: number | null
          actual_duration_minutes?: number | null
          requires_photo?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      call_devices: {
        Row: {
          id: string
          call_id: string
          device_id: string
          action: string
          created_at: string
        }
        Insert: {
          id?: string
          call_id: string
          device_id: string
          action: string
          created_at?: string
        }
        Update: {
          id?: string
          call_id?: string
          device_id?: string
          action?: string
          created_at?: string
        }
      }
      inventory_movements: {
        Row: {
          id: string
          device_id: string
          from_status: string
          to_status: string
          from_engineer: string | null
          to_engineer: string | null
          call_id: string | null
          actor_id: string
          reason: string
          notes: string
          created_at: string
        }
        Insert: {
          id?: string
          device_id: string
          from_status: string
          to_status: string
          from_engineer?: string | null
          to_engineer?: string | null
          call_id?: string | null
          actor_id: string
          reason: string
          notes?: string
          created_at?: string
        }
        Update: {
          id?: string
          device_id?: string
          from_status?: string
          to_status?: string
          from_engineer?: string | null
          to_engineer?: string | null
          call_id?: string | null
          actor_id?: string
          reason?: string
          notes?: string
          created_at?: string
        }
      }
      call_history: {
        Row: {
          id: string
          call_id: string
          from_status: string
          to_status: string
          actor_id: string
          notes: string
          created_at: string
        }
        Insert: {
          id?: string
          call_id: string
          from_status: string
          to_status: string
          actor_id: string
          notes?: string
          created_at?: string
        }
        Update: {
          id?: string
          call_id?: string
          from_status?: string
          to_status?: string
          actor_id?: string
          notes?: string
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: string
          read: boolean
          link: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type?: string
          read?: boolean
          link?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: string
          read?: boolean
          link?: string | null
          created_at?: string
        }
      }
      stock_movements: {
        Row: {
          id: string
          device_id: string
          movement_type: 'status_change' | 'assignment' | 'transfer' | 'return' | 'issuance'
          from_status: string
          to_status: string
          from_engineer: string | null
          to_engineer: string | null
          from_location: string | null
          to_location: string | null
          quantity: number
          call_id: string | null
          actor_id: string
          reason: string
          notes: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          device_id: string
          movement_type: 'status_change' | 'assignment' | 'transfer' | 'return' | 'issuance'
          from_status: string
          to_status: string
          from_engineer?: string | null
          to_engineer?: string | null
          from_location?: string | null
          to_location?: string | null
          quantity?: number
          call_id?: string | null
          actor_id: string
          reason: string
          notes?: string
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          device_id?: string
          movement_type?: 'status_change' | 'assignment' | 'transfer' | 'return' | 'issuance'
          from_status?: string
          to_status?: string
          from_engineer?: string | null
          to_engineer?: string | null
          from_location?: string | null
          to_location?: string | null
          quantity?: number
          call_id?: string | null
          actor_id?: string
          reason?: string
          notes?: string
          metadata?: Json
          created_at?: string
        }
      }
      engineer_aggregates: {
        Row: {
          id: string
          engineer_id: string
          period_type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'all_time'
          period_start: string
          period_end: string
          total_calls_assigned: number
          total_calls_completed: number
          total_calls_cancelled: number
          total_calls_in_progress: number
          completion_rate: number | null
          average_resolution_time_minutes: number | null
          on_time_completion_rate: number | null
          total_devices_installed: number
          total_devices_swapped: number
          total_devices_deinstalled: number
          total_distance_traveled_km: number | null
          calls_by_type: Json
          calls_by_priority: Json
          calls_by_bank: Json
          performance_score: number | null
          customer_satisfaction_avg: number | null
          total_photos_uploaded: number
          metadata: Json
          last_calculated_at: string
          created_at: string
        }
        Insert: {
          id?: string
          engineer_id: string
          period_type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'all_time'
          period_start: string
          period_end: string
          total_calls_assigned?: number
          total_calls_completed?: number
          total_calls_cancelled?: number
          total_calls_in_progress?: number
          completion_rate?: number | null
          average_resolution_time_minutes?: number | null
          on_time_completion_rate?: number | null
          total_devices_installed?: number
          total_devices_swapped?: number
          total_devices_deinstalled?: number
          total_distance_traveled_km?: number | null
          calls_by_type?: Json
          calls_by_priority?: Json
          calls_by_bank?: Json
          performance_score?: number | null
          customer_satisfaction_avg?: number | null
          total_photos_uploaded?: number
          metadata?: Json
          last_calculated_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          engineer_id?: string
          period_type?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'all_time'
          period_start?: string
          period_end?: string
          total_calls_assigned?: number
          total_calls_completed?: number
          total_calls_cancelled?: number
          total_calls_in_progress?: number
          completion_rate?: number | null
          average_resolution_time_minutes?: number | null
          on_time_completion_rate?: number | null
          total_devices_installed?: number
          total_devices_swapped?: number
          total_devices_deinstalled?: number
          total_distance_traveled_km?: number | null
          calls_by_type?: Json
          calls_by_priority?: Json
          calls_by_bank?: Json
          performance_score?: number | null
          customer_satisfaction_avg?: number | null
          total_photos_uploaded?: number
          metadata?: Json
          last_calculated_at?: string
          created_at?: string
        }
      }
      stock_alerts: {
        Row: {
          id: string
          alert_type: 'low_stock' | 'device_overdue' | 'faulty_device' | 'missing_device' | 'warranty_expiring' | 'maintenance_due' | 'engineer_idle' | 'call_overdue'
          severity: 'info' | 'warning' | 'critical' | 'urgent'
          bank_id: string | null
          device_id: string | null
          call_id: string | null
          engineer_id: string | null
          title: string
          message: string
          threshold_value: number | null
          current_value: number | null
          status: 'active' | 'acknowledged' | 'resolved' | 'dismissed'
          acknowledged_by: string | null
          acknowledged_at: string | null
          resolved_by: string | null
          resolved_at: string | null
          resolution_notes: string | null
          auto_generated: boolean
          expires_at: string | null
          notification_sent: boolean
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          alert_type: 'low_stock' | 'device_overdue' | 'faulty_device' | 'missing_device' | 'warranty_expiring' | 'maintenance_due' | 'engineer_idle' | 'call_overdue'
          severity?: 'info' | 'warning' | 'critical' | 'urgent'
          bank_id?: string | null
          device_id?: string | null
          call_id?: string | null
          engineer_id?: string | null
          title: string
          message: string
          threshold_value?: number | null
          current_value?: number | null
          status?: 'active' | 'acknowledged' | 'resolved' | 'dismissed'
          acknowledged_by?: string | null
          acknowledged_at?: string | null
          resolved_by?: string | null
          resolved_at?: string | null
          resolution_notes?: string | null
          auto_generated?: boolean
          expires_at?: string | null
          notification_sent?: boolean
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          alert_type?: 'low_stock' | 'device_overdue' | 'faulty_device' | 'missing_device' | 'warranty_expiring' | 'maintenance_due' | 'engineer_idle' | 'call_overdue'
          severity?: 'info' | 'warning' | 'critical' | 'urgent'
          bank_id?: string | null
          device_id?: string | null
          call_id?: string | null
          engineer_id?: string | null
          title?: string
          message?: string
          threshold_value?: number | null
          current_value?: number | null
          status?: 'active' | 'acknowledged' | 'resolved' | 'dismissed'
          acknowledged_by?: string | null
          acknowledged_at?: string | null
          resolved_by?: string | null
          resolved_at?: string | null
          resolution_notes?: string | null
          auto_generated?: boolean
          expires_at?: string | null
          notification_sent?: boolean
          metadata?: Json
          created_at?: string
        }
      }
    }
  }
}
