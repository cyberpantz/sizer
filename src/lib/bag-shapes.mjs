/* The shape pills, and the editorial that makes them worth having.
 *
 * Lifted out of BagFilters.astro so BOTH the frontmatter and the browser script
 * can import them from one place. That was not a tidying exercise — it removed
 * `define:vars` from that component, which is what was blocking the filter
 * logic from living in a module a test can reach.
 *
 * `define:vars` makes a script INLINE, and an inline script cannot use ESM
 * imports: the browser has no way to resolve a bare specifier. So every value
 * the script needed had to be serialised through that attribute, and anything
 * that could not be serialised — a function — had to be written out again
 * inside the script. That is how the facet MATCHING rule ended up duplicated
 * beside the facet COUNTING rule, which bag-facets.mjs opens by warning
 * against: "two copies of this is exactly how a count starts describing a
 * different set of bags than the filter returns."
 *
 * Data moves through modules or through the DOM; only that combination lets
 * the behaviour be tested.
 *
 * GROUPS, NOT RAW TYPES. A reader thinks "spinner", not "hardside spinner" and
 * "softside spinner" as two separate ideas. The catalogue keeps the finer
 * types; this maps several onto one pill.
 */
export const GROUPS = [
  { id: 'spinner', label: 'Spinners', types: ['hardside spinner', 'softside spinner'] },
  { id: 'roller', label: '2-wheel rollers', types: ['2-wheel roller'] },
  { id: 'backpack', label: 'Backpacks', types: ['backpack'] },
  { id: 'duffel', label: 'Duffels', types: ['duffel'] },
  { id: 'underseat', label: 'Under-seat', types: ['underseat'] },
];

/* THE NOTE IS THE POINT. A pill labelled "2-wheel rollers" tells you nothing;
   the note tells you what that shape costs you at an airport. Editorial that
   appears only when it is relevant, which beats a wall of prose at the bottom
   of a page nobody scrolls to. */
export const NOTES = {
  spinner: {
    lead: 'What most people want, and for good reason.',
    body: 'You push a spinner alongside you instead of dragging it behind — the difference between a pleasant walk and a miserable one across a long terminal. The trade-off: the wheels sit below the shell, so a spinner tends to stand 1–2 cm taller than the same bag on two wheels. Worth knowing before you buy, not a reason to avoid them.',
  },
  roller: {
    lead: 'Better on anything rougher than a polished floor.',
    body: 'You drag these rather than push them, which is more work across a terminal. But Pack Hacker rolled every bag over cobblestones and grass and found the second pair of wheels stops helping the moment the surface does — their highest score on brick went to a two-wheeler. The wheels are also recessed into the corners, so a roller sometimes clears a limit the spinner version of the same bag fails.',
  },
  backpack: {
    lead: 'Nothing sticking out to count against the limit.',
    body: 'No wheels, no telescoping handle, so the bag measures what it measures. Stairs, cobbles and kerbs stop being a problem. You carry the weight, which is the whole trade.',
  },
  duffel: {
    lead: 'The most forgiving shape under a sizer.',
    body: 'A soft duffel compresses into a frame in a way a hard shell never will, which is why the one bag in our catalogue that clears every airline has no wheels at all. It is also the least convenient thing to move any real distance.',
  },
  underseat: {
    lead: 'A different allowance, not a small carry-on.',
    body: 'Sized for the space under the seat in front of you. On a budget-airline basic fare this is often the only bag included — no overhead bag at any size — which makes it the right answer to a question the carry-on shelves cannot help with.',
  },
};

export const typesFor = (id) => GROUPS.find((g) => g.id === id)?.types ?? [];
