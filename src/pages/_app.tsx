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
import { type QuizWord } from "@/components/draw/quizWords";
import {
  DEFAULT_KANJI_VERSION,
  DEFAULT_KANJIS,
} from "@/components/list/defaultKanji";

export type KanjiDB = DBSchema & {
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

import wordBankWords from "@/pages/wordbank/wordbank.json";

const MyApp: AppType = ({ Component, pageProps }) => {
  const [dbSchema] = useState<DBInit<KanjiDB>>({
    name: "kanjiDB",
    version: 16,
    seed(db) {
      console.log("seeding!");
      if (db.objectStoreNames.contains("kanji")) {
        void db.count("kanji").then((q) => {
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
        void db.count("wordbank").then((q) => {
          if (q === 0) {
            // TODO: seed with default words
            const defaultWords = wordBankWords.words as QuizWord[];
            for (const word of defaultWords) {
              void db.put("wordbank", word);
            }
            localStorage.setItem(
              LS_KEYS.wordbank_ver,
              wordBankWords.version as string,
            );
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
