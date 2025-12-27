export const creditCardsMenu = {
  reply_markup: {
    inline_keyboard: [
      [{ text: "👀 View Cards", callback_data: "CARD_VIEW" }],
      [{ text: "📅 Due Dates", callback_data: "CARD_DUE" }],
      [{ text: "💸 Pay Card", callback_data: "CARD_PAY" }],
      [{ text: "⬅ Back", callback_data: "HOME" }]
    ]
  }
};
