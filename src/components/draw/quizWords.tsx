import React, { type CSSProperties } from "react";
import { SessionResult, type DrawSessionData } from "./drawSession";
import { type LSStore } from "../localStorageProvider";
import { type KanjiDB } from "@/pages/_app";
import { log, randomStartWeighedInt } from "@/utils/utils";
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

export const areWordsTheSame = (
  k1: QuizWord,
  k2: QuizWord,
  joinMeanings = true,
) => {
  return (
    k1.word === k2.word &&
    k1.special === k2.special &&
    k1.readings.join(joinMeanings ? "" : "_") ===
      k2.readings.join(joinMeanings ? "" : "_")
  );
};

export const getReadings = (
  word: string,
  meaning: string,
  readings: string[],
  style?: RQWStyles,
  specials?: number[],
): React.ReactNode => {
  if (word.length !== readings.length)
    throw new Error("The word and readings array's lengths do not match!");
  if (specials)
    for (const special of specials)
      if (special > word.length - 1 || special < 0)
        throw new Error("The special character is out of bounds!");
  return (
    <>
      <div style={{ lineHeight: "1.5em" }}>{meaning}</div>
      <ruby style={{ ...style?.ruby }}>
        {readings.map((r, i) => {
          return (
            <React.Fragment key={`word_reading_${r}_${i}`}>
              <span
                className={`${specials?.includes(i) ? kanjiCSS["special-kanji"] : ""}`}
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
  specials: number[],
  style?: RQWStyles,
): React.ReactNode => {
  if (word.length !== readings.length)
    throw new Error("The word and readings array's lengths do not match!");
  for (const special of specials)
    if (special > word.length - 1 || special < 0)
      throw new Error("The special character is out of bounds!");
  return (
    <>
      <div style={{ lineHeight: "1.5em" }}>{meaning}</div>
      <ruby style={{ ...style?.ruby }}>
        {readings.map((r, i) => {
          return (
            <React.Fragment key={`word_special_reading_${r}_${i}`}>
              {specials.includes(i) ? "〇" : word[i]}
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
  multipleSpecials?: number[],
): ReactQuizWord => {
  return {
    ...qw,
    full: getReadings(
      qw.word,
      qw.meaning,
      qw.readings,
      styles?.full,
      multipleSpecials ?? [qw.special],
    ),
    hint: getReadingsWithout(
      qw.word,
      qw.meaning,
      qw.readings,
      multipleSpecials ?? [qw.special],
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

    const getKanjiPoints = (k: string): number =>
      currentSessionData.sessionResults
        .filter((q) => q.kanji === k)
        .reduce((p, n) => p + n.result, 0);

    const getWordPoints = (w: string): number =>
      currentSessionData.sessionResults
        .filter((sr) => sr.word === w)
        .reduce((p, n) => p + n.result, 0);

    const getAllWordsWithKanji = (k: string): QuizWord[] =>
      words.filter((q) => q.kanji === k);

    const getDistanceFromLastKanji = (k: string): number => {
      if (!currentSessionData.sessionResults.find((q) => q.kanji === k))
        return Infinity;
      let num = 0;
      const revSRs = [...currentSessionData.sessionResults].reverse();
      for (const result of revSRs) {
        if (result.kanji === k) return num;
        num++;
      }
      return Infinity;
    };

    const getDistanceFromLastWord = (w: string): number => {
      if (!currentSessionData.sessionResults.find((q) => q.word === w))
        return Infinity;
      let num = 0;
      const revSRs = [...currentSessionData.sessionResults].reverse();
      for (const result of revSRs) {
        if (result.word === w) return num;
        num++;
      }
      return Infinity;
    };

    const getAllResultsForWord = (w: string): SessionResult[] =>
      currentSessionData.sessionResults.filter((f) => f.word === w);

    const getAllWordsElligibleForKanji = (k: string): QuizWord[] =>
      getAllWordsWithKanji(k)
        .filter((word) => {
          const allResultsForWord = getAllResultsForWord(word.word);
          return (
            allResultsForWord[allResultsForWord.length - 1]?.word !==
              word.word ||
            getDistanceFromLastWord(word.word) >
              getAllWordsWithKanji(k).length - 2
          );
        })
        .sort((a, b) => getWordPoints(a.word) - getWordPoints(b.word));

    const kanjiWithWords = currentSessionData.sessionKanjis
      .map((k) => {
        const words = getAllWordsElligibleForKanji(k);
        return {
          kanji: k,
          words,
          dist: getDistanceFromLastKanji(k),
          points:
            words.slice(0, 3).reduce((p, n) => p + getWordPoints(n.word), 0) /
            3,
        };
      })
      .filter((z) => z.words.length >= 1 && z.dist > 2)
      .sort((a, b) => a.points - b.points); // sorted by points acquired

    log`Possible kanjis: ${kanjiWithWords}`;

    if (!kanjiWithWords || kanjiWithWords.length === 0) {
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
    const randomKanjiWithWords = kanjiWithWords[randomKanjiIndex];

    if (!randomKanjiWithWords) {
      yield getErr(
        "Error in the code!",
        <button onClick={() => Router.reload()}>Refresh the page</button>,
      );
      continue;
    }

    if (randomKanjiWithWords.words.length === 0) {
      currentSessionData = yield getNoWordErr(
        `There are no words to show corresponding to the kanji: ${randomKanjiWithWords.kanji}`,
      );
      continue;
    }

    const randomWordIndex = randomStartWeighedInt(
      0,
      randomKanjiWithWords.words.length - 1,
      10,
    );

    const randomWord = randomKanjiWithWords.words[randomWordIndex];
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
