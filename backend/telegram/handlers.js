import fs from "fs";
import path from "path";
import { verifyPIN } from "../api/settings.api.js";

/* APIs */
import {
  addExpense,
  getTodayExpenses,
  getMonthExpenses,
  getOutstandingSummary
} from "../api/transactions.api.js";

import { listBanks, addBank, bankLedger } from "../api/banks.api.js";
import { listPersons, addPerson } from "../api/persons.api.js";
import { listCards, addCard, payCard } from "../api/creditCards.api.js";
import { listLoans, addLoan, closeLoan } from "../api/loans.api.js";
import { listIPOs, addIPO, updateIPO } from "../api/ipo.api.js";
import { setPIN } from "../api/settings.api.js";
import {
  exportExpensesCSV,
  exportExpensesPDF,
  exportLedgerCSV,
  exportLedgerPDF,
  exportIPOCSV,
  exportIPOPDF,
  exportLoansCSV,
  exportLoansPDF,
  exportCardsCSV,
  exportCardsPDF
} from "../api/export.api.js";

/* SHARED STATE */
const state = {};
global.state = global.state || {};

/* EXPORT DIRECTORY SETUP */
const EXPORT_DIR = path.resolve(process.cwd(), "backend/exports");
if (!fs.existsSync(EXPORT_DIR)) fs.mkdirSync(EXPORT_DIR, { recursive: true });

/* UTILS */
async function sendFile(bot, chatId, filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error("Export file not found: " + filePath);
  }
  return bot.sendDocument(chatId, fs.createReadStream(filePath));
}

/* MAIN MENU */
const mainMenu = {
  reply_markup: {
    inline_keyboard: [
      [{ text: "➕ Add Expense", callback_data: "EXPENSE_ADD" }],
      [{ text: "📊 Dashboard", callback_data: "DASHBOARD" }],
      [{ text: "🏦 Banks", callback_data: "BANKS" }],
      [{ text: "💳 Credit Cards", callback_data: "CREDIT_CARDS" }],
      [{ text: "📄 Loans", callback_data: "LOANS" }],
      [{ text: "📈 IPO", callback_data: "IPO" }],
      [{ text: "📤 Export", callback_data: "EXPORT" }],
      [{ text: "⚙️ Settings", callback_data: "SETTINGS" }]
    ]
  }
};

export function registerHandlers(bot) {

  /* ================= MESSAGE HANDLER (PIN & TEXT INPUT) ================= */
  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text?.trim();

    if (!text || text === "/start") return;

    /* 🔐 AUTH GATE (FIRST) */
    if (!global.state.authenticated) {
      const ok = await verifyPIN(text);
      if (!ok) {
        return bot.sendMessage(chatId, "❌ Wrong PIN. Try again:");
      }
      global.state.authenticated = true;
      return bot.sendMessage(chatId, "✅ Access granted", mainMenu);
    }

    /* STEP HANDLERS (If Authenticated) */
    if (!state.step) return;

    try {
      if (state.step === "SET_PIN") {
        await setPIN(text);
        state.step = null;
        return bot.sendMessage(chatId, "✅ PIN updated", mainMenu);
      }

      if (state.step === "ADD_PERSON") {
        await addPerson(text);
        state.step = null;
        return bot.sendMessage(chatId, "✅ Person added", mainMenu);
      }

      if (state.step === "ADD_BANK") {
        state.bankName = text;
        state.step = "ADD_BANK_ACC";
        return bot.sendMessage(chatId, "Enter account number:");
      }

      if (state.step === "ADD_BANK_ACC") {
        await addBank(state.bankName, text);
        state.step = null;
        return bot.sendMessage(chatId, "✅ Bank added", mainMenu);
      }

      if (state.step === "ADD_CARD") {
        state.cardName = text;
        state.step = "ADD_CARD_LIMIT";
        return bot.sendMessage(chatId, "Enter credit limit:");
      }

      if (state.step === "ADD_CARD_LIMIT") {
        await addCard(state.cardName, Number(text), 10);
        state.step = null;
        return bot.sendMessage(chatId, "✅ Card added", mainMenu);
      }

      if (state.step === "PAY_CARD_AMOUNT") {
        await payCard(state.cardId, Number(text));
        state.step = null;
        return bot.sendMessage(chatId, "✅ Payment recorded", mainMenu);
      }

      if (state.step === "ADD_LOAN_NAME") {
        state.loanName = text;
        state.step = "ADD_LOAN_AMOUNT";
        return bot.sendMessage(chatId, "Enter loan amount:");
      }

      if (state.step === "ADD_LOAN_AMOUNT") {
        await addLoan(state.loanName, Number(text));
        state.step = null;
        return bot.sendMessage(chatId, "✅ Loan added", mainMenu);
      }

      if (state.step === "ADD_IPO_NAME") {
        await addIPO({ company_name: text, status: "applied" });
        state.step = null;
        return bot.sendMessage(chatId, "✅ IPO added", mainMenu);
      }

      if (state.step === "EXP_AMOUNT") {
        const amt = Number(text);
        if (isNaN(amt) || amt <= 0) return bot.sendMessage(chatId, "Enter valid amount");

        await addExpense({
          bankId: state.expense.bankId,
          date: new Date().toISOString().split("T")[0],
          description: "Telegram Expense",
          amount: amt,
          expenseOwner: state.expense.owner
        });
        state.step = null;
        return bot.sendMessage(chatId, "✅ Expense added", mainMenu);
      }
    } catch (e) {
      console.error(e);
      state.step = null;
      return bot.sendMessage(chatId, "❌ Operation failed.", mainMenu);
    }
  });

  /* ================= CALLBACK HANDLER ================= */
  bot.on("callback_query", async (q) => {
    const chatId = q.message.chat.id;
    const action = q.data;

    /* AUTH CHECK */
    if (!global.state.authenticated) {
      return bot.sendMessage(chatId, "🔐 Please enter PIN first");
    }

    try {
      if (action === "HOME") return bot.sendMessage(chatId, "🏠 Main Menu", mainMenu);

      /* ---------- EXPORT MENU ---------- */
      if (action === "EXPORT") {
        return bot.sendMessage(chatId, "📤 Export Data", {
          reply_markup: {
            inline_keyboard: [
              [{ text: "Expenses CSV", callback_data: "EXP_EXP_CSV" }, { text: "Expenses PDF", callback_data: "EXP_EXP_PDF" }],
              [{ text: "Ledger CSV", callback_data: "EXP_LEDGER_CSV" }, { text: "Ledger PDF", callback_data: "EXP_LEDGER_PDF" }],
              [{ text: "Cards CSV", callback_data: "EXP_CARD_CSV" }, { text: "Cards PDF", callback_data: "EXP_CARD_PDF" }],
              [{ text: "Loans CSV", callback_data: "EXP_LOAN_CSV" }, { text: "Loans PDF", callback_data: "EXP_LOAN_PDF" }],
              [{ text: "IPO CSV", callback_data: "EXP_IPO_CSV" }, { text: "IPO PDF", callback_data: "EXP_IPO_PDF" }],
              [{ text: "⬅ Back", callback_data: "HOME" }]
            ]
          }
        });
      }

      /* ---------- EXPORT ACTIONS ---------- */
      if (action === "EXP_EXP_CSV") {
        const p = path.join(EXPORT_DIR, "expenses.csv");
        fs.writeFileSync(p, await exportExpensesCSV());
        return sendFile(bot, chatId, p);
      }
      if (action === "EXP_EXP_PDF") {
        const p = path.join(EXPORT_DIR, "expenses.pdf");
        await exportExpensesPDF(p);
        return sendFile(bot, chatId, p);
      }
      if (action === "EXP_CARD_CSV") {
        const p = path.join(EXPORT_DIR, "cards.csv");
        fs.writeFileSync(p, await exportCardsCSV());
        return sendFile(bot, chatId, p);
      }
      if (action === "EXP_CARD_PDF") {
        const p = path.join(EXPORT_DIR, "cards.pdf");
        await exportCardsPDF(p);
        return sendFile(bot, chatId, p);
      }
      if (action === "EXP_LOAN_CSV") {
        const p = path.join(EXPORT_DIR, "loans.csv");
        fs.writeFileSync(p, await exportLoansCSV());
        return sendFile(bot, chatId, p);
      }
      if (action === "EXP_LOAN_PDF") {
        const p = path.join(EXPORT_DIR, "loans.pdf");
        await exportLoansPDF(p);
        return sendFile(bot, chatId, p);
      }
      if (action === "EXP_IPO_CSV") {
        const p = path.join(EXPORT_DIR, "ipos.csv");
        fs.writeFileSync(p, await exportIPOCSV());
        return sendFile(bot, chatId, p);
      }
      if (action === "EXP_IPO_PDF") {
        const p = path.join(EXPORT_DIR, "ipos.pdf");
        await exportIPOPDF(p);
        return sendFile(bot, chatId, p);
      }

      /* LEDGER EXPORT (Requires selection) */
      if (action === "EXP_LEDGER_CSV" || action === "EXP_LEDGER_PDF") {
        state.exportType = action;
        const { data } = await listBanks();
        const kb = data.map(b => [{ text: b.name, callback_data: `EXPLED_${b.id}` }]);
        kb.push([{ text: "⬅ Back", callback_data: "EXPORT" }]);
        return bot.sendMessage(chatId, "Select Bank", { reply_markup: { inline_keyboard: kb } });
      }

      if (action.startsWith("EXPLED_")) {
        const bankId = action.replace("EXPLED_", "");
        const isCSV = state.exportType.endsWith("CSV");
        const p = path.join(EXPORT_DIR, `ledger.${isCSV ? "csv" : "pdf"}`);

        if (isCSV) {
          fs.writeFileSync(p, await exportLedgerCSV(bankId));
        } else {
          await exportLedgerPDF(bankId, p);
        }
        return sendFile(bot, chatId, p);
      }

      /* ---------- MODULE MENUS ---------- */
      if (action === "BANKS") {
        return bot.sendMessage(chatId, "🏦 Banks", {
          reply_markup: {
            inline_keyboard: [
              [{ text: "👀 View Banks", callback_data: "BANK_VIEW" }],
              [{ text: "➕ Add Bank", callback_data: "BANK_ADD" }],
              [{ text: "📄 Bank Ledger", callback_data: "BANK_LEDGER" }],
              [{ text: "⬅ Back", callback_data: "HOME" }]
            ]
          }
        });
      }

      if (action === "BANK_VIEW") {
        const { data } = await listBanks();
        let msg = data.length ? "🏦 Banks\n\n" : "No banks found.";
        data.forEach(b => msg += `• ${b.name} (${b.account_number})\n`);
        return bot.sendMessage(chatId, msg, mainMenu);
      }

      if (action === "BANK_ADD") {
        state.step = "ADD_BANK";
        return bot.sendMessage(chatId, "Enter bank name:");
      }

      if (action === "BANK_LEDGER") {
        const { data } = await listBanks();
        const kb = data.map(b => [{ text: b.name, callback_data: `LEDGER_${b.id}` }]);
        return bot.sendMessage(chatId, "Select Bank", { reply_markup: { inline_keyboard: kb } });
      }

      if (action.startsWith("LEDGER_")) {
        const { data } = await bankLedger(action.replace("LEDGER_", ""));
        let msg = "📄 Bank Ledger\n\n";
        data?.slice(0, 10).forEach(l => msg += `${l.date} | -₹${l.debit || 0} +₹${l.credit || 0}\n`);
        return bot.sendMessage(chatId, msg || "No ledger found.", mainMenu);
      }

      /* ---------- CREDIT CARDS ---------- */
      if (action === "CREDIT_CARDS") {
        return bot.sendMessage(chatId, "💳 Credit Cards", {
          reply_markup: {
            inline_keyboard: [
              [{ text: "👀 View Cards", callback_data: "CARD_VIEW" }],
              [{ text: "➕ Add Card", callback_data: "CARD_ADD" }],
              [{ text: "💸 Pay Card", callback_data: "CARD_PAY" }],
              [{ text: "⬅ Back", callback_data: "HOME" }]
            ]
          }
        });
      }

      if (action === "CARD_VIEW") {
        const { data } = await listCards();
        let msg = "💳 Cards\n\n";
        data.forEach(c => msg += `${c.name} | Limit ₹${c.credit_limit} | Due ₹${c.outstanding}\n`);
        return bot.sendMessage(chatId, msg, mainMenu);
      }

      if (action === "CARD_ADD") {
        state.step = "ADD_CARD";
        return bot.sendMessage(chatId, "Enter card name:");
      }

      if (action === "CARD_PAY") {
        const { data } = await listCards();
        const kb = data.map(c => [{ text: c.name, callback_data: `PAYCARD_${c.id}` }]);
        return bot.sendMessage(chatId, "Select Card", { reply_markup: { inline_keyboard: kb } });
      }

      if (action.startsWith("PAYCARD_")) {
        state.cardId = action.replace("PAYCARD_", "");
        state.step = "PAY_CARD_AMOUNT";
        return bot.sendMessage(chatId, "Enter payment amount:");
      }

      /* ---------- LOANS ---------- */
      if (action === "LOANS") {
        return bot.sendMessage(chatId, "📄 Loans", {
          reply_markup: {
            inline_keyboard: [
              [{ text: "👀 View Loans", callback_data: "LOAN_VIEW" }],
              [{ text: "➕ Add Loan", callback_data: "LOAN_ADD" }],
              [{ text: "✅ Close Loan", callback_data: "LOAN_CLOSE" }],
              [{ text: "⬅ Back", callback_data: "HOME" }]
            ]
          }
        });
      }

      if (action === "LOAN_VIEW") {
        const { data } = await listLoans();
        let msg = "📄 Loans\n\n";
        data.forEach(l => msg += `${l.borrower_name} | ₹${l.outstanding_amount}\n`);
        return bot.sendMessage(chatId, msg, mainMenu);
      }

      if (action === "LOAN_ADD") {
        state.step = "ADD_LOAN_NAME";
        return bot.sendMessage(chatId, "Enter borrower name:");
      }

      if (action === "LOAN_CLOSE") {
        const { data } = await listLoans();
        const kb = data.map(l => [{ text: l.borrower_name, callback_data: `CLOSE_${l.id}` }]);
        return bot.sendMessage(chatId, "Select Loan", { reply_markup: { inline_keyboard: kb } });
      }

      if (action.startsWith("CLOSE_")) {
        await closeLoan(action.replace("CLOSE_", ""));
        return bot.sendMessage(chatId, "✅ Loan closed", mainMenu);
      }

      /* ---------- IPO ---------- */
      if (action === "IPO") {
        return bot.sendMessage(chatId, "📈 IPO", {
          reply_markup: {
            inline_keyboard: [
              [{ text: "👀 View IPOs", callback_data: "IPO_VIEW" }],
              [{ text: "➕ Add IPO", callback_data: "IPO_ADD" }],
              [{ text: "⬅ Back", callback_data: "HOME" }]
            ]
          }
        });
      }

      if (action === "IPO_VIEW") {
        const { data } = await listIPOs();
        let msg = "📈 IPOs\n\n";
        data.forEach(i => msg += `${i.company_name} | ${i.status}\n`);
        return bot.sendMessage(chatId, msg, mainMenu);
      }

      if (action === "IPO_ADD") {
        state.step = "ADD_IPO_NAME";
        return bot.sendMessage(chatId, "Enter company name:");
      }

      /* ---------- DASHBOARD ---------- */
      if (action === "DASHBOARD") {
        return bot.sendMessage(chatId, "📊 Dashboard", {
          reply_markup: {
            inline_keyboard: [
              [{ text: "📅 Today", callback_data: "DASH_TODAY" }],
              [{ text: "📆 Month", callback_data: "DASH_MONTH" }],
              [{ text: "💳 Outstanding", callback_data: "DASH_OUT" }],
              [{ text: "⬅ Back", callback_data: "HOME" }]
            ]
          }
        });
      }

      if (action === "DASH_TODAY") {
        const { data } = await getTodayExpenses();
        let msg = "Today\n\n";
        data.forEach(e => msg += `₹${e.amount} - ${e.description}\n`);
        return bot.sendMessage(chatId, msg || "No transactions today.");
      }

      if (action === "DASH_MONTH") {
        const { data } = await getMonthExpenses();
        const total = data.reduce((s, d) => s + Number(d.amount), 0);
        return bot.sendMessage(chatId, `This Month Total: ₹${total}`);
      }

      if (action === "DASH_OUT") {
        const { total } = await getOutstandingSummary();
        return bot.sendMessage(chatId, `Outstanding: ₹${total}`);
      }

      /* ---------- SETTINGS ---------- */
      if (action === "SETTINGS") {
        return bot.sendMessage(chatId, "⚙️ Settings", {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔐 Set PIN", callback_data: "SET_PIN" }],
              [{ text: "👤 Add Person", callback_data: "ADD_PERSON" }],
              [{ text: "⬅ Back", callback_data: "HOME" }]
            ]
          }
        });
      }

      if (action === "SET_PIN") {
        state.step = "SET_PIN";
        return bot.sendMessage(chatId, "Enter new PIN (4–6 digits):");
      }

      if (action === "ADD_PERSON") {
        state.step = "ADD_PERSON";
        return bot.sendMessage(chatId, "Enter person name:");
      }

      /* ---------- EXPENSE ---------- */
      if (action === "EXPENSE_ADD") {
        state.expense = {};
        const { data } = await listBanks();
        const kb = data.map(b => [{ text: b.name, callback_data: `EXP_BANK_${b.id}` }]);
        return bot.sendMessage(chatId, "Select Bank", { reply_markup: { inline_keyboard: kb } });
      }

      if (action.startsWith("EXP_BANK_")) {
        state.expense.bankId = action.replace("EXP_BANK_", "");
        const { data } = await listPersons();
        const kb = data.map(p => [{ text: p.name, callback_data: `EXP_PERSON_${p.name}` }]);
        return bot.sendMessage(chatId, "Expense For", { reply_markup: { inline_keyboard: kb } });
      }

      if (action.startsWith("EXP_PERSON_")) {
        state.expense.owner = action.replace("EXP_PERSON_", "");
        state.step = "EXP_AMOUNT";
        return bot.sendMessage(chatId, "Enter amount:");
      }

    } catch (e) {
      console.error(e);
      return bot.sendMessage(chatId, "❌ Error occurred", mainMenu);
    }
  });
}