# SPEC: Parts Category Filter Chips

## Goal
Add category filter chips above the parts list in the sidebar so users can
quickly filter by Passive, Active, Power, or Digital/IC components.

## Current State
- `components/sidebar/Sidebar.tsx` has a text search `<input>` that filters `PARTS`
- `PARTS` is an array of objects with `type`, `label`, `icon`, `tooltip`
- No category grouping or filter chips exist

## Changes Required

### `components/sidebar/Sidebar.tsx`
Read the file to understand the current PARTS array and search filter.

1. Add category metadata to each part. Define a local type and mapping:
```tsx
type Category = 'all' | 'passive' | 'active' | 'power' | 'ic';

const PART_CATEGORIES: Record<string, Category> = {
  resistor: 'passive',
  capacitor: 'passive',
  inductor: 'passive',
  potentiometer: 'passive',
  led: 'active',
  diode: 'active',
  bjt: 'active',
  mosfet: 'active',
  battery: 'power',
  motor: 'active',
  'tactile-switch': 'passive',
  timer555: 'ic',
  'op-amp': 'ic',
  arduino: 'ic',
  wire: 'passive',
};
```

2. Add `const [category, setCategory] = useState<Category>('all')` state.

3. Add category chip UI between the search input and parts list:
```tsx
<div className="flex gap-1 px-2 pb-1 flex-wrap">
  {(['all', 'passive', 'active', 'power', 'ic'] as Category[]).map((cat) => (
    <button
      key={cat}
      onClick={() => setCategory(cat)}
      className={`text-[9px] px-1.5 py-0.5 rounded-full border transition-colors ${
        category === cat
          ? 'bg-violet-500/25 border-violet-500/50 text-violet-200'
          : 'border-white/[0.1] text-white/35 hover:text-white/60 hover:border-white/20'
      }`}
    >
      {cat === 'all' ? 'All' : cat === 'passive' ? 'Passive' : cat === 'active' ? 'Active' : cat === 'power' ? 'Power' : 'ICs'}
    </button>
  ))}
</div>
```

4. Update the parts filter to use BOTH query AND category:
```tsx
const filteredParts = PARTS.filter((p) => {
  const matchesQuery = !query || p.label.toLowerCase().includes(query.toLowerCase());
  const matchesCategory = category === 'all' || PART_CATEGORIES[p.type] === category;
  return matchesQuery && matchesCategory;
});
```
Use `filteredParts` in the `.map()` instead of the inline filter.

5. When the search `query` changes and is non-empty, reset category to `'all'`:
```tsx
onChange={(e) => { setQuery(e.target.value); if (e.target.value) setCategory('all'); }}
```

## What NOT to do
- Do NOT change PARTS array structure (keep type, label, icon, tooltip)
- Do NOT add categories to the PARTS constant — keep PART_CATEGORIES separate
- Do NOT change any other file — only Sidebar.tsx
