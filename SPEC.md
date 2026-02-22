# SPEC: Breadboard Row/Column Labels

Add floating 3D text labels to the breadboard so beginners can orient themselves.
This is the first thing tutorial instructions reference ("place in row e, col 5").

## Read First
- `components/canvas/Breadboard.tsx` — breadboard geometry; understand board dimensions
- `components/canvas/Scene.tsx` — see how Breadboard is rendered + what's imported
- `constants/breadboard.ts` — PITCH, COLS, ROWS, BOARD_TOP_Y constants

## What to build

Create a new file `components/canvas/BreadboardLabels.tsx` that renders:
1. **Row letters** (a–j) floating to the LEFT of the board, one per row in the main grid
2. **Column numbers** (1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60) floating BELOW the board

Use `<Text>` from `@react-three/drei`. Import constants from `@/constants/breadboard.ts`:
- `PITCH = 0.254` (spacing between holes)
- `COLS = 63` (number of columns)
- `ROWS = 10` (a=0 through j=9 in the main grid)
- `BOARD_TOP_Y` is the Z-offset to the start of the board grid rows

### Coordinate system
- 1 Three.js unit = 10mm
- Columns run along the X axis; rows run along the Z axis
- The breadboard has a gap in the middle between rows e (index 4) and f (index 5)
- Read Breadboard.tsx to get the exact X/Z origins for hole [0,0] (col 1, row a)

### Row label positions
- For row index r (0=a, 1=b, ..., 9=j), place a Text label at:
  - X: left edge of the board minus a small offset (~ -0.15 units to the left of col 1)
  - Z: the Z position of that row's holes
  - Y: same Y as the board surface (use 0.02 so it floats just above)
- Text content: the letter ('a','b',...,'j')
- fontSize: 0.09
- color: '#555577'
- anchorX: 'right'

### Column number positions
- For column indices [0, 4, 9, 14, 19, 24, 29, 34, 39, 44, 49, 54, 59] (cols 1,5,10,...)
  - Place text at: X = col X position, Z = bottom edge of board + 0.15 offset, Y = 0.02
- Text content: the column number as string ('1','5','10',...)
- fontSize: 0.08
- color: '#555577'
- anchorX: 'center'

### Rendering the component
In `components/canvas/Scene.tsx`:
- Import `BreadboardLabels` from `./BreadboardLabels`
- Add `<BreadboardLabels />` inside the R3F Canvas scene, next to `<Breadboard />`

## Important
- Use `<Text>` from `@react-three/drei` only — no HTML/CSS (this is inside the R3F canvas)
- No new store fields needed — this is purely visual/static
- Do NOT import Three.js directly; use R3F primitives only
- Read Breadboard.tsx carefully to get exact hole positions before placing labels
- Run `pnpm build` — must pass with zero TypeScript errors
