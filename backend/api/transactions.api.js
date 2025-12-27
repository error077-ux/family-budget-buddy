import { supabase } from "../services/supabaseService.js";

export async function addExpense({ bankId, date, description, amount, expenseOwner }) {
  const { data: txn, error } = await supabase
    .from("transactions")
    .insert({
      bank_id: bankId,
      date,
      description,
      amount,
      expense_owner: expenseOwner
    })
    .select()
    .single();

  if (error) throw error;

  await supabase.from("bank_ledger").insert({
    bank_id: bankId,
    date,
    debit: amount,
    credit: 0,
    description,
    reference_type: "transaction",
    reference_id: txn.id
  });

  return txn;
}

export const getTodayExpenses = () => {
  const d = new Date().toISOString().split("T")[0];
  return supabase.from("dashboard").select("*").eq("date", d);
};

export const getMonthExpenses = () => {
  const d = new Date(); d.setDate(1);
  return supabase.from("dashboard").select("*")
    .gte("date", d.toISOString().split("T")[0]);
};

export async function getOutstandingSummary() {
  const loans = await supabase.from("loans")
    .select("outstanding_amount")
    .eq("is_paid", false);

  const cards = await supabase.from("credit_cards")
    .select("outstanding")
    .gt("outstanding", 0);

  let total = 0;
  loans.data?.forEach(l => total += Number(l.outstanding_amount));
  cards.data?.forEach(c => total += Number(c.outstanding));
  return { total };
}
