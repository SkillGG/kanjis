import { env } from "@/env";

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

const cLog = (val: "log" | "warn" | "error", ...arr: unknown[]) => {
  if (env.NEXT_PUBLIC_DEV === "development") console[val](...arr);
};

export const log = (str: TemplateStringsArray, ...objs: unknown[]): void => {
  const arr = [str[0], ...objs.map((q, i) => [q, str[i + 1]])].flat();
  if (arr[arr.length - 1] === "") arr.length--;
  cLog("log", ...arr.filter((f) => f !== ""));
};

export const warn = (str: TemplateStringsArray, ...objs: unknown[]): void => {
  const arr = [str[0], ...objs.map((q, i) => [q, str[i + 1]])].flat();
  if (arr[arr.length - 1] === "") arr.length--;
  cLog("warn", ...arr);
};

export const err = (str: TemplateStringsArray, ...objs: unknown[]): void => {
  const arr = [str[0], ...objs.map((q, i) => [q, str[i + 1]])].flat();
  if (arr[arr.length - 1] === "") arr.length--;
  cLog("error", ...arr);
};

export const toSpliced = <T>(
  arr: T[],
  start: number,
  deleteCount?: number,
  ...items: T[]
): T[] => {
  if ("toSpliced" in Array.prototype) {
    log`Using default toSpliced`;
    return (
      arr as T[] & { toSpliced: (s: number, d?: number, ...t: T[]) => T[] }
    ).toSpliced(start, deleteCount, ...items);
  } else {
    const copy = [...arr];
    copy.splice(start, deleteCount ?? 0, ...items);
    return copy;
  }
};

export const toReversed = <T>(arr: T[]): T[] => {
  if ("toReversed" in Array.prototype) {
    log`Using default toReversed`;
    return (arr as T[] & { toReversed: () => T[] }).toReversed();
  } else {
    const copy = [...arr];
    copy.reverse();
    return copy;
  }
};

export const toSorted = <T>(
  arr: T[],
  compareFn: (a: T, b: T) => number,
): T[] => {
  if ("toSorted" in Array.prototype) {
    log`Using default toSorted`;
    return (
      arr as T[] & { toSorted: (cFN: (a: T, b: T) => number) => T[] }
    ).toSorted(compareFn);
  } else {
    const copy = [...arr];
    copy.sort(compareFn);
    return copy;
  }
};

export const es5With = <T>(arr: T[], index: number, value: T): T[] => {
  const len = arr.length;
  const relativeIndex = index;
  const actualIndex = relativeIndex < 0 ? len + relativeIndex : relativeIndex;
  if (actualIndex >= len || actualIndex < 0)
    throw new RangeError("Incorrect index");
  const A: T[] = [];
  let k = 0;
  for (; k < len; k++) A.push(k === actualIndex ? value : arr[k]!);
  return A;
};
