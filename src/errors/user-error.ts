import { getMessages } from '@/i18n/messages';

/**
 * Maps a thrown value to a message safe to show a user.
 *
 * The app's own domain errors (AccountActionError, TransactionActionError,
 * RefundActionError, credit-card and backup errors, …) already carry curated,
 * user-facing messages, so those pass through. Raw driver/runtime text — SQLite
 * constraint failures, safe-integer range errors, undefined-field errors, and
 * anything that looks technical — is replaced with a neutral fallback so it is
 * never surfaced. Callers keep the original error for development logging.
 *
 * This is intentionally conservative: when a message looks technical at all, we
 * prefer the fallback over leaking implementation detail.
 */
const TECHNICAL_ERROR_PATTERN =
  /sqlite|constraint failed|foreign key|unique constraint|not null constraint|datatype mismatch|no such (table|column|row)|database is locked|disk i\/o|malformed|out of memory|cannot start a transaction|safe integer|safe cop|undefined is not|null is not|is not a function|cannot read propert|cannot read field/i;

export function toUserMessage(cause: unknown, fallback: string = getMessages().common.genericError): string {
  if (cause instanceof Error) {
    const message = cause.message?.trim();
    if (message && !TECHNICAL_ERROR_PATTERN.test(message) && !message.includes('\n at ')) {
      return message;
    }
  }
  return fallback;
}
