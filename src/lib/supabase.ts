import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bmsjgqxpqammehuitnsv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtc2pncXhwcWFtbWVodWl0bnN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NjkwMjcsImV4cCI6MjA4NjE0NTAyN30.HbWhAir4kWWALGglu_AjSjJwV3bK-LbpmDYPS0PMh4I';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);