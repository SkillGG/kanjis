import React from "react";
import { type DrawSessionData } from "./drawSession";
import RDS from "react-dom/server";
import { LSStore } from "../localStorageProvider";
import { KanjiDB } from "@/pages/_app";

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
): React.ReactNode => {
  if (word.length !== readings.length)
    throw new Error("The wor dand readings array's lengths do not match!");
  return (
    <>
      <div>{meaning}</div>
      <ruby style={{ fontSize: "1.5rem" }}>
        {readings.map((r, i) => {
          return (
            <React.Fragment key={`word_reading_${r}_${i}`}>
              {word[i]}
              <rt>{r}</rt>
            </React.Fragment>
          );
        })}
      </ruby>
    </>
  );
};

export const getReadingsWithout = (
  word: string,
  meaning: string,
  readings: string[],
  special: number,
): React.ReactNode => {
  if (word.length !== readings.length)
    throw new Error("The word and readings array's lengths do not match!");
  if (special > word.length - 1 || special < 0)
    throw new Error("The special character is out of bounds!");
  return (
    <>
      <div>{meaning}</div>
      <ruby style={{ fontSize: "1.3em" }}>
        {readings.map((r, i) => {
          return (
            <React.Fragment key={`word_special_reading_${r}_${i}`}>
              {i === special ? "〇" : word[i]}
              <rt>{r}</rt>
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

export const toRQW = (qw: QuizWord): ReactQuizWord => {
  return {
    ...qw,
    full: getReadings(qw.word, qw.meaning, qw.readings),
    hint: getReadingsWithout(qw.word, qw.meaning, qw.readings, qw.special),
  };
};

const randomInt = (min: number, max: number) =>
  Math.round(Math.random() * Math.trunc(max)) + Math.trunc(min);

export async function* nextWordGenerator(
  startingData: DrawSessionData,
  LS: LSStore<KanjiDB>,
): AsyncGenerator<QuizWord, null, DrawSessionData> {
  if (!LS || !LS.db) {
    console.error("LocalStorage not provided!");
    return null;
  }
  let sesh = startingData;
  if (!sesh) throw new Error("Sesh is undefined!");
  while (true) {
    const words: QuizWord[] = await LS.db.getAll("wordbank");
    const availableKanjiWords = sesh.sessionKanjis.filter(
      (k) => !!words.find((f) => f.kanji === k),
    );
    console.log(sesh.sessionKanjis, words, availableKanjiWords);
    if (availableKanjiWords.length === 0) {
      console.error("No words!");
      return null;
    }
    const randomKanji =
      availableKanjiWords[randomInt(0, availableKanjiWords.length - 1)];
    const kanjiWords = words.filter((f) => f.kanji === randomKanji);
    const randomWord = kanjiWords[randomInt(0, kanjiWords.length - 1)];
    if (!randomWord) {
      console.error("No words!");
      return null;
    }
    sesh = (yield randomWord) ?? sesh;
  }
}
