import { useState } from "react";
import { type ReactQuizWord } from "./quizWords";
import { type SessionResult } from "./drawSession";
import { myFont } from "@/pages/_app";
import TagLabel from "./tagBadge";

export const KanjiCard = ({
  word,
  commit,
  sideOverride,
  disableButtons,
  classNames = { border: "", text: "" },
  tagOverride,
  styles = { border: {}, text: {} },
}: {
  word: ReactQuizWord;
  commit: (result: SessionResult) => void;
  sideOverride?: "quiz" | "answer";
  disableButtons?: boolean;
  points?: number;
  classNames?: {
    border?: React.HTMLAttributes<"div">["className"];
    text?: React.HTMLAttributes<"div">["className"];
  };
  tagOverride?: React.ReactElement;
  styles?: {
    border?: React.HTMLAttributes<"div">["style"];
    text?: React.HTMLAttributes<"div">["style"];
  };
}) => {
  const [side, setSide] = useState<"quiz" | "answer">("quiz");

  return (
    <div
      className={`${classNames.border ?? ""} mx-auto flex w-fit flex-col justify-center border-2 p-4`}
      style={styles.border}
    >
      {(sideOverride ?? side) === "quiz" && (
        <>
          <div
            className={`${classNames.text ?? ""} text-center`}
            style={styles.text}
          >
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
          <div
            className={`${classNames.text} text-center text-2xl`}
            style={{ ...styles.text, fontFamily: myFont.style.fontFamily }}
          >
            {word.full}
          </div>
          {!disableButtons && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => {
                  commit({ kanji: word.kanji, result: 10, word: word.word });
                  setSide("quiz");
                }}
                className="border-green-500 px-4 hover:bg-green-950 hover:text-green-300"
              >
                OK
              </button>
              <button
                onClick={() => {
                  commit({ kanji: word.kanji, result: 0, word: word.word });
                  setSide("quiz");
                }}
                className="border-orange-500 px-4 hover:bg-orange-950 hover:text-orange-300"
              >
                MEH
              </button>
              <button
                onClick={() => {
                  commit({ kanji: word.kanji, result: -10, word: word.word });
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
      {tagOverride ?? (
        <div className="flex">
          {word.tags?.map((tag) => {
            return <TagLabel key={tag} tag={tag} />;
          })}
        </div>
      )}
    </div>
  );
};
