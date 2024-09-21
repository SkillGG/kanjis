import {
  type DBSchema,
  type IDBPDatabase,
  type OpenDBCallbacks,
} from "idb";
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
  getNum<T extends number>(key: string): T | null;
  getRaw(key: string): string | null;
  getString<T extends string>(key: string): T | null;
  getObject<T extends object>(key: string): T | null;
};

const LSContext = createContext<LSStore>({
  set() {
    throw new Error("Not in store provider!");
  },
  get() {
    throw new Error("Not in store provider!");
  },
  getNum() {
    throw new Error("Not in store provider!");
  },
  getObject() {
    throw new Error("Not in store provider!");
  },
  getRaw() {
    throw new Error("Not in store provider!");
  },
  getString() {
    throw new Error("Not in store provider!");
  },
});

export const LS_KEYS = {
  kanjis: "kanjis",
  kanji_ver: "default_kanji_version",
  omit_version: "omit_kanji_version",
  badges: "show_badges",
  row_count: "rowCount",
  wordbank_ver: "wordbank_version",
  tag_colors: "tagColors",
  settings: "settings",
} as const;

export type DBInit<T extends DBSchema> = {
  name: string;
  version: number;
  seed: (db: IDBPDatabase<T>) => void;
  init: OpenDBCallbacks<T>["upgrade"];
};

export const createLSStore = (surpressWarnings: boolean): LSStore => {
  return {
    get<T extends LSData>(key: string) {
      if (typeof window === undefined) return null;

      const raw = localStorage.getItem(key);
      try {
        if (!raw) throw new Error(`No LS value for key ${key}!`);
        const value = JSON.parse(raw) as unknown;
        if (
          typeof value === "string" ||
          typeof value === "number" ||
          (typeof value === "object" && !!value)
        )
          return value as T;
        return null;
      } catch (e) {
        if (!surpressWarnings) console.warn((e as Error).message);
        return null;
      }
    },
    getRaw(key) {
      if (typeof window == "undefined") return null;
      return window.localStorage.getItem(key);
    },
    getString<T extends string = string>(key: string) {
      if (typeof window === "undefined") return null;
      const raw = localStorage.getItem(key);
      try {
        if (!raw) throw new Error(`No LS value for key ${key}!`);
        const value = JSON.parse(raw) as unknown;
        if (typeof value === "string") return value as T;
        else return String(raw) as T;
      } catch (e) {
        if (raw && !raw.startsWith(`"`)) {
          return String(raw) as T;
        }
        if (!surpressWarnings) console.warn((e as Error).message);
        return null;
      }
    },
    getObject<T extends object = object>(key: string) {
      if (typeof window === "undefined") return null;
      const raw = localStorage.getItem(key);
      try {
        if (!raw) throw new Error(`No LS value for key ${key}!`);
        const value = JSON.parse(raw) as unknown;
        if (typeof value === "object") return value as T;
        return null;
      } catch (e) {
        if (!surpressWarnings) console.warn((e as Error).message);
        return null;
      }
    },
    getNum<T extends number = number>(key: string): T | null {
      if (typeof window === "undefined") return null;
      const raw = localStorage.getItem(key);
      try {
        if (!raw) throw new Error(`No LS value for key ${key}!`);
        const value = JSON.parse(raw) as unknown;
        if (typeof value === "number") return value as T;
        else return Number(value) as T;
      } catch (e) {
        if (!surpressWarnings) console.warn((e as Error).message);
        return null;
      }
    },
    set<T extends LSData>(key: string, value: T | null) {
      if (typeof window === undefined) return;
      if (!value) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    },
  };
};

export const LocalStorageProvider = ({
  children,
  surpressWarnings,
}: PropsWithChildren<{
  surpressWarnings?: boolean;
}>) => {
  const [LStore] = useState<LSStore>(createLSStore(surpressWarnings ?? false));

  return <LSContext.Provider value={LStore}>{children}</LSContext.Provider>;
};

export const useLocalStorage = () => {
  const ctx = useContext(LSContext);
  if (!ctx) throw new Error("Not inside LocalStorageProivder!");
  return ctx;
};
