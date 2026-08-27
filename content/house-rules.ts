/**
 * `rulesVersion` is stored on every acceptance record (rules_text_snapshot
 * + rules_version) — bump it whenever this content changes so old
 * acceptances stay tied to what the guest actually agreed to.
 */
export const rulesVersion = "2026-08-27-v2";

export const houseRules = [
  "Be cool to the neighbors — city-mandated quiet hours (10pm–8am) and no parties, full stop.",
  "Be cool to Sofia and Sage — no smoking or vaping inside (cleaning fee applies). We're a family-run spot and don't want our kiddos around that stuff.",
];

export const houseRulesFootnote =
  "These are the two we really don't budge on — full house rules were included in your booking confirmation.";

/** Flattened plain-text version, captured verbatim into the acceptance record. */
export const houseRulesText = [
  ...houseRules.map((rule, i) => `${i + 1}) ${rule}`),
  "",
  houseRulesFootnote,
].join("\n");
