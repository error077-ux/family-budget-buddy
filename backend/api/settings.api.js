/**
 * Telegram-only PIN handling
 * PIN is read from .env
 * Website PIN logic is untouched
 */

/**
 * Verify Telegram PIN
 * Compares user input with TELEGRAM_PIN from .env
 */
export async function verifyPIN(pin) {
  const envPin = process.env.TELEGRAM_PIN;

  if (!envPin) {
    console.warn("⚠️ TELEGRAM_PIN not set in .env");
    return true; // fail-open to avoid lockout
  }

  return String(pin).trim() === String(envPin).trim();
}

/**
 * Disable PIN changes from Telegram
 * PIN must be changed via .env + server restart
 */
export async function setPIN() {
  throw new Error(
    "Telegram PIN is managed via .env. Update TELEGRAM_PIN and restart the server."
  );
}
