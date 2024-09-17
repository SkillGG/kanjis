import { useEffect } from "react";
import {
  LS_KEYS,
  type LSStore as LSStore,
} from "@/components/localStorageProvider";
import {
  NO_OVERRIDE,
  OVERRIDE_ALL,
  OVERRIDE_STATUS,
  DEFAULT_KANJI_VERSION,
  removeDuplicates,
  DEFAULT_KANJIS,
  OVERRIDE_INDEXES,
} from "./defaultKanji";
import { type Kanji, type KanjiStatus, useKanjiStore } from "./kanjiStore";
import { eq, gt, valid } from "semver";
import Router from "next/router";
import { type IDBPDatabase } from "idb";
import { type KanjiDB } from "@/pages/_app";

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
      let i = 1;
      for (const k of kanjis) {
        allKanjis.push({ kanji: k, type, lvl, status: s, index: i++ });
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

const migrateToDB = async (db: IDBPDatabase<KanjiDB>, kanji: Kanji[]) => {
  const transaction = db.transaction("kanji", "readwrite");
  await Promise.all(kanji.map((k) => transaction.store.put(k)));
};

export const useKanjiStorage = (LS: LSStore<KanjiDB>) => {
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
      const prevhref = currURL.href;
      if (
        currURL.searchParams.has("c") ||
        currURL.searchParams.has("n") ||
        currURL.searchParams.has("l") ||
        currURL.searchParams.has("t")
      ) {
        currURL.searchParams.delete("c");
        currURL.searchParams.delete("n");
        currURL.searchParams.delete("l");
        currURL.searchParams.delete("t");
        console.log(prevhref, " => ", currURL.toString());
        void Router.replace(currURL, currURL, { shallow: true });
      }
    }

    const strategies = {
      a: NO_OVERRIDE,
      r: OVERRIDE_ALL,
      p: NO_OVERRIDE,
      m: OVERRIDE_STATUS,
      x: NO_OVERRIDE,
    } as const;

    void (async () => {
      const LSkanjis = LS.getObject<Kanji[]>(LS_KEYS.kanjis);

      if (LSkanjis?.length && LS.idb) {
        // migrate from LS to DB
        await migrateToDB(LS.idb, LSkanjis);
        LS.set(LS_KEYS.kanjis, null);
      }
      if (!LS.idb) return;

      const transaction = LS.idb?.transaction("kanji");

      const DBKanjiStore = transaction?.store;

      const DBKanjiCursor = DBKanjiStore.iterate(null, "next");

      const DBKanjis: Kanji[] = [];

      for await (const kanji of DBKanjiCursor) {
        DBKanjis.push(kanji.value);
      }

      DBKanjis.sort((a, b) => a.index - b.index);

      const lastVersion = LS.getString<string>(LS_KEYS.kanji_ver);

      const omitVersion = LS.getString<string>(LS_KEYS.omit_version);

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

      const saveToIDB = async (kanji: Kanji[]) => {
        await LS.idb?.clear("kanji");
        void kanji.map((k) => LS.idb?.put("kanji", k));
      };

      if (!DBKanjis || DBKanjis.length === 0) {
        // no DB kanji
        console.log("No db kanji");
        setShouldUpdate(false);
        mutateKanjis(() => {
          LS.set(LS_KEYS.kanji_ver, DEFAULT_KANJI_VERSION);
          const kanji = removeDuplicates(
            DEFAULT_KANJIS().concat(locationKanjis),
            strategies[overrideType],
          );
          void saveToIDB(kanji);
          return kanji;
        });
      } else {
        // merge states
        try {
          if (Array.isArray(DBKanjis))
            mutateKanjis(() => {
              if (overrideType === "r") {
                setShouldUpdate(false);
                LS.set(LS_KEYS.kanji_ver, DEFAULT_KANJI_VERSION);
              }
              const kanji = removeDuplicates(
                removeDuplicates(
                  (overrideType === "r" ? DEFAULT_KANJIS() : DBKanjis).concat(
                    locationKanjis,
                  ),
                  strategies[overrideType],
                ).concat(DEFAULT_KANJIS()),
                OVERRIDE_INDEXES,
              ).sort((a, b) => a.index - b.index);
              void saveToIDB(kanji);
              return kanji;
            });
        } catch (e) {
          console.warn(e);
          alert("There was an issue getting your previous data! Resetting!");
          mutateKanjis(() => {
            setShouldUpdate(false);
            LS.set(LS_KEYS.kanji_ver, DEFAULT_KANJI_VERSION);
            const kanji = removeDuplicates(
              DEFAULT_KANJIS().concat(locationKanjis),
              strategies[overrideType],
            );
            void saveToIDB(kanji);
            return kanji;
          });
        }
      }
    })();
  }, [LS, mutateKanjis, setShouldUpdate]);
};
