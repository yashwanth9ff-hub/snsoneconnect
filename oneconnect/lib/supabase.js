import { createClient } from '@supabase/supabase-js';

// The anon key is safe in the browser: all access is limited by row level security
// and the workflow functions in supabase/schema.sql.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
