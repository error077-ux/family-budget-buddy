export const dashboardMenu = {
  reply_markup: {
    inline_keyboard: [
      [{ text: "📅 Today", callback_data: "DASH_TODAY" }],
      [{ text: "📆 This Month", callback_data: "DASH_MONTH" }],
      [{ text: "💳 Outstanding", callback_data: "DASH_OUTSTANDING" }],
      [{ text: "⬅ Back", callback_data: "HOME" }]
    ]
  }
};
