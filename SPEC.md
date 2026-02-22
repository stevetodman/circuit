# SPEC: Arduino Serial Monitor

## Goal
Surface `Serial.print()` / `Serial.println()` output in the ArduinoPanel UI.
avr8js already emulates the USART hardware — we just need to wire it to the UI.
Run `pnpm build` to verify — must pass with zero errors.

---

## How avr8js Serial Works

avr8js exposes USART via `AVRUSART` class:
```typescript
import { AVRUSART } from '@es-labs/avr8js';  // or wherever it's exported in the project

const usart = new AVRUSART(cpu, usartConfig, 16e6);
usart.onByteTransmit = (byte: number) => {
  // byte is the ASCII code of the character sent by Serial.print()
  const char = String.fromCharCode(byte);
  // accumulate and send to main thread
};
```

Check the existing import in `simulation/workers/arduino.worker.ts` to find the exact
import path and config object name. Search for `AVRUSART` or `usart` in that file.

---

## Implementation

### 1. arduino.worker.ts — capture serial output

In `simulation/workers/arduino.worker.ts`:

After creating the CPU and existing peripherals (AVRADC, ports), add:
```typescript
import { AVRUSART } from '<same-package-as-AVRADC>';

// In UPLOAD_HEX handler, after existing setup:
let serialBuffer = '';
const usart = new AVRUSART(cpu, usartConfig, 16e6);  // check exact config name

usart.onByteTransmit = (byte: number) => {
  const char = String.fromCharCode(byte);
  serialBuffer += char;
  // Flush on newline or when buffer > 256 chars
  if (char === '\n' || serialBuffer.length > 256) {
    self.postMessage({ type: 'SERIAL_OUTPUT', text: serialBuffer });
    serialBuffer = '';
  }
};
```

Also flush any remaining buffer periodically (every 100ms) even without newline.

### 2. SimController.tsx — receive serial output

In `components/SimController.tsx`:
- Add handler for `'SERIAL_OUTPUT'` message from arduino worker:
  ```typescript
  case 'SERIAL_OUTPUT':
    useUIStore.getState().appendSerialOutput(data.text);
    break;
  ```

### 3. uiStore.ts — store serial output

In `store/uiStore.ts`:
- Add `serialOutput: string` (default: `''`)
- Add `appendSerialOutput(text: string): void` — append to serialOutput, cap at 10,000 chars
  (trim from front if over limit to prevent memory leak)
- Add `clearSerialOutput(): void` — set to `''`

On `UPLOAD_HEX` (new sketch uploaded), clear serial output:
```typescript
case 'UPLOAD_HEX':
  useUIStore.getState().clearSerialOutput();
  // ... existing code
```

### 4. ArduinoPanel.tsx — display serial monitor

In `components/sidebar/ArduinoPanel.tsx`:
- Add a "Serial Monitor" section below the existing hex upload / controls
- Read `serialOutput` from uiStore
- Display in a scrollable `<pre>` or `<div>` with monospace font, dark background
- Auto-scroll to bottom when new output arrives (use `useEffect` + `ref.scrollTop = ref.scrollHeight`)
- Add a "Clear" button that calls `clearSerialOutput()`
- Show placeholder text "No serial output yet. Upload a sketch with Serial.print()." when empty

**UI design:**
```
[Serial Monitor]                              [Clear]
┌─────────────────────────────────────────────────────┐
│ Hello World!                                        │
│ Sensor: 512                                         │
│ Sensor: 489                                         │
│ ...                                                 │
└─────────────────────────────────────────────────────┘
```

Style to match existing ArduinoPanel dark theme:
- Background: `bg-[#0a0a0c]`
- Text: `text-green-400` (classic terminal green) or `text-white/70`
- Font: `font-mono text-xs`
- Height: fixed at 160px with `overflow-y-auto`
- Border: `border border-white/10 rounded`

Only show Serial Monitor section when `serialOutput.length > 0` OR always show it
(always show is simpler and more discoverable).

### 5. Baud Rate
avr8js AVRUSART handles baud rate automatically from the UBRR register.
Standard Arduino `Serial.begin(9600)` sets up UBRR correctly. No manual config needed.

---

## Testing

Upload the following Arduino sketch to test:
```cpp
void setup() {
  Serial.begin(9600);
}
void loop() {
  Serial.println("Hello from Arduino!");
  delay(1000);
}
```

The serial monitor should show "Hello from Arduino!" appearing once per simulated second.

---

## Implementation Notes

- Do NOT add new npm packages
- Check if AVRUSART is already imported in arduino.worker.ts — it may already be there
- The `usartConfig` — look for it in the avr8js package (usually `usart0Config` or similar)
- If avr8js doesn't export AVRUSART from the expected path, search node_modules for the correct import
- Run `pnpm build` — fix all TypeScript errors before considering done
