// A realistic Apple Contacts (.vcf) export, vCard 3.0 — the exact shape iOS
// produces from Contacts → Share → Export vCard. Used by the demo's import
// step so a first-time viewer can complete the Apple import without owning an
// iPhone export: this string runs through the real parser in services/vcard.js.
// Names are intentionally distinct from the seeded network so the import shows
// genuinely new people rather than being deduped away.
export const SAMPLE_VCARD = `BEGIN:VCARD
VERSION:3.0
N:Alvarez;Diego;;;
FN:Diego Alvarez
ORG:Sunbelt Retail Partners;
TITLE:Principal
EMAIL;type=INTERNET;type=WORK;type=pref:diego@sunbeltretail.com
TEL;type=CELL;type=VOICE;type=pref:+1 (704) 555-0142
END:VCARD
BEGIN:VCARD
VERSION:3.0
N:Okafor;Renée;;;
FN:Renée Okafor
ORG:Meridian Health Ventures;
TITLE:Director of Partnerships
EMAIL;type=INTERNET;type=WORK;type=pref:renee.okafor@meridianhv.com
TEL;type=CELL;type=VOICE;type=pref:+1 (512) 555-0188
END:VCARD
BEGIN:VCARD
VERSION:3.0
N:Farah;Hassan;;;
FN:Hassan Farah
ORG:Cedar & Vine Capital;
TITLE:Associate
EMAIL;type=INTERNET;type=WORK;type=pref:hassan@cedarvine.co
TEL;type=CELL;type=VOICE;type=pref:+1 (480) 555-0119
END:VCARD
BEGIN:VCARD
VERSION:3.0
N:Lindqvist;Beth;;;
FN:Beth Lindqvist
ORG:Northloop Design Studio;
TITLE:Founder
EMAIL;type=INTERNET;type=WORK;type=pref:beth@northloop.studio
TEL;type=CELL;type=VOICE;type=pref:+1 (612) 555-0176
END:VCARD
BEGIN:VCARD
VERSION:3.0
N:Tanaka;Wes;;;
FN:Wes Tanaka
ORG:Harbor Point Advisory;
TITLE:VP, Corporate Development
EMAIL;type=INTERNET;type=WORK;type=pref:wes.tanaka@harborpoint.com
TEL;type=CELL;type=VOICE;type=pref:+1 (206) 555-0133
END:VCARD`
