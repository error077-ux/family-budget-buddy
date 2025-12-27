import { supabase } from "../services/supabaseService.js";

export const listCards = () =>
  supabase.from("credit_cards").select("*");

export const addCard = (name, limit, dueDate) =>
  supabase.from("credit_cards").insert({
    name,
    credit_limit: limit,
    outstanding: 0,
    due_date: dueDate
  });

export const payCard = (cardId, amount, bankId) =>
  Promise.all([
    supabase.from("credit_cards")
      .update({ outstanding: 0 })
      .eq("id", cardId),

    supabase.from("bank_ledger").insert({
      bank_id: bankId,
      debit: amount,
      description: "Credit Card Payment",
      reference_type: "credit_card",
      reference_id: cardId
    })
  ]);
