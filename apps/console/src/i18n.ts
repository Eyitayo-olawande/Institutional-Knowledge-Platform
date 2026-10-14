import { createTranslator } from "@mantle/platform/translation";
import en from "../messages/en.json";

// English only at go live. Other locales are added as messages/<locale>.json.
export const t = createTranslator(en);
