"use client";

import { useCallback } from "react";
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
import {
  dbPutMultiple,
  type Kanji,
  type AppDB,
  type KanjiStatus,
  useAppStore,
} from "../../appStore";
import { eq, gt, valid } from "semver";
import Router from "next/router";
import { api } from "@/utils/api";

import {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type useLocalStorage,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type LocalStorageProvider,
} from "./../localStorageProvider";
import { log } from "@/utils/utils";

export const parseKanjiURI = (search: URLSearchParams): Kanji[] => {
  const locKanjis = [] as Kanji[];

  // &n = new
  // &c = comp
  // &l = learn
  // (勉強,2);(漢字,4);[失態,4]  = base 勉 and 強 lvl2 + base 漢 and 字 lvl 4 + extra 失 and 態 lvl 4

  const parseLocKanjiList = (toParse: string | null, status: KanjiStatus) => {
    if (!toParse) return null;

    const lists = [
      ...decodeURIComponent(toParse).matchAll(/(\(|\[)(.*?),(\d+)(?:\)|\])/gi),
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
        allKanjis.push({ kanji: k, type, lvl, status: status, index: i++ });
      }
    }

    return allKanjis;
  };

  const news = parseLocKanjiList(search.get("n"), "new");
  if (news) locKanjis.push(...news);

  const comps = parseLocKanjiList(search.get("c"), "completed");
  if (comps) locKanjis.push(...comps);

  const lrns = parseLocKanjiList(search.get("l"), "learning");
  if (lrns) locKanjis.push(...lrns);

  return locKanjis;
};

export const KANJI_MERGE_STRATEGIES = {
  a: NO_OVERRIDE,
  r: OVERRIDE_ALL,
  p: NO_OVERRIDE,
  m: OVERRIDE_STATUS,
  x: NO_OVERRIDE,
} as const;

type OverrideType = "a" | "r" | "x" | "p" | "m";

export const assertOverrideType = (q?: string | null): OverrideType => {
  if (q === "a" || q === "r" || q === "x" || q === "p" || q === "m") return q;
  return "m";
};

export const migrateFromLS = async (LS: LSStore, idb: AppDB) => {
  const kanji = LS.getObject<Kanji[]>(LS_KEYS.kanjis);
  if (kanji?.length && idb) {
    // migrate from LS to DB
    await dbPutMultiple(idb, "kanji", kanji);
    LS.set(LS_KEYS.kanjis, null);
  }
};

export const removeSearchParams = async (override: OverrideType) => {
  log`Removing searchParams!`;
  // console.trace();
  if (override != "p") {
    const currURL = new URL(location.href);
    if (
      currURL.searchParams.has("c") ||
      currURL.searchParams.has("n") ||
      currURL.searchParams.has("l") ||
      currURL.searchParams.has("t") ||
      currURL.searchParams.has("q")
    ) {
      currURL.searchParams.delete("c");
      currURL.searchParams.delete("n");
      currURL.searchParams.delete("l");
      currURL.searchParams.delete("t");
      currURL.searchParams.delete("q");
      await Router.replace(currURL, currURL, { shallow: true });
    }
  }
};

export const getAllKanjisFromDB = async (idb: AppDB) => {
  const transaction = idb.transaction("kanji");
  const DBKanjiStore = transaction.store;
  const DBKanjiCursor = DBKanjiStore.iterate(null, "next");
  const DBKanjis: Kanji[] = [];

  for await (const kanji of DBKanjiCursor) {
    DBKanjis.push(kanji.value);
  }
  DBKanjis.sort((a, b) => a.index - b.index);
  return DBKanjis;
};

export const checkKanjiListUpdate = (LS: LSStore) => {
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
    return shouldUpdate;
  }

  return false;
};

export const getOverrideType = (search: URLSearchParams): OverrideType => {
  return search.has("q") ? "r" : assertOverrideType(search.get("t"));
};

export const saveToIDB = async (
  idb: AppDB,
  overrideType: OverrideType,
  kanji: Kanji[],
) => {
  await idb.clear("kanji");
  await dbPutMultiple(idb, "kanji", kanji);
};

export const getMergedKanjis = async (
  LS: LSStore,
  idb: AppDB,
  url: Kanji[],
  override: OverrideType,
): Promise<{ kanji: Kanji[]; updateRequired: boolean }> => {
  const DBKanjis = await getAllKanjisFromDB(idb);
  // log`DBKanjis ${DBKanjis}`;
  // console.trace();
  if (!DBKanjis || DBKanjis.length === 0) {
    // no DB kanji
    LS.set(LS_KEYS.kanji_ver, DEFAULT_KANJI_VERSION);
    const kanji = removeDuplicates(
      DEFAULT_KANJIS().concat(url),
      KANJI_MERGE_STRATEGIES[override],
    );
    return { kanji, updateRequired: false };
  } else {
    // merge states
    try {
      if (Array.isArray(DBKanjis)) {
        if (override === "r") {
          LS.set(LS_KEYS.kanji_ver, DEFAULT_KANJI_VERSION);
        }
        const kanji = removeDuplicates(
          removeDuplicates(
            (override === "r" ? DEFAULT_KANJIS() : DBKanjis).concat(url),
            KANJI_MERGE_STRATEGIES[override],
          ).concat(DEFAULT_KANJIS()),
          OVERRIDE_INDEXES,
        ).sort((a, b) => a.index - b.index); // override indexes because older versions of DB didn't have them
        return { kanji, updateRequired: false };
      }
    } catch (e) {
      console.warn(e);
      alert("There was an issue getting your previous data! Resetting!");
    }
  }

  return { kanji: DEFAULT_KANJIS(), updateRequired: true };
};

/**
 * Initial setup, update-management and backup-management of IndexedDB and LocalStorage values
 * @param LS {@link LSStore} object that has bindings to LocalStore and IndexedDB data.
 * @see  {@link LocalStorageProvider} and {@link useLocalStorage}
 */
export const useKanjiStorage = () => {
  const { mutateKanjis, setShouldUpdate } = useAppStore((s) => ({
    mutateKanjis: s.mutateKanjis,
    setShouldUpdate: s.setShouldUpdateKanjiList,
    getIDB: s.getIDB,
  }));
  const utils = api.useUtils();

  const resetDBToDefault = useCallback(
    async (
      LS: LSStore,
      idb: AppDB,
      urlKanjis: Kanji[],
      override: OverrideType,
    ) => {
      const { kanji, updateRequired } = await getMergedKanjis(
        LS,
        idb,
        urlKanjis,
        "r",
      );
      setShouldUpdate(updateRequired);
      LS.set(LS_KEYS.kanji_ver, DEFAULT_KANJI_VERSION);
      await saveToIDB(idb, override, kanji);
      mutateKanjis(() => kanji);
    },
    [mutateKanjis, setShouldUpdate],
  );

  const getKanjiFromOnlineDB = useCallback(
    async (id: string | null) => {
      if (!id) return null;
      log`Getting Kanji from Online DB with id ${id}`;

      const link = await utils.backup.getList.fetch(id);

      if ("link" in link) {
        return parseKanjiURI(new URLSearchParams(link.link));
      } else {
        return false;
      }
    },
    [utils],
  );

  return {
    resetDBToDefault,
    getKanjiFromOnlineDB,
  } as const;
};
