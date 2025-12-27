export const expensesMenu = {
  reply_markup: {
    inline_keyboard: [
      [{ text: "➕ New Expense", callback_data: "EXPENSE_NEW" }],
      [{ text: "🗑 Delete Expense", callback_data: "EXPENSE_DELETE" }],
      [{ text: "⬅ Back", callback_data: "HOME" }]
    ]
  }
};
