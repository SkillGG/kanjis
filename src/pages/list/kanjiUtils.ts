import { DEFAULT_KANJIS } from "./defaultKanji";
import { type Kanji } from "./kanjiStore";

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

// O(7n) <> O(25n)
// Overall O(n)
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
    // O(1)
    if (k.status === "new") newK.push(k);
    if (k.status === "learning") lrnK.push(k);
    if (k.status === "completed") cplK.push(k);
  };

  for (const kanji of kanjis) {
    // O(n)
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

  // best case O(2n), worst case O(8n)
  const groupKanjis = (k: Kanji[]): string => {
    const base = k.filter((f) => f.type === "base"); // O(n)
    const extra = k.filter((f) => f.type === "extra"); // O(n)

    const baseLvl = base.reduce(
      (p, n) => {
        // best case O(0), worst case O(n)
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
        // best case O(0), worst case O(n)
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
      // worst case O(n), best case O(0)
      return prev + `(${y[1].map((k) => k.kanji).join("")},${y[0]})`; // worst case O(n), best case O(0)
    }, "")}${Object.entries(extraLvl).reduce((prev, y) => {
      // worst case O(n), best case O(0)
      return prev + `[${y[1].map((k) => k.kanji).join("")},${y[0]}]`; // worst case O(n), best case O(0)
    }, "")}`;
  };

  const newURL = new URL(sharelink);

  const newSearchParams = groupKanjis(newK); // O(2n) <> O(8n)
  const cplSearchParams = groupKanjis(cplK); // O(2n) <> O(8n)
  const lrnSearchParams = groupKanjis(lrnK); // O(2n) <> O(8n)

  newURL.searchParams.set("n", newSearchParams);
  newURL.searchParams.set("c", cplSearchParams);
  newURL.searchParams.set("l", lrnSearchParams);
  if (type === "reset") newURL.searchParams.set("t", "r"); // reset the importing device's values to default before importing
  if (type === "add") newURL.searchParams.set("t", "a"); // add only the newly added kanjis
  if (type === "merge") newURL.searchParams.set("t", "m"); // override only statuses
  if (type === "show") newURL.searchParams.set("t", "p"); // TODO: Show the table, withot changing any importee data

  return newURL.toString();
};
