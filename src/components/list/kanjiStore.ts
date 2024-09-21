import { type Settings } from "@/pages";
import { err } from "@/utils/utils";
import { create } from "zustand";
import { LS_KEYS } from "../localStorageProvider";

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
};

export const useKanjiStore = create<Store>((_set, _get) => {
  return {
    kanjis: null,
    shouldUpdateKanjiList: false,
    tagColors: null,
    settings: {
      autoChangeIME: false,
      wordBankAutoFilter: true,
      kanjiRowCount: 8,
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
  try {
    // load settings from localStorage
    const lsS = localStorage.getItem(LS_KEYS.settings);

    if (!lsS) throw new Error("No settings saved in LS");

    const lsO = JSON.parse(lsS) as unknown;

    if (lsO && typeof lsO === "object") {
      const { setSettings } = useKanjiStore.getState();

      // we have an object
      if ("autoChangeIME" in lsO && typeof lsO.autoChangeIME === "boolean") {
        setSettings("autoChangeIME", lsO.autoChangeIME);
      }
      if (
        "wordBankAutoFilter" in lsO &&
        typeof lsO.wordBankAutoFilter === "boolean"
      ) {
        setSettings("wordBankAutoFilter", lsO.wordBankAutoFilter);
      }
      if ("kanjiRowCount" in lsO && typeof lsO.kanjiRowCount === "number") {
        setSettings("kanjiRowCount", lsO.kanjiRowCount);
      }
    }

    useKanjiStore.subscribe((state) =>
      localStorage.setItem(LS_KEYS.settings, JSON.stringify(state.settings)),
    );
  } catch (e) {
    err`Could not load settings from localStorage! ${e}`;
  }
}
