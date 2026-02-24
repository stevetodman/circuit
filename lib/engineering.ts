/**
 * Parses an engineering-notation string into a number.
 *
 * Supported suffixes:
 *   k / K  → ×1,000        (kilo)
 *   M      → ×1,000,000    (mega)
 *   m      → ×0.001        (milli)
 *   u / U  → ×1e-6         (micro)
 *   n / N  → ×1e-9         (nano)
 *   p / P  → ×1e-12        (pico)
 *
 * Examples:
 *   "10k"  → 10000
 *   "4.7u" → 4.7e-6
 *   "100n" → 1e-7
 *   "1M"   → 1e6
 *   "2.2m" → 0.0022
 *   "470"  → 470
 *
 * Returns null if the string cannot be parsed.
 */
export function parseEngValue(raw: string): number | null {
  const s = raw.trim().replace(',', '.');
  if (s === '') return null;
  const m = s.match(/^([+-]?\d*\.?\d+)\s*([kKmMuUnNpP]?)$/);
  if (!m) return null;
  const base = parseFloat(m[1]);
  if (!Number.isFinite(base)) return null;
  const suffix = m[2];
  const multipliers: Record<string, number> = {
    k: 1e3,  K: 1e3,
    M: 1e6,
    m: 1e-3,
    u: 1e-6, U: 1e-6,
    n: 1e-9, N: 1e-9,
    p: 1e-12, P: 1e-12,
  };
  return base * (multipliers[suffix] ?? 1);
}
