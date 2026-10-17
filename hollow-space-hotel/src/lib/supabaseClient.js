import { createClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://izbruprsersqpeoaomez.supabase.co";

function isValidHttpUrl(str) {
  if (!str || typeof str !== "string") return false;
  try {
    const url = new URL(str.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function cleanUrl(str) {
  return str.trim().replace(/\/+$/, "");
}

function extractRefFromJwt(token) {
  if (!token || typeof token !== "string") return "";
  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const jsonStr =
        typeof atob === "function"
          ? atob(base64)
          : Buffer.from(base64, "base64").toString("utf-8");
      const payload = JSON.parse(jsonStr);
      if (payload && payload.ref) {
        return payload.ref;
      }
    }
  } catch {
    // Ignore decode errors
  }
  return "";
}

function resolveSupabaseConfig() {
  let rawUrl = (import.meta.env.VITE_SUPABASE_URL || "").trim();
  let rawKey = (
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    ""
  ).trim();

  // If user accidentally swapped URL and Key:
  if (!isValidHttpUrl(rawUrl) && isValidHttpUrl(rawKey)) {
    const temp = rawUrl;
    rawUrl = rawKey;
    rawKey = temp;
  }

  // If rawUrl is still not a valid HTTP URL, try to extract project ref from JWT or fallback
  let finalUrl = "";
  if (isValidHttpUrl(rawUrl)) {
    finalUrl = cleanUrl(rawUrl);
  } else {
    const ref = extractRefFromJwt(rawKey) || extractRefFromJwt(rawUrl);
    if (ref) {
      finalUrl = `https://${ref}.supabase.co`;
    } else if (rawKey || rawUrl) {
      finalUrl = DEFAULT_SUPABASE_URL;
    }
  }

  // Ensure key is an actual key (if rawUrl was an API key, use it if rawKey is empty)
  let finalKey = rawKey;
  if (!finalKey && rawUrl && !isValidHttpUrl(rawUrl)) {
    finalKey = rawUrl;
  }

  return { url: finalUrl, key: finalKey };
}

const { url: resolvedUrl, key: resolvedKey } = resolveSupabaseConfig();

export const supabaseUrl = resolvedUrl;
export const supabasePublicKey = resolvedKey;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublicKey);

let client = null;
if (isSupabaseConfigured) {
  try {
    client = createClient(supabaseUrl, supabasePublicKey);
  } catch (error) {
    console.error("Failed to initialize Supabase client:", error);
    client = null;
  }
} else {
  console.warn(
    "Supabase configuration is incomplete. Provide VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel settings or .env."
  );
}

export const supabase = client;