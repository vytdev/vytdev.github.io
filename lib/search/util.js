/**
 * Function to convert an array of tokens (term IDs) into
 * a map listing the frequency of unique terms.
 * @param T The array of tokens (term IDs).
 * @returns Record<t, f(t)>
 */
export function countFrequency(T) {
  const TFs = Object.create(null);
  for (const t of T)
    TFs[t] = (TFs[t] ?? 0) + 1;
  return TFs;
}
