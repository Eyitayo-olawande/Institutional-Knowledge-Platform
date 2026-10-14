// Screen text lookup. All text shown to people comes from message files,
// never from code (CLAUDE.md; ADR 0011). English at go live, French and
// others later, so every lookup goes through a locale's messages.

export type Messages = { readonly [key: string]: string | Messages };

export type Params = Readonly<Record<string, string | number>>;

export type Translate = (key: string, params?: Params) => string;

function lookup(messages: Messages, key: string): string | undefined {
  let node: string | Messages | undefined = messages;
  for (const part of key.split(".")) {
    if (typeof node !== "object") return undefined;
    node = node[part];
  }
  return typeof node === "string" ? node : undefined;
}

function interpolate(text: string, params: Params | undefined): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

// Looks a key up in the locale's messages, then in the fallback (English).
// A missing key returns the key itself so the gap is visible on screen and
// caught by the message file tests.
export function createTranslator(messages: Messages, fallback?: Messages): Translate {
  return (key, params) => {
    const text = lookup(messages, key) ?? (fallback && lookup(fallback, key));
    return text === undefined ? key : interpolate(text, params);
  };
}

// Every dotted key in a message file, used to check locales stay in step.
export function messageKeys(messages: Messages, prefix = ""): string[] {
  return Object.entries(messages).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string" ? [path] : messageKeys(value, path);
  });
}
