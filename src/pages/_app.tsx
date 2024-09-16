import { GeistSans } from "geist/font/sans";
import { type AppType } from "next/app";

import { api } from "@/utils/api";

import "@/styles/globals.css";
import {
  type DBInit,
  LocalStorageProvider,
} from "@/components/localStorageProvider";
import { useState } from "react";
import { type DBSchema } from "idb";
import {
  type Kanji,
  type KanjiStatus,
  type KanjiType,
} from "@/components/list/kanjiStore";
import { type DrawSessionData } from "@/components/draw/drawSession";
import Link from "next/link";

export type KanjiDB = DBSchema & {
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

const MyApp: AppType = ({ Component, pageProps }) => {
  const [dbSchema] = useState<DBInit<KanjiDB>>({
    name: "kanjiDB",
    version: 9,
    init(db, o, n, transaction) {
      if (o < 6) {
        if (db.objectStoreNames.contains("kanji"))
          db.deleteObjectStore("kanji");
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
        o = 6;
      }
      if (o > 6 && o < 8) {
        console.log("upgrading the DB");
        if (!db.objectStoreNames.contains("draw"))
          db.createObjectStore("draw", { keyPath: "sessionID" });
      }
    },
  });

  return (
    <LocalStorageProvider surpressWarnings dbCreator={dbSchema}>
      <div className={GeistSans.className}>
        <Component {...pageProps} />
      </div>
    </LocalStorageProvider>
  );
};

export default api.withTRPC(MyApp);
