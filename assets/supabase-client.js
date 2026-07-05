import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

export function getSupabase() {
  const config = window.SWC_SUPABASE;

  if (!config?.url || !config?.anonKey || config.url.includes("YOUR_PROJECT_REF")) {
    throw new Error("config.js에 Supabase URL과 anon key를 설정해주세요.");
  }

  return createClient(config.url, config.anonKey);
}

export function formatPrice(price) {
  const numeric = Number(price ?? 0);
  return Number.isInteger(numeric) ? numeric.toFixed(1) : numeric.toString();
}

export function splitNotes(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value ?? "")
    .split(",")
    .map((note) => note.trim())
    .filter(Boolean);
}

export function joinNotes(value) {
  return Array.isArray(value) ? value.join(", ") : "";
}
