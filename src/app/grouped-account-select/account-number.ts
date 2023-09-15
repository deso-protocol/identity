/**
 * https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki#extended-keys
 * The max value that should be used for an hd key account number. In practice,
 * we would never reach this via pure incremental account number generation, but
 * we allow entering arbitrary account numbers in the UI, so we need to
 * explicitly validate them.
 */
const MAX_32_BIT_UNSIGNED_INT = 4294967295; // 2^32 - 1

/**
 * This is for validating UI input which is why it only accepts strings.
 */
export function isValid32BitUnsignedInt(str: string) {
  if (!str.match(/^(0|[1-9]\d*)$/)) return false;

  const num = Number(str);
  return num >= 0 && num <= MAX_32_BIT_UNSIGNED_INT;
}

/**
 * - The lowest possible sub-account number is 1 (0 is reserved for the "root" account).
 * - If the set is empty, we just return 1.
 * - Otherwise, we look for the highest number in the set and increment it by 1.
 * - If the next incremented number is too big, we look back for the first gap in the numbers and use that instead.
 * - If no gap is found (very unlikely), we throw an error.
 */
export function generateAccountNumber(accountNumbers: Set<number>): number {
  if (accountNumbers.size === 0) {
    return 1;
  }

  const sorted = Array.from(accountNumbers).sort((a, b) => a - b);

  const candidate = sorted[sorted.length - 1] + 1;

  if (candidate <= MAX_32_BIT_UNSIGNED_INT) {
    return candidate;
  }

  // At most we look back 500 numbers. This is a bit arbitrary...  but the
  // number of values could *technically* be 2^32 - 1, so we just arbitrarily
  // limit the number of iterations to some reasonable value.
  const maxLookBack = Math.max(sorted.length - 1001, 0);
  for (let i = sorted.length - 1; i >= maxLookBack; i--) {
    const expectedValueInSequence = i + 1;
    if (expectedValueInSequence !== sorted[i]) {
      return expectedValueInSequence;
    }
  }

  throw new Error('Cannot generate account number.');
}
