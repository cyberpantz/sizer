/* Catalogue type -> the shape worth drawing.

   ONE map, because there are two renderers. The Astro card imports it; the
   mockup generator projects it into the inlined catalogue. When these were
   separately maintained the mockups drew nothing at all: the pages keyed their
   silhouettes and their filter pills on "spinner", the catalogue says
   "hardside spinner", and a missing key in JavaScript is not an error — it is
   `undefined`, quietly, on every card.

   The catalogue is deliberately finer than this. A hardside and a softside
   spinner behave differently under a gate sizer (see SQUISH_CM) and must stay
   distinct in the data; they are the same picture and the same thing to a
   reader choosing between shapes. Map, don't flatten the source. */
export const SHAPE = {
  'hardside spinner': 'spinner',
  'softside spinner': 'spinner',
  '2-wheel roller': 'roller',
  backpack: 'backpack',
  duffel: 'duffel',
  underseat: 'underseat',
};

/** Never guesses. An unmapped type is a data change nobody has drawn for yet,
 *  and silently drawing it as a spinner is how a wheelless duffel ends up with
 *  wheels on the one card that claims it clears every airline. */
export function shapeOf(type) {
  return SHAPE[type] ?? null;
}
