export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Role type used across the application
export type UserRole = 'super_admin' | 'senior_manager' | 'manager' | 'coordinator' | 'stock_coordinator' | 'engineer' | 'admin'

// Pincode service priority
export type ServicePriority = 'low' | 'normal' | 'high' | 'priority'

// Status types
export type UserStatus = 'pending_approval' | 'active' | 'suspended' | 'inactive'
export type DeviceStatus = 'warehouse' | 'issued' | 'installed' | 'faulty' | 'returned' | 'in_transit' | 'field_return'
export type CallStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
export type CallType = 'install' | 'swap' | 'deinstall' | 'maintenance' | 'breakdown'
export type Priority = 'low' | 'medium' | 'high' | 'urgent'

// Problem code categories
export type ProblemCodeCategory = 'Hardware' | 'Software' | 'Network' | 'Installation' | 'Maintenance'

export type Database = {
  public: {
    Tables: {
      banks: {
        Row: {
          id: string
          name: string
          code: string
          // Aliases for compatibility
          bank_name?: string
          bank_code?: string
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
        Relationships: []
      }
      problem_codes: {
        Row: {
          id: string
          code: string
          description: string
          category: ProblemCodeCategory
          is_active: boolean
          default_sla_hours: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          description: string
          category: ProblemCodeCategory
          is_active?: boolean
          default_sla_hours?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          description?: string
          category?: ProblemCodeCategory
          is_active?: boolean
          default_sla_hours?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      expense_types: {
        Row: {
          id: string
          name: string
          description: string
          is_active: boolean
          requires_receipt: boolean
          max_amount: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          is_active?: boolean
          requires_receipt?: boolean
          max_amount?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          is_active?: boolean
          requires_receipt?: boolean
          max_amount?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          id: string
          call_id: string | null
          engineer_id: string
          amount: number
          expense_type: string
          reason: string
          receipt_photo_url: string | null
          status: 'pending' | 'approved' | 'rejected'
          approved_by: string | null
          approved_at: string | null
          rejection_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          call_id?: string | null
          engineer_id: string
          amount: number
          expense_type: string
          reason: string
          receipt_photo_url?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          approved_by?: string | null
          approved_at?: string | null
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          call_id?: string | null
          engineer_id?: string
          amount?: number
          expense_type?: string
          reason?: string
          receipt_photo_url?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          approved_by?: string | null
          approved_at?: string | null
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_call_id_fkey"
            columns: ["call_id"]
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_engineer_id_fkey"
            columns: ["engineer_id"]
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_approved_by_fkey"
            columns: ["approved_by"]
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      user_profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          phone: string | null
          role: UserRole
          bank_id: string | null
          region: string | null
          skills: Json
          status: UserStatus
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
          role?: UserRole
          bank_id?: string | null
          region?: string | null
          skills?: Json
          status?: UserStatus
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
          role?: UserRole
          bank_id?: string | null
          region?: string | null
          skills?: Json
          status?: UserStatus
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
        Relationships: [
          {
            foreignKeyName: "user_profiles_bank_id_fkey"
            columns: ["bank_id"]
            referencedRelation: "banks"
            referencedColumns: ["id"]
          }
        ]
      }
      photos: {
        Row: {
          id: string
          device_id: string | null
          call_id: string | null
          related_call: string | null
          related_device: string | null
          uploaded_by: string | null
          photo_type: string
          photo_url: string | null
          storage_path: string | null
          caption: string | null
          notes: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          device_id?: string | null
          call_id?: string | null
          related_call?: string | null
          related_device?: string | null
          uploaded_by?: string | null
          photo_type: string
          photo_url?: string | null
          storage_path?: string | null
          caption?: string | null
          notes?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          device_id?: string | null
          call_id?: string | null
          related_call?: string | null
          related_device?: string | null
          uploaded_by?: string | null
          photo_type?: string
          photo_url?: string | null
          storage_path?: string | null
          caption?: string | null
          notes?: string | null
          metadata?: Json
          created_at?: string
        }
        Relationships: []
      }
      devices: {
        Row: {
          id: string
          serial_number: string
          model: string
          device_bank: string
          status: DeviceStatus
          current_location: string | null
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
          // Phase 2: Enhanced Device Tracking Fields (Step 1.2)
          old_serial_number: string | null
          old_sim_number: string | null
          new_sim_number: string | null
          used_for_tid: string | null
          used_for_mid: string | null
          used_for_ticket: string | null
          receiving_date: string | null
          used_date: string | null
          ageing_days: number | null
        }
        Insert: {
          id?: string
          serial_number: string
          model: string
          device_bank: string
          status?: DeviceStatus
          current_location?: string | null
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
          // Phase 2: Enhanced Device Tracking Fields (Step 1.2)
          old_serial_number?: string | null
          old_sim_number?: string | null
          new_sim_number?: string | null
          used_for_tid?: string | null
          used_for_mid?: string | null
          used_for_ticket?: string | null
          receiving_date?: string | null
          used_date?: string | null
        }
        Update: {
          id?: string
          serial_number?: string
          model?: string
          device_bank?: string
          status?: DeviceStatus
          current_location?: string | null
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
          // Phase 2: Enhanced Device Tracking Fields (Step 1.2)
          old_serial_number?: string | null
          old_sim_number?: string | null
          new_sim_number?: string | null
          used_for_tid?: string | null
          used_for_mid?: string | null
          used_for_ticket?: string | null
          receiving_date?: string | null
          used_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devices_device_bank_fkey"
            columns: ["device_bank"]
            referencedRelation: "banks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devices_assigned_to_fkey"
            columns: ["assigned_to"]
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      calls: {
        Row: {
          id: string
          call_number: string
          type: CallType
          status: CallStatus
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
          priority: Priority
          description: string
          resolution_notes: string | null
          estimated_duration_minutes: number | null
          actual_duration_minutes: number | null
          requires_photo: boolean
          metadata: Json
          created_at: string
          updated_at: string
          // Phase 2: SLA and Problem Code Fields (Step 1.3)
          old_serial_number: string | null
          old_sim_number: string | null
          new_sim_number: string | null
          visit_count: number
          problem_code: string | null
          sla_hours: number | null
          sla_due_date: string | null
          system_sync_date: string | null
          todays_poa_date: string | null
          action_taken: string | null
          distance_covered: number
        }
        Insert: {
          id?: string
          call_number: string
          type: CallType
          status?: CallStatus
          client_bank: string
          client_name: string
          client_contact?: string | null
          client_phone?: string | null
          client_address: string
          latitude?: number | null
          longitude?: number | null
          scheduled_date?: string | null
          scheduled_time_window?: string | null
          assigned_engineer?: string | null
          started_at?: string | null
          completed_at?: string | null
          priority?: Priority
          description?: string
          resolution_notes?: string | null
          estimated_duration_minutes?: number | null
          actual_duration_minutes?: number | null
          requires_photo?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
          // Phase 2: SLA and Problem Code Fields (Step 1.3)
          old_serial_number?: string | null
          old_sim_number?: string | null
          new_sim_number?: string | null
          visit_count?: number
          problem_code?: string | null
          sla_hours?: number | null
          sla_due_date?: string | null
          system_sync_date?: string | null
          todays_poa_date?: string | null
          action_taken?: string | null
          distance_covered?: number
        }
        Update: {
          id?: string
          call_number?: string
          type?: CallType
          status?: CallStatus
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
          priority?: Priority
          description?: string
          resolution_notes?: string | null
          estimated_duration_minutes?: number | null
          actual_duration_minutes?: number | null
          requires_photo?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
          // Phase 2: SLA and Problem Code Fields (Step 1.3)
          old_serial_number?: string | null
          old_sim_number?: string | null
          new_sim_number?: string | null
          visit_count?: number
          problem_code?: string | null
          sla_hours?: number | null
          sla_due_date?: string | null
          system_sync_date?: string | null
          todays_poa_date?: string | null
          action_taken?: string | null
          distance_covered?: number
        }
        Relationships: [
          {
            foreignKeyName: "calls_client_bank_fkey"
            columns: ["client_bank"]
            referencedRelation: "banks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_assigned_engineer_fkey"
            columns: ["assigned_engineer"]
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          }
        ]
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
      user_permissions: {
        Row: {
          id: string
          user_id: string
          module_name: string
          can_view: boolean
          can_create: boolean
          can_edit: boolean
          can_delete: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          module_name: string
          can_view?: boolean
          can_create?: boolean
          can_edit?: boolean
          can_delete?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          module_name?: string
          can_view?: boolean
          can_create?: boolean
          can_edit?: boolean
          can_delete?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      warehouses: {
        Row: {
          id: string
          name: string
          code: string
          address: string | null
          contact_person: string | null
          contact_phone: string | null
          contact_email: string | null
          manager_name: string | null
          manager_phone: string | null
          office_type: string | null
          city: string | null
          state: string | null
          pincode: string | null
          capacity: number | null
          current_stock: number | null
          region_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          code: string
          address?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          contact_email?: string | null
          manager_name?: string | null
          manager_phone?: string | null
          office_type?: string | null
          city?: string | null
          state?: string | null
          pincode?: string | null
          capacity?: number | null
          current_stock?: number | null
          region_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string
          address?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          contact_email?: string | null
          manager_name?: string | null
          manager_phone?: string | null
          office_type?: string | null
          city?: string | null
          state?: string | null
          pincode?: string | null
          capacity?: number | null
          current_stock?: number | null
          region_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_region_id_fkey"
            columns: ["region_id"]
            referencedRelation: "regions"
            referencedColumns: ["id"]
          }
        ]
      }
      couriers: {
        Row: {
          id: string
          name: string
          code: string
          contact_person: string | null
          contact_phone: string | null
          contact_email: string | null
          billing_address: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          code: string
          contact_person?: string | null
          contact_phone?: string | null
          contact_email?: string | null
          billing_address?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string
          contact_person?: string | null
          contact_phone?: string | null
          contact_email?: string | null
          billing_address?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      regions: {
        Row: {
          id: string
          name: string
          code: string | null
          contact_person_name: string | null
          contact_email: string | null
          contact_phone: string | null
          manager_name: string | null
          manager_phone: string | null
          address: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          code?: string | null
          contact_person_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          manager_name?: string | null
          manager_phone?: string | null
          address?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string | null
          contact_person_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          manager_name?: string | null
          manager_phone?: string | null
          address?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      shipments: {
        Row: {
          id: string
          tracking_number: string
          courier_id: string | null
          device_ids: string[]
          source_type: 'warehouse' | 'engineer' | 'bank'
          destination_type: 'warehouse' | 'engineer' | 'bank' | 'client'
          from_warehouse_id: string | null
          to_warehouse_id: string | null
          to_engineer_id: string | null
          status: 'pending' | 'in_transit' | 'delivered' | 'cancelled' | 'returned'
          shipped_at: string | null
          delivered_at: string | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tracking_number: string
          courier_id?: string | null
          device_ids?: string[]
          source_type?: 'warehouse' | 'engineer' | 'bank'
          destination_type?: 'warehouse' | 'engineer' | 'bank' | 'client'
          from_warehouse_id?: string | null
          to_warehouse_id?: string | null
          to_engineer_id?: string | null
          status?: 'pending' | 'in_transit' | 'delivered' | 'cancelled' | 'returned'
          shipped_at?: string | null
          delivered_at?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tracking_number?: string
          courier_id?: string | null
          device_ids?: string[]
          source_type?: 'warehouse' | 'engineer' | 'bank'
          destination_type?: 'warehouse' | 'engineer' | 'bank' | 'client'
          from_warehouse_id?: string | null
          to_warehouse_id?: string | null
          to_engineer_id?: string | null
          status?: 'pending' | 'in_transit' | 'delivered' | 'cancelled' | 'returned'
          shipped_at?: string | null
          delivered_at?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      shipment_devices: {
        Row: {
          id: string
          shipment_id: string
          device_id: string
          created_at: string
        }
        Insert: {
          id?: string
          shipment_id: string
          device_id: string
          created_at?: string
        }
        Update: {
          id?: string
          shipment_id?: string
          device_id?: string
          created_at?: string
        }
        Relationships: []
      }
      idempotency_keys: {
        Row: {
          key: string
          response: Json | null
          created_at: string
          expires_at: string
        }
        Insert: {
          key: string
          response?: Json | null
          created_at?: string
          expires_at: string
        }
        Update: {
          key?: string
          response?: Json | null
          created_at?: string
          expires_at?: string
        }
        Relationships: []
      }
      modules: {
        Row: {
          id: string
          name: string
          display_name: string
          icon: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          display_name: string
          icon?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          display_name?: string
          icon?: string
          created_at?: string
        }
        Relationships: []
      }
      engineer_locations: {
        Row: {
          user_id: string
          full_name: string
          phone: string | null
          latitude: number | null
          longitude: number | null
          is_active: boolean
          last_location_updated_at: string | null
        }
        Insert: {
          user_id: string
          full_name: string
          phone?: string | null
          latitude?: number | null
          longitude?: number | null
          is_active?: boolean
          last_location_updated_at?: string | null
        }
        Update: {
          user_id?: string
          full_name?: string
          phone?: string | null
          latitude?: number | null
          longitude?: number | null
          is_active?: boolean
          last_location_updated_at?: string | null
        }
        Relationships: []
      }
      // Phase 2: Pincode Master
      pincode_master: {
        Row: {
          id: string
          pincode: string
          area_name: string | null
          city: string
          district: string | null
          state: string
          region: string
          sla_hours: number
          primary_coordinator_id: string | null
          warehouse_id: string | null
          is_serviceable: boolean
          service_priority: ServicePriority
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          pincode: string
          area_name?: string | null
          city: string
          district?: string | null
          state: string
          region: string
          sla_hours?: number
          primary_coordinator_id?: string | null
          warehouse_id?: string | null
          is_serviceable?: boolean
          service_priority?: ServicePriority
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          pincode?: string
          area_name?: string | null
          city?: string
          district?: string | null
          state?: string
          region?: string
          sla_hours?: number
          primary_coordinator_id?: string | null
          warehouse_id?: string | null
          is_serviceable?: boolean
          service_priority?: ServicePriority
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pincode_master_primary_coordinator_id_fkey"
            columns: ["primary_coordinator_id"]
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pincode_master_warehouse_id_fkey"
            columns: ["warehouse_id"]
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_permission: {
        Args: {
          module_name: string
          permission_type: 'view' | 'create' | 'edit' | 'delete'
        }
        Returns: boolean
      }
      get_user_permissions: {
        Args: {
          target_user_id: string
        }
        Returns: {
          module_name: string
          can_view: boolean
          can_create: boolean
          can_edit: boolean
          can_delete: boolean
        }[]
      }
      set_user_permission: {
        Args: {
          target_user_id: string
          module_name: string
          p_can_view: boolean
          p_can_create: boolean
          p_can_edit: boolean
          p_can_delete: boolean
        }
        Returns: void
      }
      delete_user_permission: {
        Args: {
          target_user_id: string
          module_name: string
        }
        Returns: void
      }
      get_my_profile: {
        Args: Record<string, never>
        Returns: {
          id: string
          email: string
          full_name: string
          phone: string | null
          role: UserRole
          bank_id: string | null
          region: string | null
          skills: Json
          status: UserStatus
          avatar_url: string | null
          last_location_lat: number | null
          last_location_lng: number | null
          last_location_updated_at: string | null
          totp_enabled: boolean
          metadata: Json
          active: boolean
          created_at: string
          updated_at: string
        }[]
      }
      upsert_my_profile: {
        Args: {
          p_email: string
          p_full_name: string
          p_phone?: string | null
          p_role?: UserRole
          p_status?: UserStatus
        }
        Returns: {
          id: string
          email: string
          full_name: string
          role: UserRole
          status: UserStatus
        }[]
      }
      get_user_modules: {
        Args: {
          target_user_id: string
        }
        Returns: {
          module_name: string
          can_view: boolean
          can_create: boolean
          can_edit: boolean
          can_delete: boolean
        }[]
      }
      has_module_access: {
        Args: {
          target_user_id: string
          module_name: string
        }
        Returns: boolean
      }
      grant_all_permissions: {
        Args: {
          target_user_id: string
        }
        Returns: void
      }
      grant_module_permission: {
        Args: {
          target_user_id: string
          module_name: string
          p_can_view?: boolean
          p_can_create?: boolean
          p_can_edit?: boolean
          p_can_delete?: boolean
        }
        Returns: void
      }
      revoke_module_permission: {
        Args: {
          target_user_id: string
          module_name: string
        }
        Returns: void
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

// Helper types for easier usage
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Commonly used types
export type Bank = Tables<'banks'>
export type UserProfile = Tables<'user_profiles'>
export type Device = Tables<'devices'>
export type Call = Tables<'calls'>
export type CallDevice = Tables<'call_devices'>
export type Photo = Tables<'photos'>
export type StockMovement = Tables<'stock_movements'>
export type StockAlert = Tables<'stock_alerts'>
export type EngineerAggregate = Tables<'engineer_aggregates'>
export type Notification = Tables<'notifications'>
export type UserPermission = Tables<'user_permissions'>
export type Warehouse = Tables<'warehouses'>
export type Courier = Tables<'couriers'>
export type Region = Tables<'regions'>
export type Shipment = Tables<'shipments'>
export type ShipmentDevice = Tables<'shipment_devices'>
export type Module = Tables<'modules'>
export type EngineerLocation = Tables<'engineer_locations'>
export type PincodeMaster = Tables<'pincode_master'>
export type ProblemCode = Tables<'problem_codes'>
export type ExpenseType = Tables<'expense_types'>
export type Expense = Tables<'expenses'>

// Extended types with relationships
export interface DeviceWithBank extends Device {
  banks: Pick<Bank, 'id' | 'name' | 'code'> | null
}

export interface CallWithRelations extends Call {
  banks?: Pick<Bank, 'id' | 'name' | 'code'> | null
  user_profiles?: Pick<UserProfile, 'id' | 'full_name' | 'phone'> | null
  call_devices?: CallDevice[]
}

export interface UserProfileWithBank extends UserProfile {
  banks?: Pick<Bank, 'id' | 'name' | 'code'> | null
}

// Phase 2: Extended Pincode type with coordinator
export interface PincodeMasterWithCoordinator extends PincodeMaster {
  coordinator?: Pick<UserProfile, 'id' | 'full_name' | 'phone' | 'email'> | null
}

// Phase 2: Call with SLA computed fields (Step 1.3)
export interface CallWithSLA extends Call {
  ageing_days?: number
  is_overdue?: boolean
  hours_remaining?: number | null
  problem_code_details?: ProblemCode | null
  bank?: Pick<Bank, 'id' | 'name' | 'code'> | null
  engineer?: Pick<UserProfile, 'id' | 'full_name' | 'phone'> | null
}

// Phase 2: Expense with details (Step 1.4)
export interface ExpenseWithDetails extends Expense {
  engineer?: Pick<UserProfile, 'id' | 'full_name' | 'phone' | 'email'> | null
  call?: Pick<Call, 'id' | 'call_number' | 'client_name'> | null
  approver?: Pick<UserProfile, 'id' | 'full_name'> | null
  expense_type_details?: ExpenseType | null
}

// Phase 2: Region and Warehouse relationship types
export interface WarehouseWithRegion extends Warehouse {
  region?: Pick<Region, 'id' | 'name' | 'code'> | null
}

export interface RegionWithWarehouses extends Region {
  warehouses?: Warehouse[]
}

// Phase 2: Pincode with Warehouse relationship
export interface PincodeMasterWithWarehouse extends PincodeMaster {
  coordinator?: Pick<UserProfile, 'id' | 'full_name' | 'phone' | 'email'> | null
  warehouse?: Pick<Warehouse, 'id' | 'name' | 'code'> | null
}

// Courier with full details
export interface CourierWithDetails extends Courier {
  // Future: can add shipments count, etc.
}
