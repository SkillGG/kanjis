import { useEffect } from "react";
import { LS_KEYS, type LSStore } from "../localStorageProvider";
import {
  NO_OVERRIDE,
  OVERRIDE_ALL,
  MERGE_STATUSES,
  DEFAULT_KANJI_VERSION,
  removeDuplicates,
  DEFAULT_KANJIS,
} from "./defaultKanji";
import { type Kanji, type KanjiStatus, useKanjiStore } from "./kanjiStore";
import { eq, gt, valid } from "semver";
import { useRouter } from "next/router";

const getLocationKanjis = (search: string): Kanji[] => {
  const locKanjis = [] as Kanji[];

  // &n = new
  // &c = comp
  // &l = learn
  // (勉強,2);(漢字,4);[失態,4]  = base 勉 and 強 lvl2 + base 漢 and 字 lvl 4 + extra 失 and 態 lvl 4

  const newMatch = /(?:\?|&)n=([^\?&]*)/i.exec(search);

  const parseLocKanjiList = (l: string | null, s: KanjiStatus) => {
    if (!l) return null;
    const lists = [
      ...decodeURIComponent(l).matchAll(/(\(|\[)(.*?),(\d+)(?:\)|\])/gi),
    ];

    const allKanjis = [] as Kanji[];

    for (const list of lists) {
      const type = list[1] === "(" ? "base" : "extra";
      const lvl = parseInt(list[3] ?? "a");
      const kanjis = list[2];
      if (isNaN(lvl) || lvl < 1) continue;
      if (!kanjis) continue;
      for (const k of kanjis) {
        allKanjis.push({ kanji: k, type, lvl, status: s });
      }
    }

    return allKanjis;
  };

  const news = parseLocKanjiList(newMatch?.[1] ?? null, "new");
  if (news) locKanjis.push(...news);

  const compMatch = /(?:\?|&)c=([^\?&]*)/i.exec(search);
  const comps = parseLocKanjiList(compMatch?.[1] ?? null, "completed");
  if (comps) locKanjis.push(...comps);

  const learnMatch = /(?:\?|&)l=([^\?&]*)/i.exec(search);
  const lrns = parseLocKanjiList(learnMatch?.[1] ?? null, "learning");
  if (lrns) locKanjis.push(...lrns);

  return locKanjis;
};

export const useKanjiStorage = (LS: LSStore) => {
  const router = useRouter();

  const { mutateKanjis, setShouldUpdate } = useKanjiStore();

  useEffect(() => {
    const locationKanjis = getLocationKanjis(location.search);

    const overrideType = (/t=(a|r|p|m)/i.exec(location.search)?.[1] ?? "x") as
      | "a"
      | "r"
      | "p"
      | "m"
      | "x";

    if (overrideType != "p") {
      const currURL = new URL(location.href);
      currURL.searchParams.delete("c");
      currURL.searchParams.delete("n");
      currURL.searchParams.delete("l");
      currURL.searchParams.delete("t");
      void router.replace(currURL);
    }

    const strategies = {
      a: NO_OVERRIDE,
      r: OVERRIDE_ALL,
      p: NO_OVERRIDE,
      m: MERGE_STATUSES,
      x: NO_OVERRIDE,
    } as const;

    const LSkanjis = LS.get<Kanji[]>(LS_KEYS.kanjis);

    const lastVersion = LS.get<string>(LS_KEYS.kanji_ver);

    const omitVersion = LS.get<string>(LS_KEYS.omit_version);

    let shouldUpdate = false;

    if (!lastVersion || !valid(lastVersion)) {
      shouldUpdate = true;
    } else {
      if (gt(DEFAULT_KANJI_VERSION, lastVersion)) {
        shouldUpdate = true;
      }
    }

    if (
      !omitVersion ||
      !valid(omitVersion) ||
      !eq(DEFAULT_KANJI_VERSION, omitVersion)
    ) {
      setShouldUpdate(shouldUpdate);
    }

    if (!LSkanjis) {
      setShouldUpdate(false);
      mutateKanjis(() => {
        LS.set(LS_KEYS.kanji_ver, DEFAULT_KANJI_VERSION);
        return removeDuplicates(
          DEFAULT_KANJIS().concat(locationKanjis),
          strategies[overrideType],
        );
      });
    } else {
      // merge states
      try {
        const oldKanjis = LS.get<Kanji[]>(LS_KEYS.kanjis);
        if (Array.isArray(oldKanjis))
          mutateKanjis(() => {
            if (overrideType === "r") {
              setShouldUpdate(false);
              LS.set(LS_KEYS.kanji_ver, DEFAULT_KANJI_VERSION);
            }
            return removeDuplicates(
              (overrideType === "r" ? DEFAULT_KANJIS() : oldKanjis).concat(
                locationKanjis,
              ),
              strategies[overrideType],
            );
          });
      } catch (e) {
        console.warn(e);
        alert("There was an issue getting your previous data! Resetting!");
        mutateKanjis(() => {
          setShouldUpdate(false);
          LS.set(LS_KEYS.kanji_ver, DEFAULT_KANJI_VERSION);
          return removeDuplicates(
            DEFAULT_KANJIS().concat(locationKanjis),
            strategies[overrideType],
          );
        });
      }
    }
  }, []);
};
