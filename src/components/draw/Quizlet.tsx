import { useCallback, useEffect, useState } from "react";
import { type SessionResult, type DrawSessionData } from "./drawSession";
import {
  type NextWordGenerator,
  nextWordGenerator,
  toRQW,
  type QuizWord,
} from "./quizWords";
import { KanjiCard, type KanjiCardSide } from "./kanjiCard";
import { useAppStore } from "../../appStore";

export const DEFAULT_POINTS_TO_COMPLETE = 100;

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

  const nextWord = useCallback(
    async (sessionData: DrawSessionData) => {
      if (!wordGenerator) return;
      const nextWord = (await wordGenerator.next(sessionData)).value;
      if ("err" in nextWord) {
        setError(nextWord.err);
      } else {
        setCurrentWord(nextWord);
      }
    },
    [wordGenerator],
  );

  const idb = useAppStore((s) => s.getIDB());

  useEffect(() => {
    void (async () => {
      if (!session) return;
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
  }, [idb, session]);

  if (currentWord === null) {
    return <>{error ? error : "Loading..."}</>;
  }

  return (
    <>
      <KanjiCard
        onSideChanged={onSideChanged}
        classNames={{
          border: "text-base sm:text-xl min-w-[50%]",
          tags: "text-base",
          buttons: "text-base sm:text-3xl mb-2 sm:mt-2",
        }}
        disableButtons={disableAnswering}
        commit={async (result) => {
          const newSession = await commitResult(result);
          await nextWord(newSession);
        }}
        word={toRQW(currentWord, {
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
