const RES_IMAGES: Array<[string[], string]> = [
  [["aml", "anti-money", "cft", "laundering"],                      "res-aml.jpg"],
  [["intake", "checklist"],                                          "res-intake.jpg"],
  [["motor", "vehicle", "automobile"],                               "res-motor.jpg"],
  [["claim", "claims", "claimant"],                                  "res-claims.jpg"],
  [["conduct", "ethics", "code of conduct"],                        "res-conduct.jpg"],
  [["data protection", "privacy", "gdpr", "personal data"],         "res-data.jpg"],
  [["safety", "fire", "marine", "hazard", "health and safety"],     "res-safety.jpg"],
  [["customer service", "service standards"],                       "res-service.jpg"],
  [["security", "cyber", "information security"],                   "res-data.jpg"],
];

const FALLBACK_CYCLE = [
  "res-aml.jpg", "res-claims.jpg", "res-conduct.jpg", "res-data.jpg",
  "res-intake.jpg", "res-motor.jpg", "res-safety.jpg", "res-service.jpg",
] as const;

/** Returns a background CSS value for a library card thumbnail. */
export function cardThumbBg(title: string, area?: string): string {
  const lower = `${title} ${area ?? ""}`.toLowerCase();
  let img: string | undefined;
  for (const [keys, candidate] of RES_IMAGES) {
    if (keys.some((k) => lower.includes(k))) { img = candidate; break; }
  }
  if (!img) {
    const idx = [...title].reduce((s, c) => s + c.charCodeAt(0), 0) % FALLBACK_CYCLE.length;
    img = FALLBACK_CYCLE[idx]!;
  }
  return `linear-gradient(rgba(0,0,0,0.42),rgba(0,0,0,0.42)),url('/images/${img}') center/cover no-repeat`;
}
