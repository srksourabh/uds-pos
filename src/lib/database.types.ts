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
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          code: string
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string
          active?: boolean
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
          active: boolean
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          phone?: string | null
          role?: 'admin' | 'engineer'
          bank_id?: string | null
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          phone?: string | null
          role?: 'admin' | 'engineer'
          bank_id?: string | null
          active?: boolean
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
          notes: string
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
          notes?: string
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
          notes?: string
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
          client_address: string
          latitude: number | null
          longitude: number | null
          scheduled_date: string
          assigned_engineer: string | null
          started_at: string | null
          completed_at: string | null
          priority: 'low' | 'medium' | 'high' | 'urgent'
          description: string
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
          client_address: string
          latitude?: number | null
          longitude?: number | null
          scheduled_date: string
          assigned_engineer?: string | null
          started_at?: string | null
          completed_at?: string | null
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          description?: string
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
          client_address?: string
          latitude?: number | null
          longitude?: number | null
          scheduled_date?: string
          assigned_engineer?: string | null
          started_at?: string | null
          completed_at?: string | null
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          description?: string
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
    }
  }
}
