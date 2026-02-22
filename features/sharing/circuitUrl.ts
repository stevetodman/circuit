/**
 * URL-based circuit sharing — T1.2
 *
 * Compresses circuit JSON with the browser-native DeflateRaw stream, encodes
 * as URL-safe base64 and appends as ?c=<encoded>.  Zero external dependencies.
 *
 * Browser support: Chrome 80+, Firefox 113+, Safari 16.4+
 */

export const CIRCUIT_URL_PARAM = 'c';

/** Compress circuit JSON → URL-safe base64 string */
export async function compressCircuit(json: string): Promise<string> {
  const bytes = new TextEncoder().encode(json);
  const cs    = new CompressionStream('deflate-raw');
  const writer = cs.writable.getWriter();
  writer.write(bytes);
  writer.close();
  const buf = await new Response(cs.readable).arrayBuffer();
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g,  '');
}

/** Decompress URL-safe base64 → circuit JSON string */
export async function decompressCircuit(encoded: string): Promise<string> {
  const b64   = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const bin   = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  const ds    = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  writer.write(bytes);
  writer.close();
  const buf = await new Response(ds.readable).arrayBuffer();
  return new TextDecoder().decode(buf);
}
