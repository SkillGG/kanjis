import { GeistSans } from "geist/font/sans";
import { type AppType } from "next/app";

import { api } from "@/utils/api";

import "@/styles/globals.css";
import {
  type DBSchema,
  LocalStorageProvider,
} from "@/components/localStorageProvider";
import { useState } from "react";

const MyApp: AppType = ({ Component, pageProps }) => {
  const [dbSchema] = useState<DBSchema>({
    name: "kanjiDB",
    version: 1,
    init(db) {
      db.createObjectStore("kanji", { keyPath: "kanji" })
        .createIndex("kanji", "kanji", { unique: true })
        .objectStore.createIndex("lvl", "lvl", { unique: false })
        .objectStore.createIndex("sattus", "sattus", { unique: false })
        .objectStore.createIndex("type", "type", { unique: false });
    },
  });

  return (
    <LocalStorageProvider dbCreator={dbSchema}>
      <div className={GeistSans.className}>
        <Component {...pageProps} />
      </div>
    </LocalStorageProvider>
  );
};

export default api.withTRPC(MyApp);
