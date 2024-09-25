import { err, log } from "@/utils/utils";
import { create } from "zustand";
import {
  createLSStore,
  type DBInit,
  LS_KEYS,
} from "../components/localStorageProvider";
import { getMergedKanjis } from "../components/list/kanjiStorage";
import {
  type DBSchema,
  type IDBPDatabase,
  openDB,
  type StoreNames,
  type StoreValue,
} from "idb";

import defaultWordBank from "@/pages/wordbank/wordbank.json";
import {
  DEFAULT_KANJI_VERSION,
  DEFAULT_KANJIS,
} from "../components/list/defaultKanji";
import {
  areWordsTheSame,
  getWordWithout,
  type MultiQW,
  type QuizWord,
} from "../components/draw/quizWords";
import { type DrawSessionData } from "../components/draw/drawSession";
import { subscribeWithSelector } from "zustand/middleware";

export const KanjiStatus = ["new", "learning", "completed"] as const;

export type KanjiStatus = (typeof KanjiStatus)[number];

export const KanjiType = ["base", "extra"] as const;

export type KanjiType = (typeof KanjiType)[number];

export type Kanji = {
  status: KanjiStatus;
  type: KanjiType;
  kanji: string;
  lvl: number;
  index: number;
};

export type TagInfo = {
  description: string;
  color?: string;
  border?: string;
  bg?: string;
};

export type Settings = {
  autoChangeIME: boolean;
  wordBankAutoFilter: boolean;
  kanjiRowCount: number;
  autoMarkAsCompleted: boolean;
  showMax: number;
  autoMarkKanjiAsCompleted: boolean;
  markKanjisAsLearningOnSessionStart: boolean;
  showSessionProgress: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  autoChangeIME: false,
  wordBankAutoFilter: true,
  kanjiRowCount: 8,
  autoMarkAsCompleted: true,
  showMax: 1000,
  autoMarkKanjiAsCompleted: false,
  markKanjisAsLearningOnSessionStart: false,
  showSessionProgress: true,
};

export const defaultDBSchema: DBInit<AppDBSchema> = {
  name: "kanjiDB",
  version: 17,
  seed(db) {
    if (db.objectStoreNames.contains("kanji")) {
      void db.count("kanji").then((q) => {
        if (q === 0) {
          // seed kanji list with default value
          for (const kanji of DEFAULT_KANJIS()) {
            void db.put("kanji", kanji);
          }
          localStorage.setItem(LS_KEYS.kanji_ver, DEFAULT_KANJI_VERSION);
        }
      });
    }
    if (db.objectStoreNames.contains("wordbank")) {
      void db.count("wordbank").then((q) => {
        if (q === 0) {
          // TODO: seed with default words
          const defaultWords = defaultWordBank.words as QuizWord[];
          for (const word of defaultWords) {
            void db.put("wordbank", word);
          }
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          localStorage.setItem(LS_KEYS.wordbank_ver, defaultWordBank.version);
        }
      });
    }
  },
  init(db, o, n, transaction) {
    if (o < 6) {
      if (db.objectStoreNames.contains("kanji")) db.deleteObjectStore("kanji");
      const kanjiStore = db.objectStoreNames.contains("kanji")
        ? transaction.objectStore("kanji")
        : db.createObjectStore("kanji", { keyPath: "kanji" });
      if (kanjiStore) {
        if (!kanjiStore.indexNames.contains("type"))
          kanjiStore.createIndex("type", "type", { unique: false });
        if (!kanjiStore.indexNames.contains("status"))
          kanjiStore.createIndex("status", "status", { unique: false });
        if (!kanjiStore.indexNames.contains("lvl"))
          kanjiStore.createIndex("lvl", "lvl", { unique: false });
        if (!kanjiStore.indexNames.contains("index"))
          kanjiStore.createIndex("index", "index", { unique: true });
      }
    }
    if (o < 8) {
      if (!db.objectStoreNames.contains("draw"))
        db.createObjectStore("draw", { keyPath: "sessionID" });
    }
    if (o <= 15) {
      if (db.objectStoreNames.contains("wordbank"))
        db.deleteObjectStore("wordbank");
      const wordbankStore = db.createObjectStore("wordbank", {
        keyPath: ["word", "special", "readings"],
      });
      if (wordbankStore) {
        if (!wordbankStore.indexNames.contains("kanji"))
          wordbankStore.createIndex("kanji", "kanji", { unique: false });
      }
    }
  },
};

export type AppDB = IDBPDatabase<AppDBSchema>;

export type Store = {
  kanji: Kanji[];
  shouldUpdateKanjiList: boolean;
  setShouldUpdateKanjiList: (su: boolean) => void;
  mutateKanjis: (mutation: (k: Store["kanji"]) => Store["kanji"]) => void;
  updateKanji: (kanji: string, data: Partial<Omit<Kanji, "kanji">>) => void;
  addKanji: (kanji: Kanji) => void;
  removeKanji: (kanji: string) => void;
  tagColors: Record<string, TagInfo> | null;
  setTagColors: (colors: Record<string, TagInfo>) => void;
  settings: Settings;
  setSettings: <T extends keyof Settings>(key: T, value: Settings[T]) => void;
  idb: AppDB | null;
  setIDB: (db: AppDB) => void;
  getIDB: () => AppDB;

  words: QuizWord[];
  setWords: (
    setFn: (prev: QuizWord[]) => Promise<QuizWord[]>,
    updateBank?: boolean,
  ) => Promise<void>;
  addWords: (qw: QuizWord[]) => Promise<void>;
  removeWords: (qw: QuizWord[]) => Promise<void>;
  updateWord: (qw: QuizWord, data: Partial<QuizWord>) => Promise<void>;

  foldedWords: MultiQW[];

  firstWordLoad: boolean;
};

export const dbPutMultiple = async <Name extends StoreNames<AppDBSchema>>(
  db: AppDB,
  store: Name,
  values: StoreValue<AppDBSchema, Name>[],
): Promise<void> => {
  for (const value of values) {
    await db.put(store, value);
  }
};

export type AppDBSchema = DBSchema & {
  wordbank: {
    key: [string, number, string[]];
    value: QuizWord;
    indexes: {
      kanji: string;
    };
  };
  kanji: {
    key: string;
    value: Kanji;
    indexes: {
      status: KanjiStatus;
      type: KanjiType;
      lvl: number;
      index: number;
    };
  };
  draw: {
    key: string;
    value: DrawSessionData;
  };
};

const alphabet = `あいうえおかきくけこがぎぐげごさしすせそざじずぜぞたちつてとだぢづでどなにぬねのはひふへほばびぶべぼぱぴぷぺぽまみむめもやゆよゃゅょらりるれろわをん`;

export const compareReadings = (
  a: QuizWord,
  b: QuizWord,
  comp: (a: number, b: number) => number = (a, b) => a - b,
): number => {
  const aWord = a.word
    .split("")
    .map((k, i) => `${k}${a.readings[i]}`)
    .join("");
  const bWord = b.word
    .split("")
    .map((k, i) => `${k}${b.readings[i]}`)
    .join("");

  const aAlpha = aWord.split("").filter((q) => alphabet.includes(q));
  const bAlpha = bWord.split("").filter((q) => alphabet.includes(q));

  if (bAlpha.length === 0) {
    log`FailedWord ${bWord}`;
    return 1;
  }
  if (aAlpha.length === 0) {
    log`FailedWord ${aWord}`;
    return -1;
  }

  for (let i = 0; i < Math.min(aAlpha.length, bAlpha.length); i++) {
    if (aAlpha[i] === bAlpha[i]) continue;
    const aLetter = aAlpha[i];
    const bLetter = bAlpha[i];
    if (!aLetter) return comp(1, 0);
    if (!bLetter) return comp(0, 1);
    return comp(alphabet.indexOf(aLetter), alphabet.indexOf(bLetter));
  }
  return 0;
};

const foldWords = (w: QuizWord[]): MultiQW[] => {
  return w.reduce<MultiQW[]>((p, n) => {
    const areReadingsTheSame = (a: QuizWord, b: QuizWord) =>
      a.readings.join("_") === b.readings.join("_");
    const areTagsTheSame = (a: QuizWord, b: QuizWord) =>
      a.tags?.sort().join("_") === b.tags?.sort().join("_");

    const prevInArr = p.find(
      (z) =>
        z.word === n.word && areReadingsTheSame(z, n) && areTagsTheSame(z, n),
    );

    if (prevInArr) {
      const newMS = [
        ...(prevInArr.multiSpecial ?? [prevInArr.special]),
        n.special,
      ];
      return [
        ...p.filter(
          (x) =>
            !(
              areTagsTheSame(x, prevInArr) &&
              areReadingsTheSame(x, prevInArr) &&
              x.word === prevInArr.word
            ),
        ),
        {
          ...prevInArr,
          multiSpecial: newMS,
        } as MultiQW,
      ];
    }
    return [...p, { ...n, multiSpecial: [n.special] }];
  }, []);
};

export const useAppStore = create(
  subscribeWithSelector<Store>((_set, _get) => {
    return {
      kanji: [],
      words: [],
      foldedWords: [],
      shouldUpdateKanjiList: false,
      tagColors: null,
      settings: DEFAULT_SETTINGS,
      idb: null,
      firstWordLoad: false,
      setIDB(idb) {
        _set(() => ({ idb }));
      },
      async addWords(qw) {
        const idb = _get().getIDB();
        await dbPutMultiple(idb, "wordbank", qw);
        _set((prev) => ({ words: prev.words.concat(qw) }));
      },
      async removeWords(qw) {
        const idb = _get().getIDB();
        for (const w of qw) {
          await idb.delete("wordbank", [w.word, w.special, w.readings]);
        }
        _set((prev) => ({
          words: prev.words.filter(
            (pw) => !qw.some((w) => areWordsTheSame(pw, w)),
          ),
        }));
      },
      async updateWord(qw, data) {
        const idb = _get().getIDB();
        if (
          ("word" in data && qw.word !== data.word) ||
          ("readings" in data &&
            qw.readings.join(",") !== data.readings?.join(",")) ||
          ("special" in data && qw.special !== data.special)
        ) {
          await idb.delete("wordbank", [
            data.word ?? qw.word,
            data.special ?? qw.special,
            data?.readings ?? qw.readings,
          ]);
        }
        await idb.put("wordbank", { ...qw, ...data });
        _set((prev) => ({
          words: prev.words.map((pw) =>
            areWordsTheSame(qw, pw) ? { ...qw, ...data } : pw,
          ),
        }));
      },
      async setWords(setFn) {
        const oldW = _get().words;
        const newW = await setFn(_get().words);

        if (!_get().firstWordLoad) {
          _set(() => ({ words: newW, firstWordLoad: true }));
          return log`First load!`;
        }

        // save to db
        // figure out what words changed
        log`Saving word changes to DB`;
        const changed = {
          changed: [] as QuizWord[],
          deleted: [] as QuizWord[],
          added: [] as QuizWord[],
        };

        const unchanged: QuizWord[] = [];

        for (const w of oldW) {
          const newVer = newW.find((nw) => areWordsTheSame(w, nw));
          if (newVer) {
            if (
              newVer.kanji === w.kanji &&
              newVer.meaning === w.meaning &&
              newVer.tags?.join(",") === w.tags?.join(",")
            ) {
              unchanged.push(w);
              continue;
            }
            changed.changed.push(newVer);
          } else {
            changed.deleted.push(w);
          }
        }

        changed.added = newW.filter(
          (nw) =>
            ![...unchanged, ...changed.changed, ...changed.deleted].some((w) =>
              areWordsTheSame(w, nw),
            ),
        );

        const idb = _get().getIDB();
        for (const del of changed.deleted) {
          await idb.delete("wordbank", [del.word, del.special, del.readings]);
        }
        for (const word of [...changed.changed, ...changed.added]) {
          await idb.put("wordbank", word);
        }

        _set(() => {
          return {
            words: newW.sort((a, b) => compareReadings(a, b)),
          };
        });
      },
      getIDB() {
        const db = _get().idb;
        if (!db) throw new Error("No connection to DB open!");
        return db;
      },
      setTagColors(colors) {
        _set(() => ({ tagColors: { ...colors } }));
      },
      setShouldUpdateKanjiList(su) {
        _set(() => ({ shouldUpdateKanjiList: su }));
      },
      mutateKanjis: (mut: (k: Store["kanji"]) => Store["kanji"]) => {
        _set((prev) => {
          const kanjis = mut(prev.kanji);
          return { kanji: kanjis };
        });
      },
      updateKanji(kanji, data) {
        _set((prev) => {
          const kanjis = [...(prev.kanji ?? [])];
          const found = kanjis.find((k) => k.kanji === kanji);
          if (found) {
            found.lvl = data.lvl ?? found.lvl;
            found.status = data.status ?? found.status;
            found.type = data.type ?? found.type;
          }
          return { kanji: kanjis };
        });
      },
      addKanji(kanji) {
        _set((prev) => {
          if ((prev.kanji ?? []).find((k) => k.kanji === kanji.kanji))
            return prev;
          const kanjis = [...(prev.kanji ?? []), kanji];
          return { kanji: kanjis };
        });
      },
      removeKanji(kanji) {
        _set((prev) => ({
          kanji: [...(prev.kanji ?? []).filter((k) => k.kanji !== kanji)],
        }));
      },
      setSettings(key, value) {
        _set((prev) => ({
          settings: { ...prev.settings, [key]: value },
        }));
      },
    };
  }),
);

if (typeof window !== "undefined") {
  // load settings from localStorage
  const lsS = localStorage.getItem(LS_KEYS.settings);

  if (lsS) {
    const lsO = JSON.parse(lsS) as unknown;

    if (lsO && typeof lsO === "object") {
      const { setSettings } = useAppStore.getState();

      for (const [x, v] of Object.entries(DEFAULT_SETTINGS)) {
        const key = x as keyof Settings;

        if (key in lsO && typeof (lsO as Settings)[key] === typeof v) {
          setSettings(key, (lsO as Settings)[key]);
        }
      }
    }
  } else {
    err`No settings stored in LS!`;
  }

  useAppStore.subscribe(
    (s) => s.settings,
    (newSettings) => {
      localStorage.setItem(LS_KEYS.settings, JSON.stringify(newSettings));
    },
  );

  useAppStore.subscribe(
    (s) => s.tagColors,
    (newTags) => {
      localStorage.setItem(LS_KEYS.tag_colors, JSON.stringify(newTags));
      if (newTags != null) {
        let i = 0;
        for (const [tag, colors] of Object.entries(defaultWordBank.tags)) {
          if (!(tag in newTags)) {
            useAppStore.getState().setTagColors(
              Object.fromEntries<TagInfo>(
                Object.entries(newTags).reduce<[string, TagInfo][]>(
                  (p, v, ix) => {
                    if (i === ix) {
                      log`Force adding tag ${tag},${colors} @ ${i}`;
                      return [...p, [tag, colors], v];
                    } else {
                      return [...p, v];
                    }
                  },
                  [],
                ),
              ),
            );
          }
          i++;
        }
      }
    },
  );

  useAppStore.subscribe(
    (s) => s.words,
    (newW) => {
      // on words changed
      log`Folding`;
      useAppStore.setState(() => ({ foldedWords: foldWords(newW) }));
    },
  );

  const fixOldDB = async (db: AppDB) => {
    // fix all word "kanji" fields!
    const allKanjis = await db.getAll("wordbank");
    log`Fixing an old database!`;
    await dbPutMultiple(
      db,
      "wordbank",
      allKanjis.map((k) => getWordWithout(k)),
    );
  };

  void (async () => {
    const db = await openDB<AppDBSchema>(
      defaultDBSchema.name,
      defaultDBSchema.version,
      {
        blocked(_currentVersion, _blockedVersion, _event) {
          console.error("DB creation blocked");
        },
        blocking(_currentVersion, _blockedVersion, _event) {
          console.error("DB is blocking creation of other DB");
        },
        upgrade(database, oV, nV, transaction, ev) {
          defaultDBSchema.init?.(database, oV, nV, transaction, ev);
          if (oV <= 16) setTimeout(() => void fixOldDB(database), 100);
        },
      },
    );

    defaultDBSchema.seed(db);

    useAppStore.getState().setIDB(db);

    const LS = createLSStore(false);

    const mergedKanjis = await getMergedKanjis(LS, db, [], "a");

    useAppStore.getState().mutateKanjis(() => mergedKanjis.kanji);
    const tColors = defaultWordBank.tags as Record<string, TagInfo>;

    const lsColors =
      LS.getObject<Record<string, TagInfo>>(LS_KEYS.tag_colors) ?? {};
    useAppStore.getState().setTagColors({ ...tColors, ...lsColors });

    const allWords = await db.getAll("wordbank");
    await new Promise((res) => setTimeout(res, 1000));
    await useAppStore.getState().setWords(async (_) => allWords, false);
  })();
}
