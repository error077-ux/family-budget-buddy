export const settingsMenu = {
  reply_markup: {
    inline_keyboard: [
      [{ text: "👤 Manage Persons", callback_data: "SET_PERSONS" }],
      [{ text: "🔐 Change PIN", callback_data: "SET_PIN" }],
      [{ text: "⬅ Back", callback_data: "HOME" }]
    ]
  }
};
