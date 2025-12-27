import { supabase } from "../services/supabaseService.js";

export const listBanks = () =>
  supabase.from("banks").select("*").order("created_at");

export const addBank = (name, accountNumber) =>
  supabase.from("banks").insert({ name, account_number: accountNumber });

export const bankLedger = (bankId) =>
  supabase.from("bank_ledger")
    .select("*")
    .eq("bank_id", bankId)
    .order("date", { ascending: false });
