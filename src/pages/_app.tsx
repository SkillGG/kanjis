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
};

const MyApp: AppType = ({ Component, pageProps }) => {
  const [dbSchema] = useState<DBInit<KanjiDB>>({
    name: "kanjiDB",
    version: 6,
    init(db, o, n, transaction) {
      const oS = db.objectStoreNames.contains("kanji")
        ? transaction.store
        : db.createObjectStore("kanji", { keyPath: "kanji" });
      if (oS) {
        if (!oS.indexNames.contains("type"))
          oS.createIndex("type", "type", { unique: false });
        if (!oS.indexNames.contains("status"))
          oS.createIndex("status", "status", { unique: false });
        if (!oS.indexNames.contains("lvl"))
          oS.createIndex("lvl", "lvl", { unique: false });
        if (!oS.indexNames.contains("index"))
          oS.createIndex("index", "index", { unique: true });
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
