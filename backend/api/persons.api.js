import { supabase } from "../services/supabaseService.js";

export const listPersons = () =>
  supabase.from("persons").select("*").order("created_at");

export const addPerson = (name) =>
  supabase.from("persons").insert({ name, is_self: false });
