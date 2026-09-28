
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Configure a URL e a chave pública do Supabase."
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);
