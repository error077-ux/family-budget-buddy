export const loansMenu = {
  reply_markup: {
    inline_keyboard: [
      [{ text: "👀 Active Loans", callback_data: "LOAN_ACTIVE" }],
      [{ text: "✅ Mark Paid", callback_data: "LOAN_PAID" }],
      [{ text: "📜 History", callback_data: "LOAN_HISTORY" }],
      [{ text: "⬅ Back", callback_data: "HOME" }]
    ]
  }
};
