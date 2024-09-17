import React, { type CSSProperties } from "react";
import { type DrawSessionData } from "./drawSession";
import { type LSStore } from "../localStorageProvider";
import { type KanjiDB } from "@/pages/_app";
import { randomStartWeighedInt } from "@/utils/utils";
import Link from "next/link";
import Router from "next/router";

import kanjiCSS from "@/components/list/list.module.css";

export type QuizWord = {
  kanji: string;
  readings: string[];
  word: string;
  special: number;
  meaning: string;
  blanked: string;
};

export type ReactQuizWord = QuizWord & {
  full: React.ReactNode;
  hint: React.ReactNode;
};

export const getReadings = (
  word: string,
  meaning: string,
  readings: string[],
  style?: RQWStyles,
  special?: number,
): React.ReactNode => {
  if (word.length !== readings.length)
    throw new Error("The word and readings array's lengths do not match!");
  return (
    <>
      <div style={{ lineHeight: "1.5em" }}>{meaning}</div>
      <ruby style={{ ...style?.ruby }}>
        {readings.map((r, i) => {
          return (
            <React.Fragment key={`word_reading_${r}_${i}`}>
              <span
                className={`${special === i ? kanjiCSS["special-kanji"] : ""}`}
                style={{ fontFamily: "inherit" }}
              >
                {word[i]}
              </span>
              <rt
                style={{
                  ...style?.rt,
                }}
              >
                {r}
              </rt>
            </React.Fragment>
          );
        })}
      </ruby>
    </>
  );
};

type RQWStyles = { ruby?: CSSProperties; rt?: CSSProperties };

export const getReadingsWithout = (
  word: string,
  meaning: string,
  readings: string[],
  special: number,
  style?: RQWStyles,
): React.ReactNode => {
  if (word.length !== readings.length)
    throw new Error("The word and readings array's lengths do not match!");
  if (special > word.length - 1 || special < 0)
    throw new Error("The special character is out of bounds!");
  return (
    <>
      <div style={{ lineHeight: "1.5em" }}>{meaning}</div>
      <ruby style={{ ...style?.ruby }}>
        {readings.map((r, i) => {
          return (
            <React.Fragment key={`word_special_reading_${r}_${i}`}>
              {i === special ? "〇" : word[i]}
              <rt
                style={{
                  ...style?.rt,
                }}
              >
                {r}
              </rt>
            </React.Fragment>
          );
        })}
      </ruby>
    </>
  );
};

export const getWordWithout = (word: string, special: number): string => {
  return [...word].map((q, i) => (i === special ? "〇" : q)).join("");
};

export const toRQW = (
  qw: QuizWord,
  styles?: { full?: RQWStyles; hint?: RQWStyles },
): ReactQuizWord => {
  return {
    ...qw,
    full: getReadings(
      qw.word,
      qw.meaning,
      qw.readings,
      styles?.full,
      qw.special,
    ),
    hint: getReadingsWithout(
      qw.word,
      qw.meaning,
      qw.readings,
      qw.special,
      styles?.hint,
    ),
  };
};

type GeneratorError = { err: React.ReactNode; message: string };

export type NextWordGenerator = AsyncGenerator<
  QuizWord | GeneratorError,
  GeneratorError,
  DrawSessionData
>;

const getErr = (m: string, ch: React.ReactNode = null): GeneratorError => {
  return {
    err: (
      <div className="text-center text-base text-red-500">
        <span className="text-xl text-red-500">{m}</span>
        {ch}
      </div>
    ),
    message: m,
  };
};

export async function* nextWordGenerator(
  startingData: DrawSessionData,
  LS: LSStore<KanjiDB>,
): NextWordGenerator {
  if (!LS?.idb) {
    console.error("LocalStorage not provided!");
    return getErr("Could not connected to IndexedDB");
  }
  let currentSessionData = startingData;
  while (true) {
    if (!currentSessionData) {
      return getErr("Session is not defined!");
    }
    const getNoWordErr = (m: string): GeneratorError => {
      return getErr(
        m,
        <>
          <br />
          <Link href="/wordbank" className="text-orange-500 underline">
            Go to the wordbank to add some!
            <br />
            (this session will remain open)
          </Link>
          <br />
          or
          <br />
          <Link
            onClick={() => {
              if (!LS?.idb) return;
              void LS.idb.put("draw", { ...currentSessionData, open: false });
            }}
            href="/draw"
            className="underline"
          >
            Create a session with other kanjis!
            <br />
            (will close this session)
          </Link>
        </>,
      );
    };
    const words: QuizWord[] = await LS.idb.getAll("wordbank");
    const lastDoneKanji =
      currentSessionData.sessionResults[
        currentSessionData.sessionResults.length - 1
      ];
    const getKanjiValueFor = (k: string): number => {
      return currentSessionData.sessionResults
        .filter((q) => q.kanji === k)
        .reduce((p, n) => p + n.result, 0);
    };

    const kanjiWithWords = currentSessionData.sessionKanjis
      .filter((k) => !!words.find((f) => f.kanji === k)) // has words in wordbank
      .filter((f) => (!lastDoneKanji ? true : f !== lastDoneKanji.kanji)) // wasn't just used
      .sort((a, b) => getKanjiValueFor(a) - getKanjiValueFor(b)); // sorted by points acquired

    if (kanjiWithWords.length === 0) {
      currentSessionData = yield getNoWordErr(
        "None of the selected kanjis have words in the wordbank!",
      );
      continue;
    }
    const randomKanjiIndex = randomStartWeighedInt(
      0,
      kanjiWithWords.length - 1,
      10,
    );
    const randomKanji = kanjiWithWords[randomKanjiIndex];
    const kanjiWords = words.filter((f) => f.kanji === randomKanji);
    if (kanjiWords.length === 0) {
      currentSessionData = yield getNoWordErr(
        `There are no words to show corresponding to the kanji: ${randomKanji}`,
      );
      continue;
    }
    const randomWordIndex = randomStartWeighedInt(0, kanjiWords.length - 1, 10);
    const randomWord = kanjiWords[randomWordIndex];
    if (!randomWord)
      return getErr(
        "Error in the code",
        <button
          onClick={() => {
            Router.reload();
          }}
        >
          Refresh the page
        </button>,
      );
    currentSessionData = (yield randomWord) ?? currentSessionData;
  }
}
