import React, {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";

type LSData = string | number | object;

export type DBSchema = {
  name: string;
  init: (db: IDBDatabase) => void;
  version: number;
};

export type LSStore = {
  set<T extends LSData>(key: string, val: T | null): void;
  get<T extends LSData>(key: string): T | null;
  getNum<T extends number>(key: string): T | null;
  getRaw(key: string): string | null;
  getString<T extends string>(key: string): T | null;
  getObject<T extends object>(key: string): T | null;
  db: IDBDatabase | null;
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
  db: null,
});
export const LS_KEYS = {
  kanjis: "kanjis",
  kanji_ver: "default_kanji_version",
  omit_version: "omit_kanji_version",
  badges: "show_badges",
  row_count: "rowCount",
} as const;

export const LocalStorageProvider = ({
  children,
  dbCreator,
}: PropsWithChildren<{
  dbCreator: DBSchema;
}>) => {
  const [db, setDB] = useState<IDBDatabase | null>(null);
  useEffect(() => {
    console.log("DBCREATOR CHANGED");
    const dbOpenRequest = indexedDB.open(dbCreator.name, dbCreator.version);
    dbOpenRequest.onsuccess = () => {
      setDB(dbOpenRequest.result);
    };
    dbOpenRequest.onupgradeneeded = () => {
      dbCreator.init(dbOpenRequest.result);
    };
  }, [dbCreator]);

  const [LStore, setStore] = useState<LSStore>({
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
        console.warn((e as Error).message);
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
        console.warn((e as Error).message);
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
        console.warn((e as Error).message);
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
        console.warn((e as Error).message);
        return null;
      }
    },
    set<T extends LSData>(key: string, value: T | null) {
      // console.log("[LS] ", key, ": ", value);
      if (typeof window === undefined) return;
      if (!value) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    },
    db: null,
  });

  useEffect(() => {
    console.log("db changed");
    if (!db) return;
    else setStore((prev) => ({ ...prev, db }));
  }, [db]);

  return <LSContext.Provider value={LStore}>{children}</LSContext.Provider>;
};

export const useLocalStorage = () => {
  const ctx = useContext(LSContext);
  if (!ctx) throw new Error("Not inside LocalStorageProivder!");
  return ctx;
};
