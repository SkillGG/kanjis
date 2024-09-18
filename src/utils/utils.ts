// eslint-disable-next-line @typescript-eslint/no-empty-function
export const noop = () => {};

export const randomInt = (min: number, max: number) =>
  Math.round(Math.random() * Math.trunc(max)) + Math.trunc(min);

declare global {
  interface Window {
    wrN: typeof randomEndWeighedInt;
  }
}

export const randomStartWeighedInt = (
  min: number,
  max: number,
  weight: number,
): number => {
  const allNums = [...Array<number>(Math.abs(min - max) + 1)]
    .map((_, i) => min + i)
    .reverse();
  const weightedNums = allNums.map(
    (_, i) => (i + 1) * weight + i ** weight * weight,
  );
  const normalizer = 1 / weightedNums.reduce((p, n) => p + n);
  const weighted = weightedNums.map((q) => q * normalizer);
  const rand = Math.random();
  for (let sum = 0, j = 0; sum < 1; j++) {
    sum += weighted[j] ?? 0;
    if (sum >= rand) {
      return allNums[j] ?? -1;
    }
  }
  return -1;
};

export const randomEndWeighedInt = (
  min: number,
  max: number,
  weight: number,
): number => {
  const allNums = [...Array<number>(Math.abs(min - max) + 1)].map(
    (_, i) => min + i,
  );
  const weightedNums = allNums.map(
    (_, i) => (i + 1) * weight + i ** weight * weight,
  );
  const normalizer = 1 / weightedNums.reduce((p, n) => p + n);
  const weighted = weightedNums.map((q) => q * normalizer);
  const rand = Math.random();
  for (let sum = 0, j = 0; sum < 1; j++) {
    sum += weighted[j] ?? 0;
    if (sum >= rand) {
      return allNums[j] ?? -1;
    }
  }
  return -1;
};
