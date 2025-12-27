import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

if (!process.env.SUPABASE_URL) throw new Error("SUPABASE_URL missing");
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("SERVICE ROLE KEY missing");

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false }
  }
);

console.log("✅ Supabase client initialized");
