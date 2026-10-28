import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './client';
import type { Database } from './types';

type NotificationRow = {
  id: string; recipient_id: string; store_account_id: string; appointment_id: string | null;
  event_type: 'scheduled' | 'rescheduled' | 'cancelled' | 'completed' | 'new_client' | 'reminder';
  title: string; description: string; created_at: string; read_at: string | null;
};
type NotificationDatabase = Omit<Database, 'public'> & {
  public: Omit<Database['public'], 'Tables' | 'Functions'> & {
    Functions: Database['public']['Functions'] & {
      register_agenda_push: { Args: { p_store_account_id: string; p_subscription: import('./types').Json; p_barber_id?: string; p_session_token?: string }; Returns: string };
      unregister_agenda_push: { Args: { p_endpoint: string; p_barber_id?: string; p_session_token?: string }; Returns: undefined };
    };
    Tables: Database['public']['Tables'] & {
      agenda_notifications: {
        Row: NotificationRow;
        Insert: never;
        Update: { read_at?: string | null };
        Relationships: [];
      };
    };
  };
};
export const notificationClient = supabase as unknown as SupabaseClient<NotificationDatabase>;
