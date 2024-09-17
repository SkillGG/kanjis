import { useCallback, useEffect, useState } from "react";
import { type SessionResult, type DrawSessionData } from "./drawSession";
import { nextWordGenerator, toRQW, type QuizWord } from "./quizWords";
import { KanjiCard } from "./kanjiCard";
import { useLocalStorage } from "../localStorageProvider";

export const Quizlet = ({
  session,
  commitResult,
}: {
  session: DrawSessionData;
  commitResult: (result: SessionResult) => void;
}) => {
  const LS = useLocalStorage();

  const [wordGenerator] = useState(nextWordGenerator(session, LS));
  const [currentWord, setCurrentWord] = useState<QuizWord | null>(null);

  const nextWord = useCallback(async () => {
    const nextWord = (await wordGenerator.next(session)).value;
    setCurrentWord(() => {
      return nextWord;
    });
  }, [session, wordGenerator]);

  useEffect(() => {
    void (async () => {
      console.log("getting a new word!");
      const firstWord = await wordGenerator.next();
      console.log(firstWord);
      if (firstWord.done) {
        return;
      }
      setCurrentWord(firstWord.value);
    })();
  }, [wordGenerator]);

  if (currentWord === null) {
    return <>Loading the question</>;
  }

  return (
    <>
      <KanjiCard
        classNames={{ text: "text-4xl", border: "text-2xl" }}
        commit={commitResult}
        nextWord={nextWord}
        word={toRQW(currentWord)}
      />
    </>
  );
};
