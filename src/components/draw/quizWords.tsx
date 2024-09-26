import React, { type CSSProperties } from "react";
import { type DrawSessionData } from "./drawSession";
import { log, randomInt, randomStartWeighedInt } from "@/utils/utils";
import Link from "next/link";
import Router from "next/router";

import kanjiCSS from "@/components/list/list.module.css";
import { twMerge } from "tailwind-merge";
import { useAppStore, type AppDB } from "../../appStore";

export type QuizWord = {
  kanji: string;
  readings: string[];
  word: string;
  special: number;
  meaning: string;
  blanked: string;
  tags?: string[];
};

export type ReactQuizWord = QuizWord & {
  full: React.ReactNode;
  hint: React.ReactNode;
};

export type MultiRQW = ReactQuizWord & { multiSpecial?: number[] };

export type MultiQW = QuizWord & { multiSpecial?: number[] };

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

type RQWStyles = {
  ruby?: {
    style?: CSSProperties;
    className?: React.HTMLAttributes<"div">["className"];
  };
  rt?: {
    style?: CSSProperties;
    className?: React.HTMLAttributes<"div">["className"];
  };
  meaning?: {
    style?: CSSProperties;
    className?: React.HTMLAttributes<"div">["className"];
  };
  kanji?: {
    style?: CSSProperties;
    className?: React.HTMLAttributes<"div">["className"];
  };
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
        throw new Error(
          `The special character is out of bounds! ${special} ${word.length}`,
        );
  return (
    <>
      <div
        style={{ ...style?.meaning?.style }}
        className={style?.meaning?.className}
      >
        {meaning}
      </div>
      <ruby
        style={{ ...style?.ruby?.style }}
        className={style?.ruby?.className}
      >
        {readings.map((r, i) => {
          return (
            <React.Fragment key={`word_reading_${r}_${i}`}>
              <span
                className={twMerge(
                  specials?.includes(i) && kanjiCSS["special-kanji"],
                  style?.kanji?.className,
                  "relative z-[1] block bg-transparent",
                )}
                style={style?.kanji?.style}
              >
                {word[i]}
                <div className="absolute left-0 top-0 z-[-1] mt-[-0.15em] hidden w-full items-center justify-center bg-transparent sm:flex">
                  <svg
                    className="h-full w-full bg-transparent"
                    viewBox="0,0,100,100"
                  >
                    <rect
                      width="100"
                      height="100"
                      strokeWidth={1}
                      fill="transparent"
                      stroke="red"
                    />
                    <line
                      x1="50"
                      x2="50"
                      y1="0"
                      y2="100"
                      stroke="red"
                      strokeWidth={1}
                      strokeDasharray="4,4"
                    />
                    <line
                      x1="0"
                      x2="100"
                      y1="50"
                      y2="50"
                      stroke="red"
                      strokeWidth={1}
                      strokeDasharray="4,4"
                    />
                  </svg>
                </div>
              </span>
              <rt
                style={{
                  ...style?.rt?.style,
                }}
                className={style?.rt?.className}
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
      <div
        style={{ ...style?.meaning?.style }}
        className={style?.meaning?.className}
      >
        {meaning}
      </div>
      <ruby
        style={{ ...style?.ruby?.style }}
        className={twMerge("z-10", style?.ruby?.className)}
      >
        {readings.map((r, i) => {
          return (
            <React.Fragment key={`word_special_reading_${r}_${i}`}>
              <span
                className={twMerge(
                  style?.kanji?.className,
                  "relative z-[1] block bg-transparent",
                )}
                style={style?.kanji?.style}
              >
                {specials.includes(i) ? "〇" : word[i]}
              </span>
              <rt
                style={{
                  ...style?.rt?.style,
                }}
                className={style?.rt?.className}
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

export const getWordWithout = ({
  meaning,
  readings,
  special,
  word,
  tags,
}: {
  word: string;
  special: number;
  meaning: string;
  readings: string[];
  tags?: string[];
}): QuizWord => {
  return {
    word,
    special,
    kanji: word.charAt(special),
    blanked: word
      .split("")
      .map((k, i) => (i === special ? "〇" : k))
      .join(""),
    meaning: meaning,
    readings,
    tags,
  } as QuizWord;
};

export const unfoldMRQW = (mrqw: MultiRQW): QuizWord[] => {
  const specials = mrqw.multiSpecial ?? [mrqw.special];

  const disjoinedQs = specials.map((special) =>
    getWordWithout({ ...mrqw, special }),
  );
  return disjoinedQs;
};

export const unfoldQW = (mqw: MultiQW): QuizWord[] => {
  const specials = mqw.multiSpecial ?? [mqw.special];
  const disjoinedQs = specials.map((special) =>
    getWordWithout({ ...mqw, special }),
  );
  return disjoinedQs;
};

export const stripRQW = ({
  blanked,
  kanji,
  meaning,
  readings,
  special,
  word,
  tags,
}: QuizWord): QuizWord => {
  return { blanked, kanji, meaning, readings, special, word, tags };
};

export const generateQWReadings = (
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

export const getErr = (
  m: string,
  ch: React.ReactNode = null,
): GeneratorError => {
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

export const getWordPoints = (
  session: DrawSessionData,
  word: string,
  kanji: string,
): number =>
  session.sessionResults
    .filter((sr) => (sr.word === word || sr.word === "") && sr.kanji === kanji)
    .reduce((p, n) => p + n.result, 0);

export const getAllWordsWithKanji = (
  words: QuizWord[],
  kanji: string,
): QuizWord[] => words.filter((q) => q.kanji === kanji);

export const getDistanceFromLastKanji = (
  session: DrawSessionData,
  kanji: string,
): number => {
  if (!session.sessionResults.find((q) => q.kanji === kanji)) return Infinity;
  let num = 0;
  const revSRs = [
    ...session.sessionResults.filter((f) => !f.notAnswered),
  ].reverse();
  for (const result of revSRs) {
    if (result.kanji === kanji) return num;
    num++;
  }
  return Infinity;
};

export const getDistanceFromLastWord = (
  session: DrawSessionData,
  word: string,
): number => {
  if (!session.sessionResults.find((q) => q.word === word)) return Infinity;
  let num = 0;
  const revSRs = [
    ...session.sessionResults.filter((f) => !f.notAnswered),
  ].reverse();
  for (const result of revSRs) {
    if (result.word === word) return num;
    num++;
  }
  return Infinity;
};

export const getAllWordsWithKanjiAndTags = (
  words: QuizWord[],
  kanji: string,
  tags?: string[],
) => {
  const allWords = getAllWordsWithKanji(words, kanji); // get kanji
  // log`All words: ${allWords}`;
  return allWords.filter(
    (w) =>
      !tags
        ? true
        : !w.tags || w.tags.length === 0
          ? tags.includes("UNTAGGED")
          : w.tags?.some((t) => tags?.includes(t)), // remove words that don't match the tag group
  );
};

export const getAllWordsElligibleForKanji = (
  session: DrawSessionData,
  words: QuizWord[],
  kanji: string,
): QuizWord[] => {
  const allWords = getAllWordsWithKanjiAndTags(
    words,
    kanji,
    session.sessionWordTags,
  );
  // log`All Words (w/ tags, ${session.sessionWordTags}): ${allWords}`;
  const wordsWPoints = allWords.map((w) => ({
    ...w,
    points: getWordPoints(session, w.word, w.kanji),
    dist: getDistanceFromLastWord(session, w.word),
  })); // calculate points and distance from last appearance for all words
  // log`Words w/ points: ${wordsWPoints}`;
  return wordsWPoints
    .filter((word) => {
      return (
        word.dist >=
        allWords.length - randomInt(2, Math.min(5, allWords.length - 3))
      );
    })
    .sort((a, b) => a.points - b.points || b.dist - a.dist);
};

export const getLastKanjiResult = (session: DrawSessionData, kanji: string) => {
  return [...session.sessionResults]
    .reverse()
    .find((r) => !r.notAnswered && r.kanji === kanji);
};

export const isKanjiCompleted = (
  session: DrawSessionData,
  kanji: string,
): boolean =>
  session.sessionResults.some((r) => r.kanji === kanji && r.completed);

export async function* nextWordGenerator(
  startingData: DrawSessionData,
  idb: AppDB,
): NextWordGenerator {
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
              void idb.put("draw", { ...currentSessionData, open: false });
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
    const dbWords: QuizWord[] = useAppStore.getState().words;

    const kanjiWithWords = currentSessionData.sessionKanjis.map((k) => {
      const words = getAllWordsElligibleForKanji(
        currentSessionData,
        dbWords,
        k,
      );
      log`${k}: ${words}`;
      const lastRes = getLastKanjiResult(currentSessionData, k);
      return {
        kanji: k,
        words: words.filter((f) => f.word !== lastRes?.word),
        completed: currentSessionData.sessionResults.some(
          (r) => r.kanji === k && r.completed,
        ),
        dist: Math.min(
          getDistanceFromLastKanji(currentSessionData, k),
          lastRes
            ? lastRes.result === 0
              ? 40
              : lastRes.result < 0
                ? 20
                : Infinity
            : Infinity,
        ),
        points:
          words
            .slice(0, 3)
            .reduce(
              (p, n) => p + getWordPoints(currentSessionData, n.word, n.kanji),
              0,
            ) / 3,
      };
    });

    const completed = kanjiWithWords.filter((k) => k.completed);
    const notCompleted = kanjiWithWords.filter((k) => !k.completed);
    const maxDIST = Math.max(
      ...kanjiWithWords
        .filter((k) => k.words.length > 0 && !k.completed)
        .map((k) => (k.dist === Infinity ? 0 : k.dist)),
    );
    const randomDISTBias = randomInt(2, Math.floor(maxDIST / 2));
    const minDIST =
      completed.length === kanjiWithWords.length ? 0 : maxDIST - randomDISTBias;

    const possibleKanji = kanjiWithWords
      .filter((z, _, a) => {
        // log`${z.kanji}: ${z.dist} > ${minDIST} && ${z.words.length} >= 1`;
        return completed.length === a.length
          ? true
          : (notCompleted.some((k) => k.kanji === z.kanji) ||
              (completed.some((k) => k.kanji === z.kanji) &&
                z.dist > 1.5 * a.length)) &&
              z.words.length >= 1 &&
              z.dist > minDIST;
      })
      .sort(
        (a, b) =>
          a.points -
          (a.dist === Infinity ? 0 : a.dist) -
          (b.points - (b.dist === Infinity ? 0 : b.dist)),
      ); // sorted by points acquired
    log`MaxDIST: ${maxDIST} ${kanjiWithWords.find((k) => k.dist === maxDIST)}`;

    log`Possible kanjis (rDB: ${randomDISTBias} mD: ${minDIST}): ${possibleKanji}`;

    if (!possibleKanji || possibleKanji.length === 0) {
      currentSessionData = yield getNoWordErr(
        "None of the selected kanjis have words in the wordbank!",
      );
      continue;
    }

    const randomKanjiIndex = randomStartWeighedInt(
      0,
      possibleKanji.length - 1,
      5,
    );
    const randomKanjiWithWords = possibleKanji[randomKanjiIndex];

    if (!randomKanjiWithWords) {
      yield getErr(
        "Error in the code!",
        <button onClick={() => Router.reload()}>Refresh the page</button>,
      );
      continue;
    }

    log`Chosen kanji: ${randomKanjiWithWords.kanji}`;
    // console.trace();

    if (randomKanjiWithWords.words.length === 0) {
      currentSessionData = yield getNoWordErr(
        `There are no words to show corresponding to the kanji: ${randomKanjiWithWords.kanji}`,
      );
      continue;
    }
    log`Words that can be chosen: ${randomKanjiWithWords.words}}`;

    const randomWordIndex = randomStartWeighedInt(
      0,
      randomKanjiWithWords.words.length - 1,
      20,
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
    log`Generating next word`;
  }
}
