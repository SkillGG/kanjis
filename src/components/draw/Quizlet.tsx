import { useCallback, useEffect, useState } from "react";
import { type SessionResult, type DrawSessionData } from "./drawSession";
import {
  type NextWordGenerator,
  nextWordGenerator,
  generateQWReadings,
  type QuizWord,
  areWordsTheSame,
} from "./quizWords";
import { KanjiCard, type KanjiCardSide } from "./kanjiCard";
import { useAppStore } from "../../appStore";
import { log } from "@/utils/utils";

export const DEFAULT_POINTS_TO_COMPLETE = 10;

export const Quizlet = ({
  session,
  commitResult,
  onSideChanged,
  disableAnswering,
}: {
  session: DrawSessionData;
  commitResult: (result: SessionResult) => Promise<DrawSessionData>;
  onSideChanged?: (side: KanjiCardSide) => void;
  disableAnswering?: boolean;
}) => {
  const [wordGenerator, setWordGenerator] = useState<NextWordGenerator | null>(
    null,
  );
  const [currentWord, setCurrentWord] = useState<QuizWord | null>(null);

  const [error, setError] = useState<React.ReactNode | null>(null);

  const areWordsLoaded = useAppStore((s) => s.firstWordLoad);

  const loadNextWord = useCallback(
    async (sessionData: DrawSessionData) => {
      log`Asking for a new word`;
      if (!wordGenerator) return;
      const nextWord = (await wordGenerator.next(sessionData)).value;
      if ("err" in nextWord) {
        setError(nextWord.err);
      } else {
        if (currentWord) {
          if (areWordsTheSame(nextWord, currentWord)) {
            return void loadNextWord(sessionData);
          }
        }
        setCurrentWord(nextWord);
      }
    },
    [currentWord, wordGenerator],
  );

  const idb = useAppStore((s) => s.getIDB());

  useEffect(() => {
    // create a new WordGenerator
    void (async () => {
      if (!session) return;
      if (wordGenerator) return;
      if (!areWordsLoaded) return;
      const newWG = nextWordGenerator(session, idb);
      setWordGenerator(newWG);
      const firstWord = await newWG.next();
      if (firstWord.done) {
        setError(firstWord.value.err);
        return;
      }
      if ("err" in firstWord.value) {
        setError(firstWord.value.err);
      } else {
        setCurrentWord(firstWord.value);
      }
    })();
  }, [areWordsLoaded, idb, session, wordGenerator]);

  if (currentWord === null || !areWordsLoaded) {
    return <>{error ? error : "Loading..."}</>;
  }

  return (
    <>
      <KanjiCard
        onSideChanged={onSideChanged}
        classNames={{
          border: "text-base sm:text-xl min-w-[50%]",
          tags: "text-base gap-x-2",
          buttons: "text-base sm:text-3xl mb-2 sm:mt-2",
        }}
        disableButtons={disableAnswering}
        commit={async (result) => {
          const newSession = await commitResult(result);
          await loadNextWord(newSession);
        }}
        word={generateQWReadings(currentWord, {
          full: {
            meaning: {
              className: "text-xl sm:text-5xl sm:leading-[6rem] text-balance",
            },
            ruby: {
              className:
                "text-[5rem] sm:text-[8rem] sm:leading-[6rem] break-keep font-ksof",
            },
            kanji: {
              className: "font-ksof",
              style: { "--color": "#f3a" },
            },
          },
          hint: {
            meaning: {
              className: "text-xl sm:text-5xl sm:leading-[6rem] text-balance",
            },
            ruby: {
              className:
                "text-[5rem] sm:text-[8rem] sm:leading-[6rem] break-keep mb-2",
            },
            rt: {
              className: "mb-2",
            },
          },
        })}
      />
    </>
  );
};
