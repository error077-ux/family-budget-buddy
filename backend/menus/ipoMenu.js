export const ipoMenu = {
  reply_markup: {
    inline_keyboard: [
      [{ text: "➕ Add IPO", callback_data: "IPO_ADD" }],
      [{ text: "📋 View IPOs", callback_data: "IPO_VIEW" }],
      [{ text: "📊 P/L Summary", callback_data: "IPO_PL" }],
      [{ text: "⬅ Back", callback_data: "HOME" }]
    ]
  }
};
