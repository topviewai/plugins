import { language } from "./locale.mjs";
/** Units/plurals and digits follow the selected locale; the submitted seconds stay numeric. */
export function formatDuration(seconds, accessible = false, locale = language) {
  return new Intl.NumberFormat(locale, {
    style: "unit", unit: "second", unitDisplay: accessible ? "long" : "narrow",
  }).format(seconds);
}
