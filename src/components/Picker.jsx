/* One picker, for anything with a long list: Downshift's useCombobox, our
   markup.

   Replaces a <select> of 58 airlines heading for 100, AND a <select> of 39
   bags — controls that got measurably worse with every record we added, which
   is a perverse relationship with the main job on this project.

   ONE component for both, because two would drift. The only thing that differs
   between an airline and a bag here is the label and which slot the answer
   belongs to, and both are props.

   WHY DOWNSHIFT AND NOT MY OWN. I started writing one and it was the wrong
   call: keyboard handling, aria-activedescendant, the live region that
   announces "3 results are available", touch, IME. Downshift is 3.6M installs
   a week of exactly that, and it is headless — every element, class and word
   below is ours.

   WHY THIS IS A PREACT ISLAND. Downshift is React-only; there is no vanilla
   build. preact/compat runs it unmodified at ~4 kB instead of ~45. Astro
   hydrates only this component, so every other page on the site stays static
   HTML with no framework in it.

   WHY IT TALKS IN DOM EVENTS. Astro cannot pass a function across the island
   boundary — props are serialised. So the picker announces a choice with a
   CustomEvent and the page script listens. That keeps every verdict decision
   in the page, where the engine is, and leaves this component responsible for
   one thing: choosing an item.

   DELIBERATE BEHAVIOUR, each of which is easy to get wrong:

   - Never invents a choice. Typing something that matches nothing leaves the
     previous selection and says so. A picker that silently keeps the old value
     behind new text is how someone checks a bag against the wrong airline.
   - Escape restores rather than clears. "Forget what I typed" must not also
     mean "forget what I chose".
   - Opening shows everything. Someone who does not know the airline's name
     needs to read a list, exactly as they would a <select>. Nothing is hidden
     behind knowing to type.
   - The count of hidden matches is shown. A truncated list that looks complete
     is a lie about the dataset. */
import { useCombobox } from 'downshift';
import { useMemo, useState } from 'preact/hooks';
import { search } from '../ui/search.mjs';

/* Enough to scroll, few enough to render instantly. Above this the count is
   shown instead of silently cutting the list. */
const MAX_VISIBLE = 50;

export default function Picker({
  items = [],
  value,
  label,
  /* Which list this is ("airline" | "bag") and which slot in it. Both travel
     back out on the event so the page can put the answer in the right place
     without this component knowing anything about trips or catalogues. */
  kind = 'item',
  index = 0,
  placeholder = 'Type to search',
  name,
}) {
  /* The input is CONTROLLED and holds the query, not the choice. The chosen
     airline shows as the placeholder, so an abandoned search never leaves
     misleading text sitting in a field that still points somewhere else. */
  const [query, setQuery] = useState('');
  const selected = items.find((i) => i.value === value) ?? null;

  /* Ranking is ours: exact IATA code first, so "BA" finds British Airways
     rather than whatever matches those two letters by substring. Domain logic,
     tested separately in ui/__tests__/search.test.mjs. */
  const matches = useMemo(() => search(query, items), [query, items]);
  const visible = matches.slice(0, MAX_VISIBLE);

  const {
    isOpen,
    getLabelProps,
    getToggleButtonProps,
    getMenuProps,
    getInputProps,
    getItemProps,
    highlightedIndex,
  } = useCombobox({
    items: visible,
    selectedItem: selected,
    itemToString: (i) => i?.name ?? '',
    inputValue: query,
    onInputValueChange: ({ inputValue }) => setQuery(inputValue ?? ''),
    onIsOpenChange: ({ isOpen: nowOpen }) => {
      /* Opening clears the query so the whole list shows and the first
         keystroke starts fresh, rather than appending to the airline's name.
         Closing restores the selection as the visible text. */
      if (nowOpen) setQuery('');
    },
    onSelectedItemChange: ({ selectedItem }) => {
      if (!selectedItem) return;
      setQuery('');
      /* The page owns the trip and the engine; this component owns one field.
         See the header — Astro cannot hand us a callback. */
      document.dispatchEvent(
        new CustomEvent('sizer:pick', {
          detail: { kind, index, value: selectedItem.value },
        })
      );
    },
  });

  return (
    <div class="relative">
      <label
        {...getLabelProps()}
        class="block text-[0.8125rem] font-medium text-muted"
      >
        {label}
      </label>

      <div class="relative mt-1">
        <input
          {...getInputProps({
            placeholder: selected ? selected.name : placeholder,
            spellcheck: false,
            autocomplete: 'off',
          })}
          class="w-full rounded-chip border border-rule-strong bg-surface py-2 pr-9 pl-3 text-[1.03125rem] font-semibold text-ink placeholder:font-normal placeholder:text-ink focus:border-blue"
        />
        <button
          type="button"
          {...getToggleButtonProps()}
          aria-label={`Show all ${kind}s`}
          class="absolute inset-y-0 right-0 grid w-9 cursor-pointer place-items-center text-muted hover:text-blue"
        >
          ▾
        </button>
        {/* Keeps the choice in the form even though the visible input holds a
            search query. Also what a no-JS fallback would post. */}
        {name && <input type="hidden" name={name} value={value ?? ''} />}
      </div>

      <ul
        {...getMenuProps()}
        class={
          isOpen
            /* max-h caps the drop so it cannot run off the viewport on a
               short screen; the panel around it no longer clips it. z-30 puts
               it above the panel below, which paints after this one. */
            ? 'absolute z-30 mt-1 max-h-80 w-full overflow-y-auto rounded-card border border-rule-strong bg-surface py-1 shadow-panel'
            : 'hidden'
        }
      >
        {isOpen && visible.length === 0 && (
          <li class="px-3 py-2 text-[0.9375rem] text-muted">
            No {kind} matches “{query}”. {selected ? `Still set to ${selected.name}.` : ''}
          </li>
        )}

        {isOpen &&
          visible.map((item, index) => (
            <li
              key={item.value}
              {...getItemProps({ item, index })}
              class={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-[0.9375rem] ${
                highlightedIndex === index ? 'bg-blue-wash text-blue' : ''
              } ${item.value === value ? 'font-semibold' : ''}`}
            >
              <span>{item.name}</span>
              {item.code && <span class="font-mono text-[0.8125rem] text-muted">{item.code}</span>}
            </li>
          ))}

        {isOpen && matches.length > visible.length && (
          <li class="px-3 py-2 text-[0.8125rem] text-muted">
            {matches.length - visible.length} more — keep typing to narrow it down
          </li>
        )}
      </ul>
    </div>
  );
}
