export const banksMenu = {
  reply_markup: {
    inline_keyboard: [
      [{ text: "👀 View Banks", callback_data: "BANK_VIEW" }],
      [{ text: "➕ Add Bank", callback_data: "BANK_ADD" }],
      [{ text: "📄 Bank Ledger", callback_data: "BANK_LEDGER" }],
      [{ text: "⬅ Back", callback_data: "HOME" }]
    ]
  }
};
