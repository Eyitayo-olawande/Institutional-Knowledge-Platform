import { addNotice, recipients, recordDelivery, type TenantDb } from "@mantle/db/tenant";
import type { Mailer } from "../identity/outbox.ts";
import { createTranslator, type Messages } from "../translation.ts";
import en from "./messages/en.json" with { type: "json" };

// One notification service for every module (Product Architecture v1,
// section 8). A module raises an event; the service renders the template
// for each channel and records every delivery. Version 1 channels: work
// email and in app notices. SMS, WhatsApp and push plug in here later.

export const EVENTS = ["roles.changed"] as const;
export type NotificationEvent = (typeof EVENTS)[number];
export type Channel = "email" | "in_app";

const templates: Record<string, Messages> = { en: en as Messages };

export interface NotifyOptions {
  readonly event: NotificationEvent;
  readonly userIds: readonly string[];
  readonly params: Readonly<Record<string, string>>;
  readonly channels?: readonly Channel[];
  readonly locale?: string;
}

export interface NotifyResult {
  readonly sent: number;
  readonly failed: number;
}

export async function notify(db: TenantDb, mailer: Mailer, options: NotifyOptions): Promise<NotifyResult> {
  const t = createTranslator(templates[options.locale ?? "en"] ?? templates.en!, templates.en);
  const channels = options.channels ?? ["in_app", "email"];
  let sent = 0;
  let failed = 0;
  for (const person of await recipients(db, options.userIds)) {
    const params = { ...options.params, name: person.name };
    const subject = t(`${options.event}.subject`, params);
    const body = t(`${options.event}.body`, params);
    for (const channel of channels) {
      try {
        if (channel === "in_app") await addNotice(db, { userId: person.id, event: options.event, subject, body });
        else await mailer.send({ to: person.email, subject, text: body });
        await recordDelivery(db, { userId: person.id, event: options.event, channel, status: "sent" });
        sent++;
      } catch (error) {
        await recordDelivery(db, {
          userId: person.id,
          event: options.event,
          channel,
          status: "failed",
          error: error instanceof Error ? error.message.slice(0, 500) : "unknown error",
        });
        failed++;
      }
    }
  }
  return { sent, failed };
}
