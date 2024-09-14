import React, {
  createContext,
  type PropsWithChildren,
  useContext,
  useState,
} from "react";

type LSData = string | number | object;

export type LSStore = {
  set<T extends LSData>(key: string, val: T | null): void;
  get<T extends LSData>(key: string): T | null;
};

const LSContext = createContext<LSStore>({
  set() {
    throw new Error("Not in store provider!");
  },
  get() {
    throw new Error("Not in store provider!");
  },
});
export const LS_KEYS = {
  kanjis: "kanjis",
  kanji_ver: "default_kanji_version",
  omit_version: "omit_kanji_version",
  badges: "show_badges",
  row_count: "rowCount",
} as const;

export const LocalStorageProvider = ({ children }: PropsWithChildren) => {
  const [LStore] = useState<LSStore>({
    get<T extends LSData>(key: string) {
      if (typeof window !== "undefined") {
        const lsvalue = localStorage.getItem(key);
        // console.log("[LS]", key, ": ", lsvalue);
        try {
          if (!lsvalue) throw new Error(`No LS value for key ${key}!`);
          const deJSON = JSON.parse(lsvalue) as unknown;
          if (
            typeof deJSON === "string" ||
            typeof deJSON === "number" ||
            (typeof deJSON === "object" && !!deJSON)
          ) {
            return deJSON as T;
          }
        } catch (e) {
          console.warn((e as Error).message);
          return null;
        }
      }
      return null;
    },
    set<T extends LSData>(key: string, value: T | null) {
      // console.log("[LS] ", key, ": ", value);
      if (!value) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    },
  });

  return <LSContext.Provider value={LStore}>{children}</LSContext.Provider>;
};

export const useLocalStorage = () => {
  const ctx = useContext(LSContext);
  if (!ctx) throw new Error("Not inside LocalStorageProivder!");
  return ctx;
};
