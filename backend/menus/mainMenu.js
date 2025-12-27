export const mainMenu = {
  reply_markup: {
    inline_keyboard: [
      [{ text: "➕ Add Expense", callback_data: "EXPENSE_ADD" }],
      [{ text: "📊 Dashboard", callback_data: "DASHBOARD" }],
      [{ text: "🏦 Banks", callback_data: "BANKS" }],
      [{ text: "💳 Credit Cards", callback_data: "CREDIT_CARDS" }],
      [{ text: "📄 Loans", callback_data: "LOANS" }],
      [{ text: "📈 IPO Tracker", callback_data: "IPO" }],
      [{ text: "🔔 Notifications", callback_data: "NOTIFICATIONS" }],
      [{ text: "⚙️ Settings", callback_data: "SETTINGS" }]
    ]
  }
};
