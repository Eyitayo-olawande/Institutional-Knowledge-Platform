import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

// Development stand in for the transactional email provider (ADR 0008,
// provider deferred). Messages go to a local file that git ignores, never
// to logs. Production refuses to send until a provider is configured.
export interface Mailer {
  send(message: { to: string; subject: string; text: string }): Promise<void>;
}

export function developmentOutbox(file = process.env.MANTLE_OUTBOX_FILE || ".data/outbox.log"): Mailer {
  return {
    async send(message) {
      if (process.env.NODE_ENV === "production") {
        throw new Error("No email provider configured. The development outbox is not available in production.");
      }
      await mkdir(dirname(file), { recursive: true });
      await appendFile(file, `${new Date().toISOString()} to=${message.to} subject=${message.subject}\n${message.text}\n\n`);
    },
  };
}
