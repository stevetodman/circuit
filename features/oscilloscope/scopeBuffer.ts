export const SCOPE_SAMPLES = 4096;
export const MAX_CHANNELS = 4;

const buffers = new Map<number, Float32Array>();
const heads = new Map<number, number>();
const sampleCounts = new Map<number, number>();

function getOrCreate(netId: number): Float32Array {
  let buffer = buffers.get(netId);
  if (!buffer) {
    buffer = new Float32Array(SCOPE_SAMPLES);
    buffers.set(netId, buffer);
    heads.set(netId, 0);
    sampleCounts.set(netId, 0);
  }
  return buffer;
}

export function pushSample(netId: number, voltage: number): void {
  if (!Number.isFinite(voltage)) {
    return;
  }

  const buffer = getOrCreate(netId);
  const head = heads.get(netId) ?? 0;
  buffer[head] = voltage;

  const nextHead = (head + 1) % SCOPE_SAMPLES;
  heads.set(netId, nextHead);
  sampleCounts.set(netId, Math.min((sampleCounts.get(netId) ?? 0) + 1, SCOPE_SAMPLES));
}

export function getSamples(netId: number): Float32Array {
  const buffer = buffers.get(netId);
  if (!buffer) {
    return new Float32Array(0);
  }

  const count = sampleCounts.get(netId) ?? 0;
  const head = heads.get(netId) ?? 0;
  const out = new Float32Array(count);
  if (count === 0) return out;

  if (count < SCOPE_SAMPLES) {
    out.set(buffer.subarray(0, count));
    return out;
  }

  const firstChunk = buffer.subarray(head);
  const secondChunk = buffer.subarray(0, head);
  out.set(firstChunk);
  out.set(secondChunk, firstChunk.length);
  return out;
}

export function clearChannel(netId: number): void {
  buffers.delete(netId);
  heads.delete(netId);
  sampleCounts.delete(netId);
}

export function activeNets(): number[] {
  const nets: number[] = [];
  for (const [netId, count] of sampleCounts) {
    if (count > 0) {
      nets.push(netId);
    }
  }
  return nets;
}
