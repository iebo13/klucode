// Faithful, hand-maintained mirror of supabase/migrations/*.sql. In a project
// with the Supabase CLI wired to a real project this is regenerated with
// `npm run db:types` (supabase gen types). Kept in sync by hand here so the
// data layer is type-safe end to end without a live connection.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      staff: {
        Row: {
          id: string;
          name: string;
          role: Database['public']['Enums']['staff_role'];
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          role?: Database['public']['Enums']['staff_role'];
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          role?: Database['public']['Enums']['staff_role'];
          created_at?: string;
        };
        Relationships: [];
      };
      customers: {
        Row: {
          id: string;
          name: string;
          phone: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          phone?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          phone?: string | null;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'customers_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'staff';
            referencedColumns: ['id'];
          },
        ];
      };
      events: {
        Row: {
          id: string;
          customer_id: string;
          type: Database['public']['Enums']['event_type'];
          amount_cents: number;
          label: string | null;
          method: string | null;
          created_by: string;
          created_at: string;
          voided_by: string | null;
          voided_at: string | null;
        };
        Insert: {
          id?: string;
          customer_id: string;
          type: Database['public']['Enums']['event_type'];
          amount_cents: number;
          label?: string | null;
          method?: string | null;
          created_by: string;
          created_at?: string;
          voided_by?: string | null;
          voided_at?: string | null;
        };
        Update: {
          id?: string;
          customer_id?: string;
          type?: Database['public']['Enums']['event_type'];
          amount_cents?: number;
          label?: string | null;
          method?: string | null;
          created_by?: string;
          created_at?: string;
          voided_by?: string | null;
          voided_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'events_customer_id_fkey';
            columns: ['customer_id'];
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'events_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'staff';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'events_voided_by_fkey';
            columns: ['voided_by'];
            referencedRelation: 'staff';
            referencedColumns: ['id'];
          },
        ];
      };
      cafe_settings: {
        Row: {
          id: boolean;
          cafe_name: string;
          currency: string;
          time_zone: string;
          alert_enabled: boolean;
          alert_threshold_cents: number;
        };
        Insert: {
          id?: boolean;
          cafe_name?: string;
          currency?: string;
          time_zone?: string;
          alert_enabled?: boolean;
          alert_threshold_cents?: number;
        };
        Update: {
          cafe_name?: string;
          currency?: string;
          time_zone?: string;
          alert_enabled?: boolean;
          alert_threshold_cents?: number;
        };
        Relationships: [];
      };
    };
    Views: {
      customer_balances: {
        Row: {
          customer_id: string | null;
          balance_cents: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      current_staff_role: {
        Args: Record<PropertyKey, never>;
        Returns: Database['public']['Enums']['staff_role'];
      };
      report_range: {
        Args: { days: number };
        Returns: { day: string; charged_cents: number; collected_cents: number }[];
      };
      today_totals: {
        Args: Record<PropertyKey, never>;
        Returns: { collected_today_cents: number; charged_today_cents: number }[];
      };
      export_events: {
        Args: Record<PropertyKey, never>;
        Returns: {
          event_id: string;
          customer_name: string;
          type: Database['public']['Enums']['event_type'];
          amount_cents: number;
          label: string | null;
          method: string | null;
          recorded_by: string;
          recorded_at: string;
          voided_by: string | null;
          voided_at: string | null;
        }[];
      };
    };
    Enums: {
      staff_role: 'owner' | 'manager' | 'employee';
      event_type: 'charge' | 'payment';
    };
    CompositeTypes: Record<PropertyKey, never>;
  };
};
