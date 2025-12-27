import { supabase } from "../services/supabaseService.js";

export const listIPOs = () =>
  supabase.from("ipo_applications").select("*");

export const addIPO = (data) =>
  supabase.from("ipo_applications").insert(data);

export const updateIPO = (id, status, listingPrice) =>
  supabase.from("ipo_applications")
    .update({ status, listing_price: listingPrice })
    .eq("id", id);
