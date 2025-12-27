import { supabase } from "../services/supabaseService.js";

export const listLoans = () =>
  supabase.from("loans").select("*");

export const addLoan = (borrower, amount) =>
  supabase.from("loans").insert({
    borrower_name: borrower,
    principal_amount: amount,
    outstanding_amount: amount,
    is_paid: false
  });

export const closeLoan = (loanId) =>
  supabase.from("loans")
    .update({ outstanding_amount: 0, is_paid: true })
    .eq("id", loanId);
    