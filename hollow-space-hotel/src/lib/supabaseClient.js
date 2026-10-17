import { createClient } from "@supabase/supabase-js";

function getCleanHttpUrl(raw) {
  if (!raw || typeof raw !== "string") return "";
  const trimmed = raw.trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return trimmed.replace(/\/+$/, "");
    }
  } catch {
    return "";
  }
  return "";
}

const rawUrl = import.meta.env.VITE_SUPABASE_URL || "";
const rawKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "";

export const supabaseUrl = getCleanHttpUrl(rawUrl);
export const supabasePublicKey = typeof rawKey === "string" ? rawKey.trim() : "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublicKey);

let client = null;
if (isSupabaseConfigured) {
  try {
    client = createClient(supabaseUrl, supabasePublicKey);
  } catch (error) {
    console.error("Failed to initialize Supabase client:", error);
    client = null;
  }
} else if (rawUrl || rawKey) {
  console.warn(
    "Supabase configuration is incomplete or invalid. Ensure VITE_SUPABASE_URL is a valid HTTP/HTTPS URL and VITE_SUPABASE_ANON_KEY is provided."
  );
}

export const supabase = client;