import { DEFAULT_KANJIS } from "./defaultKanji";
import { type Kanji } from "../../appStore";

export const doesKanjiFitFilter = (f: string, k: Kanji) => {
  if (f.length <= 0) return true;

  if (f.includes(k.kanji)) return true;

  const lvlEx = f.matchAll(/lvl(\d+)/gi);
  const lvlTab = [...lvlEx];
  for (const [, lvlStr] of lvlTab) {
    if (lvlStr) if (k.lvl === parseInt(lvlStr)) return true;
  }

  if (f.includes("base") && k.type === "base") return true;
  if (f.includes("extra") && k.type === "extra") return true;
  if (f.includes("new") && k.status === "new") return true;
  if ((f.includes("learning") || f.includes("lrn")) && k.status === "learning")
    return true;
  if (
    (f.includes("completed") || f.includes("cpl")) &&
    k.status === "completed"
  )
    return true;
};

// O(7n) <> O(25n) depending on type
export const getShareLink = (
  kanjis: Kanji[] | null,
  type: "add" | "reset" | "show" | "merge" = "merge",
): string => {
  if (!kanjis) return location.href;
  const sharelink = `${location.protocol}//${location.host}/list/`;

  const newK: Kanji[] = [];
  const cplK: Kanji[] = [];
  const lrnK: Kanji[] = [];

  const addToLink = (k: Kanji) => {
    if (k.status === "new") newK.push(k);
    if (k.status === "learning") lrnK.push(k);
    if (k.status === "completed") cplK.push(k);
  };

  for (const kanji of kanjis) {
    const defaultK = DEFAULT_KANJIS().find((k) => k.kanji === kanji.kanji);
    if (!defaultK) {
      addToLink(kanji);
    } else {
      if (
        defaultK.lvl !== kanji.lvl ||
        defaultK.status !== kanji.status ||
        defaultK.type !== kanji.type
      )
        addToLink(kanji);
    }
  }

  const groupKanjis = (k: Kanji[]): string => {
    const base = k.filter((f) => f.type === "base");
    const extra = k.filter((f) => f.type === "extra");

    const baseLvl = base.reduce(
      (p, n) => {
        if (n.lvl in p) {
          p[n.lvl]?.push(n);
          return p;
        } else {
          return { ...p, [n.lvl]: [n] };
        }
      },
      {} as Record<number, Kanji[]>,
    );

    const extraLvl = extra.reduce(
      (p, n) => {
        if (n.lvl in p) {
          p[n.lvl]?.push(n);
          return p;
        } else {
          return { ...p, [n.lvl]: [n] };
        }
      },
      {} as Record<number, Kanji[]>,
    );

    return `${Object.entries(baseLvl).reduce((prev, y) => {
      return prev + `(${y[1].map((k) => k.kanji).join("")},${y[0]})`;
    }, "")}${Object.entries(extraLvl).reduce((prev, y) => {
      return prev + `[${y[1].map((k) => k.kanji).join("")},${y[0]}]`;
    }, "")}`;
  };

  const newURL = new URL(sharelink);

  const newSearchParams = groupKanjis(newK);
  const cplSearchParams = groupKanjis(cplK);
  const lrnSearchParams = groupKanjis(lrnK);

  newURL.searchParams.set("n", newSearchParams);
  newURL.searchParams.set("c", cplSearchParams);
  newURL.searchParams.set("l", lrnSearchParams);
  if (type === "reset") newURL.searchParams.set("t", "r"); // reset the importing device's values to default before importing
  if (type === "add") newURL.searchParams.set("t", "a"); // add only the newly added kanjis
  if (type === "merge") newURL.searchParams.set("t", "m"); // override only statuses
  if (type === "show") newURL.searchParams.set("t", "p"); // TODO: Show the table, withot changing any importee data

  return newURL.toString();
};
