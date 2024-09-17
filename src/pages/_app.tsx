import { GeistSans } from "geist/font/sans";
import { type AppType } from "next/app";

import { api } from "@/utils/api";

import "@/styles/globals.css";
import {
  type DBInit,
  LocalStorageProvider,
  LS_KEYS,
} from "@/components/localStorageProvider";
import { useState } from "react";
import { type DBSchema } from "idb";
import {
  type Kanji,
  type KanjiStatus,
  type KanjiType,
} from "@/components/list/kanjiStore";
import { type DrawSessionData } from "@/components/draw/drawSession";
import { QuizWord } from "@/components/draw/quizWords";
import {
  DEFAULT_KANJI_VERSION,
  DEFAULT_KANJIS,
} from "@/components/list/defaultKanji";

export type KanjiDB = DBSchema & {
  wordbank: {
    key: [string, number];
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

const MyApp: AppType = ({ Component, pageProps }) => {
  const [dbSchema] = useState<DBInit<KanjiDB>>({
    name: "kanjiDB",
    version: 14,
    seed(db) {
      console.log("seeding!");
      if (db.objectStoreNames.contains("kanji")) {
        db.count("kanji").then((q) => {
          console.log(q);
          if (q === 0) {
            console.log("seeding kanjis");
            // seed kanji list with default value
            for (const kanji of DEFAULT_KANJIS()) {
              void db.put("kanji", kanji);
            }
            localStorage.setItem(LS_KEYS.kanji_ver, DEFAULT_KANJI_VERSION);
          }
        });
      }
      if (db.objectStoreNames.contains("wordbank")) {
        db.count("wordbank").then((q) => {
          if (q === 0) {
            // TODO: seed with default words
          }
        });
      }
    },
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
      if (o >= 6 && o < 8) {
        if (!db.objectStoreNames.contains("draw"))
          db.createObjectStore("draw", { keyPath: "sessionID" });
        o = 8;
      }
      if (o >= 8 && o <= 13) {
        if (db.objectStoreNames.contains("wordbank"))
          db.deleteObjectStore("wordbank");
        const wordbankStore = db.createObjectStore("wordbank", {
          keyPath: ["word", "special"],
        });
        if (wordbankStore) {
          if (!wordbankStore.indexNames.contains("kanji"))
            wordbankStore.createIndex("kanji", "kanji", { unique: false });
        }
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
