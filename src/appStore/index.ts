import { type Settings } from "@/pages";
import { err } from "@/utils/utils";
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
import { type QuizWord } from "../components/draw/quizWords";
import { type DrawSessionData } from "../components/draw/drawSession";

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

export const DEFAULT_SETTINGS: Settings = {
  autoChangeIME: false,
  wordBankAutoFilter: true,
  kanjiRowCount: 8,
  autoMarkAsCompleted: false,
  showMax: 1000,
};

export const defaultDBSchema: DBInit<AppDBSchema> = {
  name: "kanjiDB",
  version: 16,
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
  kanjis: Kanji[] | null;
  shouldUpdateKanjiList: boolean;
  setShouldUpdateKanjiList: (su: boolean) => void;
  mutateKanjis: (mutation: (k: Store["kanjis"]) => Store["kanjis"]) => void;
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

export const useAppStore = create<Store>((_set, _get) => {
  return {
    kanjis: null,
    shouldUpdateKanjiList: false,
    tagColors: null,
    settings: DEFAULT_SETTINGS,
    idb: null,
    setIDB(idb) {
      _set((prev) => ({ ...prev, idb }));
    },
    getIDB() {
      const db = _get().idb;
      if (!db) throw new Error("No connection to DB open!");
      return db;
    },
    setTagColors(colors) {
      _set((prev) => ({ ...prev, tagColors: colors }));
    },
    setShouldUpdateKanjiList(su) {
      _set((prev) => ({ ...prev, shouldUpdateKanjiList: su }));
    },
    mutateKanjis: (mut: (k: Store["kanjis"]) => Store["kanjis"]) => {
      _set((prev) => {
        const kanjis = mut(prev.kanjis);
        return { ...prev, kanjis };
      });
    },
    updateKanji(kanji, data) {
      _set((prev) => {
        const kanjis = [...(prev.kanjis ?? [])];
        const found = kanjis.find((k) => k.kanji === kanji);
        if (found) {
          found.lvl = data.lvl ?? found.lvl;
          found.status = data.status ?? found.status;
          found.type = data.type ?? found.type;
        }
        return { ...prev, kanjis };
      });
    },
    addKanji(kanji) {
      _set((prev) => {
        if ((prev.kanjis ?? []).find((k) => k.kanji === kanji.kanji))
          return prev;
        const kanjis = [...(prev.kanjis ?? []), kanji];
        return { ...prev, kanjis };
      });
    },

    removeKanji(kanji) {
      _set((prev) => {
        const newStore = {
          ...prev,
          kanjis: [...(prev.kanjis ?? []).filter((k) => k.kanji !== kanji)],
        };
        return newStore;
      });
    },
    setSettings(key, value) {
      _set((prev) => ({
        ...prev,
        settings: { ...prev.settings, [key]: value },
      }));
    },
  };
});

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

  useAppStore.subscribe((state, prev) => {
    if (state.settings !== prev.settings)
      localStorage.setItem(LS_KEYS.settings, JSON.stringify(state.settings));
    if (state.tagColors !== prev.tagColors)
      localStorage.setItem(LS_KEYS.tag_colors, JSON.stringify(state.tagColors));
  });

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
  })();
}
