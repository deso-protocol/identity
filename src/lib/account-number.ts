/**
 * https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki#extended-keys
 * The max value that should be used for an hd key account number is 2^31 -1. In
 * practice, we would never reach this via pure incremental account number
 * generation, but we allow entering arbitrary account numbers in the UI, so we
 * need to explicitly validate them. For whatever reason, the hdkey library
 * we use throws for anything over 2^30.
 */
const MAX_UNSIGNED_INT_VALUE = 1073741824; // 2^30

export function isValid32BitUnsignedInt(value: number) {
  return (
    Number.isInteger(value) && value >= 0 && value <= MAX_UNSIGNED_INT_VALUE
  );
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
  const currentHighestAccountNumber = sorted[sorted.length - 1];
  const candidate = currentHighestAccountNumber + 1;

  if (candidate <= MAX_UNSIGNED_INT_VALUE) {
    return candidate;
  }

  // At most we look back 500 numbers. This is a bit arbitrary...  but the
  // number of values could *technically* be 2^32 - 1, so we just limit the
  // number of iterations to some reasonable value. The reason we look back for
  // the highest available number instead of picking the lowest number is that
  // the lowest number is more likely to have been used in the past and we're
  // aiming to get a fresh wallet.
  const maxLookBack = Math.max(sorted.length - 500, 0);
  let nextExpectedValueInSequence = currentHighestAccountNumber - 1;
  for (let i = sorted.length - 2; i >= maxLookBack; i--) {
    if (nextExpectedValueInSequence !== sorted[i]) {
      return nextExpectedValueInSequence;
    }
    nextExpectedValueInSequence--;
  }

  throw new Error('Cannot generate account number.');
}
