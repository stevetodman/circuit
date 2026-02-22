# SPEC: Sidebar UX Fixes

Several sidebar issues to fix. Read each file fully before editing.

## Fix 1: Parts List Scroll

File: `components/sidebar/Sidebar.tsx`

The parts list is getting cut off — only Battery and Wire are visible in screenshots. The sidebar needs proper flex layout so the parts list scrolls independently while the status bar stays pinned at the bottom.

Read `Sidebar.tsx` to understand the current layout structure. Ensure the parts panel section is `flex-1 overflow-y-auto` so it scrolls, while StatusBar stays at the bottom with `flex-shrink-0`.

## Fix 2: Export Panel Less Prominent 

File: `components/sidebar/Sidebar.tsx`

The SPICE export panel (Export .cir) and the raw SPICE code preview take up too much sidebar space. Make it collapsed by default — just show an "Export .cir" button, and clicking it toggles open the full export panel with Save JSON / Load JSON / Copy link / SPICE preview.

Read `ExportPanel.tsx` and `Sidebar.tsx` to understand what's rendered. The fix is likely adding a `collapsed` toggle using `useState` in the Sidebar around where ExportPanel is rendered.

Actually, look at it and just make the SPICE code block hidden by default (collapsed). Add a small "Show netlist" toggle link under the Export .cir section. The code block is the main space hog.

## Fix 3: Learn Tab Sidebar Scroll

File: `components/sidebar/Sidebar.tsx`  

When the Learn tab is active, the module list needs to scroll if there are too many modules. The LearnPanel should be wrapped in `overflow-y-auto` within the tab content area.

## Fix 4: Health Warning Visibility

File: `components/sidebar/StatusBar.tsx`

The health warning text at the bottom is getting clipped. Check the current rendering and add `overflow-hidden text-ellipsis` or `flex-shrink-0` where needed. The warning message should always be fully visible without being cut off.

Run `pnpm build` — must pass with zero errors.
