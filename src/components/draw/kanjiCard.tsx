import { useEffect, useState } from "react";
import { QuizWord, ReactQuizWord } from "./quizWords";
import { SessionResult } from "./drawSession";

export const KanjiCard = ({
  word,
  nextWord,
  commit,
  sideOverride,
  disableButtons,
  classNames = { border: "", text: "" },
}: {
  word: ReactQuizWord;
  nextWord: () => void;
  commit: (result: SessionResult) => void;
  sideOverride?: "quiz" | "answer";
  disableButtons?: boolean;
  classNames?: {
    border?: React.HTMLAttributes<"div">["className"];
    text?: React.HTMLAttributes<"div">["className"];
  };
}) => {
  const [side, setSide] = useState<"quiz" | "answer">("quiz");

  return (
    <div
      className={`${classNames.border ?? ""} mx-auto flex w-fit flex-col justify-center border-2 p-4`}
    >
      {(sideOverride ?? side) === "quiz" && (
        <>
          <div className={`${classNames.text ?? ""} text-center`}>
            {word.hint}
          </div>
          {!disableButtons && (
            <button
              onClick={() => {
                setSide("answer");
              }}
            >
              FLIP
            </button>
          )}
        </>
      )}
      {(sideOverride ?? side) === "answer" && (
        <>
          <div className={`${classNames.text} text-center text-2xl`}>
            {word.full}
          </div>
          {!disableButtons && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => {
                  commit({ kanji: word.kanji, result: 30 });
                  nextWord();
                  setSide("quiz");
                }}
                className="border-green-500 px-4 hover:bg-green-950 hover:text-green-300"
              >
                OK
              </button>
              <button
                onClick={() => {
                  commit({ kanji: word.kanji, result: 20 });
                  nextWord();
                  setSide("quiz");
                }}
                className="border-orange-500 px-4 hover:bg-orange-950 hover:text-orange-300"
              >
                MEH
              </button>
              <button
                onClick={() => {
                  commit({ kanji: word.kanji, result: 10 });
                  nextWord();
                  setSide("quiz");
                }}
                className="border-red-500 px-4 hover:bg-red-950 hover:text-red-300"
              >
                BAD
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
