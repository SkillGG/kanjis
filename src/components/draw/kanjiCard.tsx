import { useCallback, useEffect, useRef, useState } from "react";
import { type ReactQuizWord } from "./quizWords";
import { type SessionResult } from "./drawSession";
import { strokeOrderFont } from "@/pages/_app";
import TagLabel from "./tagBadge";
import { twMerge } from "tailwind-merge";
import { useAppStore } from "../../appStore";

export type KanjiCardSide = "quiz" | "answer";

export const KanjiCard = ({
  word,
  commit,
  sideOverride,
  disableButtons,
  classNames = { border: "", text: "" },
  tagOverride,
  styles = { border: {}, text: {} },
  onSideChanged,
}: {
  word: ReactQuizWord;
  commit: (result: SessionResult) => Promise<void>;
  sideOverride?: KanjiCardSide;
  disableButtons?: boolean;
  points?: number;
  classNames?: {
    border?: React.HTMLAttributes<"div">["className"];
    text?: React.HTMLAttributes<"div">["className"];
    tags?: React.HTMLAttributes<"div">["className"];
    buttons?: React.HTMLAttributes<"div">["className"];
  };
  tagOverride?: React.ReactElement;
  styles?: {
    border?: React.HTMLAttributes<"div">["style"];
    text?: React.HTMLAttributes<"div">["style"];
    tags?: React.HTMLAttributes<"div">["style"];
    buttons?: React.HTMLAttributes<"div">["style"];
  };
  onSideChanged?: (side: KanjiCardSide) => void;
}) => {
  const [side, setSide] = useState<KanjiCardSide>("quiz");

  const tagColors = useAppStore((s) => s.tagColors);

  const flipRef = useRef<HTMLButtonElement>(null);
  const goodRef = useRef<HTMLButtonElement>(null);
  const okRef = useRef<HTMLButtonElement>(null);
  const badRef = useRef<HTMLButtonElement>(null);

  const handleKeydown = useCallback(
    (e: KeyboardEvent) => {
      if (e.code === "Space") {
        if (side === "quiz") flipRef.current?.click();
      }
      if (e.code === "Digit1" && side === "answer") goodRef.current?.click();
      if (e.code === "Digit2" && side === "answer") okRef.current?.click();
      if (e.code === "Digit3" && side === "answer") badRef.current?.click();
    },
    [side],
  );

  useEffect(() => {
    onSideChanged?.(side);
  }, [onSideChanged, side]);

  useEffect(() => {
    if (!disableButtons) {
      window.addEventListener("keydown", handleKeydown);
      return () => {
        window.removeEventListener("keydown", handleKeydown);
      };
    }
  }, [disableButtons, handleKeydown]);

  return (
    <div
      className={twMerge(
        `mx-auto flex w-fit flex-col justify-center border-2 p-4`,
        classNames.border,
      )}
      style={styles.border}
    >
      {(sideOverride ?? side) === "quiz" && (
        <>
          <div
            className={twMerge(`text-center`, classNames.text)}
            style={styles.text}
          >
            {word.hint}
          </div>
          {!disableButtons && (
            <button
              style={{ ...styles.buttons }}
              className={twMerge(
                classNames.buttons,
                "min-h-20 min-w-20 sm:min-h-10 sm:min-w-10",
              )}
              ref={flipRef}
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
            className={twMerge(`text-center text-2xl`, classNames.text)}
            style={{
              ...styles.text,
              fontFamily: strokeOrderFont.style.fontFamily,
            }}
          >
            {word.full}
          </div>
          {!disableButtons && (
            <div
              className={twMerge(
                `flex justify-center gap-2`,
                classNames.buttons,
              )}
              style={{ ...styles.buttons }}
            >
              <button
                ref={goodRef}
                onClick={async () => {
                  await commit({
                    kanji: word.kanji,
                    result: 10,
                    word: word.word,
                  });
                  setSide("quiz");
                }}
                className="min-h-20 min-w-20 border-green-500 px-4 hover:bg-green-950 hover:text-green-300 sm:min-h-10 sm:min-w-10"
              >
                Good
              </button>
              <button
                ref={okRef}
                onClick={async () => {
                  await commit({
                    kanji: word.kanji,
                    result: 0,
                    word: word.word,
                  });
                  setSide("quiz");
                }}
                className="min-h-20 min-w-20 border-orange-500 px-4 hover:bg-orange-950 hover:text-orange-300 sm:min-h-10 sm:min-w-10"
              >
                OK
              </button>
              <button
                ref={badRef}
                onClick={async () => {
                  await commit({
                    kanji: word.kanji,
                    result: -10,
                    word: word.word,
                  });
                  setSide("quiz");
                }}
                className="min-h-20 min-w-20 border-red-500 px-4 hover:bg-red-950 hover:text-red-300 sm:min-h-10 sm:min-w-10"
              >
                Bad
              </button>
            </div>
          )}
        </>
      )}
      {tagOverride ?? (
        <div
          className={twMerge(`flex`, classNames?.tags)}
          style={{ ...styles.text }}
        >
          {word.tags?.map((tag) => {
            return (
              <TagLabel
                key={tag}
                tag={tag}
                color={tagColors?.[tag]?.color}
                bgColor={tagColors?.[tag]?.bg}
                border={tagColors?.[tag]?.border}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
