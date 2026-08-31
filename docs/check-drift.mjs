import fs from "fs";
const docs=fs.readdirSync(".").filter(f=>/^\d\d-.*\.md$/.test(f));
let bad=0; const flag=(f,l,why)=>{bad++;console.log(`  ${f}:${l}  ${why}`)};
for (const f of docs) {
  fs.readFileSync(f,"utf8").split("\n").forEach((line,i)=>{
    const n=i+1;
    // /airline/* used as a competitive surface
    if (/\/airline\/\[slug\]|\/airline\/ryanair/.test(line)
        && !/reference|not promoted|not in the sitemap|transparency|unpromoted/i.test(line))
      flag(f,n,"/airline/* outside a reference context → use /luggage-for/*");
    // carrier count drift
    const m=line.match(/\b(\d\d) (?:carriers|airlines)\b/);
    if (m && !["50","12","24"].includes(m[1]) && !/mock|placeholder|prototype|competitor|190|172/i.test(line))
      flag(f,n,`carrier count "${m[1]}" — launch target is 50`);
    // unit toggle
    if (/unit/i.test(line) && /(both shown, always|never a toggle|metric by default)/i.test(line))
      flag(f,n,"units: inches for US locale, cm elsewhere, always-visible toggle");
    // dead typeface
    if (/Barlow/.test(line) && !/gone|removed|replaced/i.test(line)) flag(f,n,"Barlow — typeface is Figtree");
    // undefined tokens
    for (const t of ["--signal-mute","--signal-dim","--paper-surface","--ink-type"])
      if (line.includes(t)) flag(f,n,`undefined token ${t}`);
  });
}
console.log(bad ? `\n${bad} drift issue(s)` : "\nno drift — docs agree with the canonical decisions");
process.exit(bad?1:0);
