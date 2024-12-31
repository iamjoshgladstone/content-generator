import { createClient } from '@supabase/supabase-js';

// Use Vite's environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL and SUPABASE_KEY must be set');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
