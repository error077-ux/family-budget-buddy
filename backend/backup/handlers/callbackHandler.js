import { bot } from "../bot.js";

/* MENUS */
import { mainMenu } from "../menus/mainMenu.js";
import { expensesMenu } from "../menus/expensesMenu.js";
import { dashboardMenu } from "../menus/dashboardMenu.js";
import { banksMenu } from "../menus/banksMenu.js";
import { loansMenu } from "../menus/loansMenu.js";
import { ipoMenu } from "../menus/ipoMenu.js";
import { notificationsMenu } from "../menus/notificationsMenu.js";
import { settingsMenu } from "../menus/settingsMenu.js";

/* FLOWS */
import {
  startAddExpense,
  selectBank,
  selectPerson,
  saveExpense
} from "../flows/addExpenseFlow.js";

bot.on("callback_query", async (q) => {
  const chatId = q.message.chat.id;
  const action = q.data;

  try {
    /* HOME */
    if (action === "HOME") {
      return bot.sendMessage(chatId, "🏠 Main Menu", mainMenu);
    }

    /* MAIN MENUS */
    if (action === "EXPENSE_ADD") {
      return bot.sendMessage(chatId, "➕ Expense Menu", expensesMenu);
    }

    if (action === "DASHBOARD") {
      return bot.sendMessage(chatId, "📊 Dashboard", dashboardMenu);
    }

    if (action === "BANKS") {
      return bot.sendMessage(chatId, "🏦 Banks", banksMenu);
    }

    if (action === "LOANS") {
      return bot.sendMessage(chatId, "📄 Loans", loansMenu);
    }

    if (action === "IPO") {
      return bot.sendMessage(chatId, "📈 IPO Tracker", ipoMenu);
    }

    if (action === "NOTIFICATIONS") {
      return bot.sendMessage(chatId, "🔔 Notifications", notificationsMenu);
    }

    if (action === "SETTINGS") {
      return bot.sendMessage(chatId, "⚙️ Settings", settingsMenu);
    }

    /* ADD EXPENSE FLOW */
    if (action === "EXPENSE_NEW") {
      return startAddExpense(chatId);
    }

    if (action.startsWith("EXP_BANK_")) {
      return selectBank(chatId, action.replace("EXP_BANK_", ""));
    }

    if (action.startsWith("EXP_PERSON_")) {
      return selectPerson(chatId, action.replace("EXP_PERSON_", ""));
    }

    if (action.startsWith("EXP_AMT_")) {
      return saveExpense(chatId, Number(action.replace("EXP_AMT_", "")));
    }

    return bot.sendMessage(chatId, "⚠️ Option not implemented yet", mainMenu);

  } catch (err) {
    console.error("Callback Error:", err);
    bot.sendMessage(chatId, "❌ Something went wrong", mainMenu);
  }
});
