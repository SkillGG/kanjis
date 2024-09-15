import { GeistSans } from "geist/font/sans";
import { type AppType } from "next/app";

import { api } from "@/utils/api";

import "@/styles/globals.css";
import {
  type DBInit,
  type KanjiDB,
  LocalStorageProvider,
} from "@/components/localStorageProvider";
import { useState } from "react";

const MyApp: AppType = ({ Component, pageProps }) => {
  const [dbSchema] = useState<DBInit<KanjiDB>>({
    name: "kanjiDB",
    version: 6,
    init(db, o, n, transaction) {
      const oS = db.objectStoreNames.contains("kanji")
        ? transaction.store
        : db.createObjectStore("kanji", { keyPath: "kanji" });
      if (oS) {
        oS.createIndex("type", "type", { unique: false });
        oS.createIndex("status", "status", { unique: false });
        oS.createIndex("lvl", "lvl", { unique: false });
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
