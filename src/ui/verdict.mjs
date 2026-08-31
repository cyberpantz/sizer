/* Verdict copy. One source, previously three — and they had already drifted:
   "Won't fit" on the bag page, "It won't fit" on the others.

   The engine returns bands and figures. All wording lives here, so a copy change
   is one edit and cannot disagree with itself. */

export const BAND_COPY = {
  clears: { label: 'It fits', tone: 'good', token: 'var(--green)' },
  line: { label: 'Just fits', tone: 'caution', token: 'var(--amber)' },
  gamble: { label: 'Risky', tone: 'warn', token: 'var(--orange)' },
  wont: { label: "It won't fit", tone: 'bad', token: 'var(--red)' },
};

/* Editorial policy 16: we report measurements, not accusations. "Turned away",
   never "refused". Kept as a test, because this wording slipped once already. */
export const BANNED = /\brefus|\bscam|\brip.?off|\bcheat|\bgreedy/i;

export function bandLabel(band) {
  if (band == null) return 'Not flying';
  return BAND_COPY[band]?.label ?? 'Unknown';
}

/** The one-line explanation under the verdict. Takes engine output and a units
 *  instance; returns a string. */
export function verdictLine(result, U) {
  if (result.not_flying) return 'This airline no longer operates.';
  if (result.no_cabin_bag) return 'This fare includes no cabin bag at any size.';

  const d = result.delta_cm;
  if (d > 0) return `${U.len(d)} ${U.lenLabel()} too ${result.dimension}.`;
  if (d === 0) return 'Exactly on the limit.';
  return `${U.len(Math.abs(d))} ${U.lenLabel()} to spare.`;
}

/** Advisory copy. Engine returns figures; sentences are built here. */
export function advisoryLine(a, U) {
  switch (a.id) {
    case 'no_cabin_bag':
      return 'No cabin bag is permitted on this fare, whatever its size.';
    case 'agent_commission':
      return `Gate staff at this airline are paid ${a.amount_usd ? `up to $${a.amount_usd} ` : ''}for each bag charged at the gate.`;
    case 'regional_jet':
      return 'Often flown on a regional jet, whose bins will not take a full-size carry-on. Expect a free gate-check.';
    case 'squish':
      return a.level === 'may_squeeze'
        ? `Over by ${U.len(a.over_cm)} ${U.lenLabel()}. A soft bag this close usually compresses into a sizer — but that is the gate agent's call.`
        : `Over by ${U.len(a.over_cm)} ${U.lenLabel()} and the shell is rigid. It will not compress.`;
    case 'weight': {
      /* A shared cap covers the carry-on AND the personal item. The remainder
         is not "to pack" — it has to cover the second bag as well, and saying
         otherwise is generous in the direction that costs money. */
      const cap = a.shared
        ? `${U.mass(a.cap_kg)} ${U.massLabel()} for this bag and your personal item TOGETHER`
        : `${U.mass(a.cap_kg)} ${U.massLabel()}`;
      if (a.level === 'over') {
        return `The empty bag is ${U.mass(a.bag_kg)} ${U.massLabel()} against a limit of ${cap} — over before you pack.`;
      }
      return a.shared
        ? `Their limit is ${cap}. The empty suitcase is already ${U.mass(a.bag_kg)} ${U.massLabel()} of it, leaving ${U.mass(a.left_kg)} ${U.massLabel()} for everything you pack AND whatever you carry on top.`
        : `Their limit is ${cap} and the empty bag is ${U.mass(a.bag_kg)} ${U.massLabel()} of it. That leaves ${U.mass(a.left_kg)} ${U.massLabel()} to pack.`;
    }
    case 'expansion':
      return `Compliant until you use the expander, which adds ${U.len(a.expands_cm)} ${U.lenLabel()}.`;
    default:
      return '';
  }
}
