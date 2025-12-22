import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

async function sendTelegramMessage(chatId: number, text: string, replyMarkup?: any) {
  const body: any = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
  };
  if (replyMarkup) body.reply_markup = replyMarkup;

  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  console.log("Telegram response:", await res.text());
}

async function getSession(chatId: number) {
  const { data } = await supabase
    .from("telegram_sessions")
    .select("*")
    .eq("chat_id", chatId)
    .maybeSingle();
  return data;
}

async function setSession(chatId: number, session: any) {
  const { data: existing } = await supabase
    .from("telegram_sessions")
    .select("id")
    .eq("chat_id", chatId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("telegram_sessions")
      .update({ ...session, updated_at: new Date().toISOString() })
      .eq("chat_id", chatId);
  } else {
    await supabase
      .from("telegram_sessions")
      .insert({ chat_id: chatId, ...session });
  }
}

async function clearSession(chatId: number) {
  await supabase.from("telegram_sessions").delete().eq("chat_id", chatId);
}

async function getDashboardStats() {
  const { data: banks } = await supabase.from("banks").select("id, name");
  const { data: loans } = await supabase.from("loans").select("*").eq("is_paid", false);
  const { data: creditCards } = await supabase.from("credit_cards").select("*");
  const { data: transactions } = await supabase.from("transactions").select("*").order("date", { ascending: false }).limit(5);

  let totalBalance = 0;
  for (const bank of banks || []) {
    const { data: ledger } = await supabase.from("bank_ledger").select("credit, debit").eq("bank_id", bank.id);
    const balance = (ledger || []).reduce((acc, e) => acc + Number(e.credit) - Number(e.debit), 0);
    totalBalance += balance;
  }

  const totalLoans = (loans || []).reduce((acc, l) => acc + Number(l.outstanding_amount), 0);
  const totalCreditOutstanding = (creditCards || []).reduce((acc, c) => acc + Number(c.outstanding), 0);

  return {
    totalBalance,
    totalLoans,
    totalCreditOutstanding,
    bankCount: banks?.length || 0,
    recentTransactions: transactions || [],
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const update = await req.json();
    console.log("Telegram update:", JSON.stringify(update));

    // Handle callback queries (button clicks)
    if (update.callback_query) {
      const callback = update.callback_query;
      const chatId = callback.message.chat.id;
      const data = callback.data;

      // Answer callback to remove loading state
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: callback.id }),
      });

      if (data === "cancel") {
        await clearSession(chatId);
        await sendTelegramMessage(chatId, "❌ Transaction cancelled.");
        return new Response("OK", { status: 200 });
      }

      if (data === "add_transaction") {
        await setSession(chatId, { step: "amount" });
        await sendTelegramMessage(
          chatId,
          "➕ <b>Add New Transaction</b>\n\n<b>Step 1/5:</b> 💰 Enter the amount:\n\n<i>Type the transaction amount (e.g., 500)</i>",
          { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "cancel" }]] }
        );
        return new Response("OK", { status: 200 });
      }

      // Source type selection
      if (data === "source_bank" || data === "source_card") {
        const session = await getSession(chatId);
        if (session && session.step === "source_type") {
          const sourceType = data === "source_bank" ? "bank" : "credit_card";
          await setSession(chatId, { ...session, source_type: sourceType, step: "select_source" });

          if (sourceType === "bank") {
            const { data: banks } = await supabase.from("banks").select("id, name");
            if (!banks || banks.length === 0) {
              await sendTelegramMessage(chatId, "❌ No banks found. Please add a bank first.");
              await clearSession(chatId);
              return new Response("OK", { status: 200 });
            }
            const buttons = banks.map((bank) => [{ text: `🏦 ${bank.name}`, callback_data: `bank_${bank.id}` }]);
            buttons.push([{ text: "❌ Cancel", callback_data: "cancel" }]);
            await sendTelegramMessage(chatId, "<b>Step 4/5:</b> 🏦 Select bank:", { inline_keyboard: buttons });
          } else {
            const { data: cards } = await supabase.from("credit_cards").select("id, name");
            if (!cards || cards.length === 0) {
              await sendTelegramMessage(chatId, "❌ No credit cards found. Please add a card first.");
              await clearSession(chatId);
              return new Response("OK", { status: 200 });
            }
            const buttons = cards.map((card) => [{ text: `💳 ${card.name}`, callback_data: `card_${card.id}` }]);
            buttons.push([{ text: "❌ Cancel", callback_data: "cancel" }]);
            await sendTelegramMessage(chatId, "<b>Step 4/5:</b> 💳 Select credit card:", { inline_keyboard: buttons });
          }
        }
        return new Response("OK", { status: 200 });
      }

      // Bank selection
      if (data.startsWith("bank_")) {
        const bankId = data.replace("bank_", "");
        const session = await getSession(chatId);
        if (session && session.step === "select_source") {
          await setSession(chatId, { ...session, bank_id: bankId, step: "person" });

          const { data: persons } = await supabase.from("persons").select("id, name, is_self");
          const buttons = (persons || []).map((person) => [{
            text: person.is_self ? `👤 ${person.name} (Me)` : `👤 ${person.name}`,
            callback_data: `person_${person.name}`
          }]);
          buttons.push([{ text: "❌ Cancel", callback_data: "cancel" }]);
          await sendTelegramMessage(chatId, "<b>Step 5/5:</b> 👤 Select expense owner:", { inline_keyboard: buttons });
        }
        return new Response("OK", { status: 200 });
      }

      // Credit card selection
      if (data.startsWith("card_")) {
        const cardId = data.replace("card_", "");
        const session = await getSession(chatId);
        if (session && session.step === "select_source") {
          // For credit card, we still need bank_id for the transaction table
          // Get first bank as fallback
          const { data: banks } = await supabase.from("banks").select("id").limit(1);
          const bankId = banks?.[0]?.id;

          await setSession(chatId, { ...session, bank_id: bankId, credit_card_id: cardId, step: "person" });

          const { data: persons } = await supabase.from("persons").select("id, name, is_self");
          const buttons = (persons || []).map((person) => [{
            text: person.is_self ? `👤 ${person.name} (Me)` : `👤 ${person.name}`,
            callback_data: `person_${person.name}`
          }]);
          buttons.push([{ text: "❌ Cancel", callback_data: "cancel" }]);
          await sendTelegramMessage(chatId, "<b>Step 5/5:</b> 👤 Select expense owner:", { inline_keyboard: buttons });
        }
        return new Response("OK", { status: 200 });
      }

      // Person selection - Create transaction
      if (data.startsWith("person_")) {
        const personName = data.replace("person_", "");
        const session = await getSession(chatId);

        if (session && session.step === "person" && session.amount && session.description && session.bank_id) {
          const { data: bank } = await supabase.from("banks").select("name").eq("id", session.bank_id).maybeSingle();

          // Check if person is self
          const { data: person } = await supabase.from("persons").select("is_self").eq("name", personName).maybeSingle();
          const isSelf = person?.is_self ?? false;

          // Create transaction
          const today = new Date().toISOString().split("T")[0];
          const txPayload: any = {
            amount: session.amount,
            description: session.description,
            bank_id: session.bank_id,
            expense_owner: personName,
            date: today,
          };

          // If not self, create a loan too
          let loanId = null;
          if (!isSelf) {
            const { data: loan, error: loanError } = await supabase
              .from("loans")
              .insert({
                borrower_name: personName,
                principal_amount: session.amount,
                outstanding_amount: session.amount,
                source_type: session.source_type || "bank",
                source_bank_id: session.source_type === "bank" ? session.bank_id : null,
                source_credit_card_id: session.source_type === "credit_card" ? session.credit_card_id : null,
              })
              .select()
              .single();

            if (!loanError && loan) {
              loanId = loan.id;
              txPayload.created_loan_id = loanId;
            }
          }

          const { data: tx, error: txError } = await supabase
            .from("transactions")
            .insert(txPayload)
            .select()
            .single();

          if (txError) {
            console.error("Transaction error:", txError);
            await sendTelegramMessage(chatId, `❌ Failed: ${txError.message}`);
            await clearSession(chatId);
            return new Response("OK", { status: 200 });
          }

          // Add ledger entry
          const { data: ledger } = await supabase.from("bank_ledger").select("credit, debit").eq("bank_id", session.bank_id);
          const currentBalance = (ledger || []).reduce((acc, e) => acc + Number(e.credit) - Number(e.debit), 0);

          await supabase.from("bank_ledger").insert({
            bank_id: session.bank_id,
            date: today,
            description: session.description,
            debit: session.amount,
            credit: 0,
            balance_after: currentBalance - session.amount,
            reference_type: "transaction",
            reference_id: tx.id,
          });

          // Update credit card outstanding if paid via credit card
          if (session.source_type === "credit_card" && session.credit_card_id) {
            const { data: card } = await supabase.from("credit_cards").select("outstanding").eq("id", session.credit_card_id).maybeSingle();
            if (card) {
              await supabase
                .from("credit_cards")
                .update({ outstanding: Number(card.outstanding) + session.amount })
                .eq("id", session.credit_card_id);
            }
          }

          let message = `✅ <b>Transaction Added!</b>\n\n💰 Amount: ₹${session.amount}\n📝 Description: ${session.description}\n🏦 Bank: ${bank?.name || "Unknown"}\n👤 Owner: ${personName}\n💵 New Balance: ₹${(currentBalance - session.amount).toFixed(2)}`;

          if (loanId) {
            message += `\n\n📋 <i>A loan was created for ${personName}</i>`;
          }

          await sendTelegramMessage(chatId, message);
          await clearSession(chatId);
        }
        return new Response("OK", { status: 200 });
      }

      // Handle menu commands from inline buttons
      if (data === "cmd_dashboard") {
        const stats = await getDashboardStats();
        const msg = `📊 <b>Dashboard</b>\n\n💰 Total Balance: ₹${stats.totalBalance.toFixed(2)}\n📉 Pending Loans: ₹${stats.totalLoans.toFixed(2)}\n💳 Credit Outstanding: ₹${stats.totalCreditOutstanding.toFixed(2)}\n🏦 Banks: ${stats.bankCount}\n\n<b>Recent Transactions:</b>\n${
          stats.recentTransactions.length > 0
            ? stats.recentTransactions.map((t: any) => `• ₹${t.amount} - ${t.description}`).join("\n")
            : "No recent transactions"
        }`;
        await sendTelegramMessage(chatId, msg);
        return new Response("OK", { status: 200 });
      }

      if (data === "cmd_banks") {
        const { data: banks } = await supabase.from("banks").select("*");
        if (!banks || banks.length === 0) {
          await sendTelegramMessage(chatId, "No banks found.");
          return new Response("OK", { status: 200 });
        }
        let msg = "🏦 <b>Banks</b>\n\n";
        for (const bank of banks) {
          const { data: ledger } = await supabase.from("bank_ledger").select("credit, debit").eq("bank_id", bank.id);
          const balance = (ledger || []).reduce((acc, e) => acc + Number(e.credit) - Number(e.debit), 0);
          msg += `<b>${bank.name}</b>\nBalance: ₹${balance.toFixed(2)}\nA/C: ${bank.account_number}\n\n`;
        }
        await sendTelegramMessage(chatId, msg);
        return new Response("OK", { status: 200 });
      }

      if (data === "cmd_cards") {
        const { data: cards } = await supabase.from("credit_cards").select("*");
        if (!cards || cards.length === 0) {
          await sendTelegramMessage(chatId, "No credit cards found.");
          return new Response("OK", { status: 200 });
        }
        let msg = "💳 <b>Credit Cards</b>\n\n";
        for (const card of cards) {
          msg += `<b>${card.name}</b>\nLimit: ₹${Number(card.credit_limit).toFixed(2)}\nOutstanding: ₹${Number(card.outstanding).toFixed(2)}\nDue Date: ${card.due_date}th\n\n`;
        }
        await sendTelegramMessage(chatId, msg);
        return new Response("OK", { status: 200 });
      }

      if (data === "cmd_loans") {
        const { data: loans } = await supabase
          .from("loans")
          .select("*, banks:source_bank_id(name), credit_cards:source_credit_card_id(name)")
          .eq("is_paid", false);
        if (!loans || loans.length === 0) {
          await sendTelegramMessage(chatId, "✅ No pending loans!");
          return new Response("OK", { status: 200 });
        }
        let msg = "📋 <b>Pending Loans</b>\n\n";
        for (const loan of loans) {
          const source = loan.banks?.name || loan.credit_cards?.name || "Unknown";
          msg += `<b>${loan.borrower_name}</b>\nAmount: ₹${Number(loan.outstanding_amount).toFixed(2)}\nSource: ${source}\n\n`;
        }
        await sendTelegramMessage(chatId, msg);
        return new Response("OK", { status: 200 });
      }

      if (data === "cmd_help") {
        await sendTelegramMessage(
          chatId,
          `📋 <b>Available Commands</b>\n\n/dashboard - View financial summary\n/banks - List all banks with balances\n/loans - View pending loans\n/cards - View credit cards\n/add - Add new transaction (interactive)`
        );
        return new Response("OK", { status: 200 });
      }

      return new Response("OK", { status: 200 });
    }

    const message = update.message;
    if (!message) {
      return new Response("OK", { status: 200 });
    }

    const chatId = message.chat.id;
    const text = message.text || "";

    // Check if user is in a session flow
    const session = await getSession(chatId);
    if (session && session.step !== "idle") {
      // Step 1: Amount
      if (session.step === "amount") {
        const amount = parseFloat(text);
        if (isNaN(amount) || amount <= 0) {
          await sendTelegramMessage(chatId, "❌ Invalid amount. Please enter a valid positive number:", {
            inline_keyboard: [[{ text: "❌ Cancel", callback_data: "cancel" }]]
          });
          return new Response("OK", { status: 200 });
        }
        await setSession(chatId, { ...session, amount, step: "description" });
        await sendTelegramMessage(
          chatId,
          "<b>Step 2/5:</b> 📝 Enter description:\n\n<i>What is this transaction for? (e.g., Groceries, Rent)</i>",
          { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "cancel" }]] }
        );
        return new Response("OK", { status: 200 });
      }

      // Step 2: Description
      if (session.step === "description") {
        if (!text.trim()) {
          await sendTelegramMessage(chatId, "❌ Description cannot be empty. Please enter a description:", {
            inline_keyboard: [[{ text: "❌ Cancel", callback_data: "cancel" }]]
          });
          return new Response("OK", { status: 200 });
        }
        await setSession(chatId, { ...session, description: text.trim(), step: "source_type" });
        await sendTelegramMessage(
          chatId,
          "<b>Step 3/5:</b> 💳 Select payment source:",
          {
            inline_keyboard: [
              [{ text: "🏦 Bank Account", callback_data: "source_bank" }],
              [{ text: "💳 Credit Card", callback_data: "source_card" }],
              [{ text: "❌ Cancel", callback_data: "cancel" }],
            ],
          }
        );
        return new Response("OK", { status: 200 });
      }
    }

    // /start command
    if (text === "/start") {
      await clearSession(chatId);
      await sendTelegramMessage(
        chatId,
        `🏦 <b>Budget Planner Bot</b>\n\nWelcome! Manage your finances easily.\n\nTap a button below or use commands:`,
        {
          inline_keyboard: [
            [{ text: "📊 Dashboard", callback_data: "cmd_dashboard" }, { text: "➕ Add Transaction", callback_data: "add_transaction" }],
            [{ text: "🏦 Banks", callback_data: "cmd_banks" }, { text: "💳 Cards", callback_data: "cmd_cards" }],
            [{ text: "📋 Loans", callback_data: "cmd_loans" }, { text: "❓ Help", callback_data: "cmd_help" }],
          ],
        }
      );
    }

    // /add command - Start interactive flow
    else if (text === "/add" || text === "/transaction") {
      await setSession(chatId, { step: "amount" });
      await sendTelegramMessage(
        chatId,
        "➕ <b>Add New Transaction</b>\n\n<b>Step 1/5:</b> 💰 Enter the amount:\n\n<i>Type the transaction amount (e.g., 500)</i>",
        { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "cancel" }]] }
      );
    }

    // /help command
    else if (text === "/help") {
      await sendTelegramMessage(
        chatId,
        `📋 <b>Available Commands</b>\n\n/dashboard - View financial summary\n/banks - List all banks with balances\n/loans - View pending loans\n/cards - View credit cards\n/add - Add new transaction (interactive)`
      );
    }

    // /dashboard command
    else if (text === "/dashboard") {
      const stats = await getDashboardStats();
      const msg = `📊 <b>Dashboard</b>\n\n💰 Total Balance: ₹${stats.totalBalance.toFixed(2)}\n📉 Pending Loans: ₹${stats.totalLoans.toFixed(2)}\n💳 Credit Outstanding: ₹${stats.totalCreditOutstanding.toFixed(2)}\n🏦 Banks: ${stats.bankCount}\n\n<b>Recent Transactions:</b>\n${
        stats.recentTransactions.length > 0
          ? stats.recentTransactions.map((t: any) => `• ₹${t.amount} - ${t.description}`).join("\n")
          : "No recent transactions"
      }`;
      await sendTelegramMessage(chatId, msg);
    }

    // /banks command
    else if (text === "/banks") {
      const { data: banks } = await supabase.from("banks").select("*");
      if (!banks || banks.length === 0) {
        await sendTelegramMessage(chatId, "No banks found.");
        return new Response("OK", { status: 200 });
      }

      let msg = "🏦 <b>Banks</b>\n\n";
      for (const bank of banks) {
        const { data: ledger } = await supabase.from("bank_ledger").select("credit, debit").eq("bank_id", bank.id);
        const balance = (ledger || []).reduce((acc, e) => acc + Number(e.credit) - Number(e.debit), 0);
        msg += `<b>${bank.name}</b>\nBalance: ₹${balance.toFixed(2)}\nA/C: ${bank.account_number}\n\n`;
      }
      await sendTelegramMessage(chatId, msg);
    }

    // /loans command
    else if (text === "/loans") {
      const { data: loans } = await supabase
        .from("loans")
        .select("*, banks:source_bank_id(name), credit_cards:source_credit_card_id(name)")
        .eq("is_paid", false);

      if (!loans || loans.length === 0) {
        await sendTelegramMessage(chatId, "✅ No pending loans!");
        return new Response("OK", { status: 200 });
      }

      let msg = "📋 <b>Pending Loans</b>\n\n";
      for (const loan of loans) {
        const source = loan.banks?.name || loan.credit_cards?.name || "Unknown";
        msg += `<b>${loan.borrower_name}</b>\nAmount: ₹${Number(loan.outstanding_amount).toFixed(2)}\nSource: ${source}\n\n`;
      }
      await sendTelegramMessage(chatId, msg);
    }

    // /cards command
    else if (text === "/cards") {
      const { data: cards } = await supabase.from("credit_cards").select("*");
      if (!cards || cards.length === 0) {
        await sendTelegramMessage(chatId, "No credit cards found.");
        return new Response("OK", { status: 200 });
      }

      let msg = "💳 <b>Credit Cards</b>\n\n";
      for (const card of cards) {
        msg += `<b>${card.name}</b>\nLimit: ₹${Number(card.credit_limit).toFixed(2)}\nOutstanding: ₹${Number(card.outstanding).toFixed(2)}\nDue Date: ${card.due_date}th\n\n`;
      }
      await sendTelegramMessage(chatId, msg);
    }

    // Unknown command
    else if (text.startsWith("/")) {
      await sendTelegramMessage(chatId, "Unknown command. Use /help to see available commands.");
    }

    return new Response("OK", { status: 200 });
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});