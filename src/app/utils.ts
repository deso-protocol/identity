export const truncatePublicKey = (key: string): string => {
  if (key.length <= 12) {
    return key;
  }
  return `${key.substring(0, 7)}....${key.substring(
    key.length - 4,
    key.length
  )}`;
};
