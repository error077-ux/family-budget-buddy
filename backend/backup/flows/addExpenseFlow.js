import { bot } from "../bot.js";
import { supabase } from "../services/supabaseService.js";

const expenseSession = new Map();

/* STEP 1: SHOW BANKS */
export async function startAddExpense(chatId) {
  const { data: banks } = await supabase.from("banks").select("id,name");

  const keyboard = banks.map(b => [
    { text: b.name, callback_data: `EXP_BANK_${b.id}` }
  ]);

  keyboard.push([{ text: "⬅ Back", callback_data: "HOME" }]);

  bot.sendMessage(chatId, "🏦 Select Bank", {
    reply_markup: { inline_keyboard: keyboard }
  });
}

/* STEP 2: SELECT PERSON */
export async function selectBank(chatId, bankId) {
  expenseSession.set(chatId, { bankId });

  const { data: persons } = await supabase.from("persons").select("name");

  const keyboard = persons.map(p => [
    { text: p.name, callback_data: `EXP_PERSON_${p.name}` }
  ]);

  bot.sendMessage(chatId, "👤 Expense Owner", {
    reply_markup: { inline_keyboard: keyboard }
  });
}

/* STEP 3: SELECT AMOUNT */
export function selectPerson(chatId, person) {
  const session = expenseSession.get(chatId);
  session.person = person;

  bot.sendMessage(chatId, "💰 Select Amount", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "₹100", callback_data: "EXP_AMT_100" }],
        [{ text: "₹500", callback_data: "EXP_AMT_500" }],
        [{ text: "₹1000", callback_data: "EXP_AMT_1000" }],
        [{ text: "⬅ Back", callback_data: "HOME" }]
      ]
    }
  });
}

/* STEP 4: SAVE EXPENSE */
export async function saveExpense(chatId, amount) {
  const s = expenseSession.get(chatId);

  const today = new Date().toISOString().split("T")[0];

  // 1️⃣ Insert transaction
  const { data: txn } = await supabase
    .from("transactions")
    .insert({
      bank_id: s.bankId,
      date: today,
      amount,
      expense_owner: s.person,
      description: "Telegram Expense"
    })
    .select()
    .single();

  // 2️⃣ Bank ledger entry
  await supabase.from("bank_ledger").insert({
    bank_id: s.bankId,
    date: today,
    debit: amount,
    description: "Expense via Telegram",
    reference_type: "transaction",
    reference_id: txn.id
  });

  // 3️⃣ Dashboard entry
  await supabase.from("dashboard").insert({
    transaction_id: txn.id,
    date: today,
    description: "Telegram Expense",
    amount,
    expense_owner: s.person
  });

  expenseSession.delete(chatId);

  bot.sendMessage(chatId, `✅ Expense Added: ₹${amount}`);
}
