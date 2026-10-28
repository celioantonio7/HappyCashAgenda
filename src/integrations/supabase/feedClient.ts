import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './client';
import type { Database } from './types';
export type FeedPost = {
 id: string; store_account_id: string; owner_user_id: string; title: string; body: string;
 category: string; image_url: string; published: boolean; deleted_at: string | null;
 created_at: string; updated_at: string;
};
type FeedDatabase = Omit<Database, 'public'> & { public: Omit<Database['public'], 'Tables'> & { Tables: Database['public']['Tables'] & { agenda_feed_posts: {
 Row: FeedPost;
 Insert: Omit<FeedPost, 'id' | 'created_at' | 'updated_at' | 'deleted_at'> & { id?: string; deleted_at?: string | null };
 Update: Partial<FeedPost>;
 Relationships: [];
} } } };
export const feedClient = supabase as unknown as SupabaseClient<FeedDatabase>;
