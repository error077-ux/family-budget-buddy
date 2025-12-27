export const notificationsMenu = {
  reply_markup: {
    inline_keyboard: [
      [{ text: "➕ Add Reminder", callback_data: "NOTIF_ADD" }],
      [{ text: "📅 Upcoming", callback_data: "NOTIF_VIEW" }],
      [{ text: "⬅ Back", callback_data: "HOME" }]
    ]
  }
};
