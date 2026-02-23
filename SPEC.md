# SPEC: Preserve Motor State Across Topology Changes

## Problem
In `simulation/workers/analog.worker.ts`, every time the circuit topology changes
(UPDATE_NETLIST message), `motorState.clear()` wipes all accumulated motor angular
velocity. This causes motors to snap back to rest (omega=0) whenever the user
moves a component, changes a value, or modifies any wire.

## Current Code (analog.worker.ts)
```ts
case 'UPDATE_NETLIST': {
  ...
  motorState.clear();  // ← clears ALL motor state on every topology change
  const result = solveDC(currentNetlist, ...);
  ...
}
```

## Fix

Instead of clearing all motor state, only remove entries for motor IDs that are
no longer in the new netlist:

```ts
case 'UPDATE_NETLIST': {
  ...
  // Build set of motor IDs in new netlist
  const newMotorIds = new Set(
    currentNetlist.elements
      .filter(el => el.kind === 'motor')
      .map(el => el.id)
  );
  // Remove only motors that were deleted from the circuit
  for (const id of motorState.keys()) {
    if (!newMotorIds.has(id)) motorState.delete(id);
  }
  // Do NOT call motorState.clear()

  const result = solveDC(currentNetlist, ...);
  ...
}
```

## How motorState Works
- `motorState` is a `Map<string, MotorState>` where key is element.id
- `MotorState` holds `{ omega: number }` (angular velocity in rad/s)
- `updateMotorState(voltages, netlist)` updates omega for each motor
- `solveDC(netlist, dt, prevV, prevI, motorState)` uses motorState to compute back-EMF

## Files to Change
- `simulation/workers/analog.worker.ts` only
- Find the `motorState.clear()` line in the UPDATE_NETLIST handler and replace it
  with the selective-clear logic above

## What NOT to do
- Do NOT change the motor model math
- Do NOT change motorState structure
- Only 1 file, localized change in UPDATE_NETLIST handler
