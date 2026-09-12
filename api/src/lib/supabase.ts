import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function getEnvironmentVariable(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`A variável ${name} não foi configurada.`);
  }

  return value;
}

export function createUserSupabaseClient(accessToken: string): SupabaseClient {
  const supabaseUrl = getEnvironmentVariable("SUPABASE_URL");

  const supabasePublishableKey = getEnvironmentVariable(
    "SUPABASE_PUBLISHABLE_KEY",
  );

  return createClient(supabaseUrl, supabasePublishableKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },

    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
