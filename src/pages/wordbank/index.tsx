import { KanjiCard } from "@/components/draw/kanjiCard";
import {
  getReadings,
  getReadingsWithout,
  getWordWithout,
  type QuizWord,
  type ReactQuizWord,
  toRQW,
} from "@/components/draw/quizWords";
import { noop } from "@/utils/utils";
import React, { useEffect, useRef, useState } from "react";

import creatorCSS from "./creator.module.css";
import { useLocalStorage } from "@/components/localStorageProvider";

export default function KanjiCardCreator() {
  const LS = useLocalStorage();

  const [words, setWords] = useState<ReactQuizWord[] | null>(null);

  const [meaning, setMeaning] = useState("");

  const [readings, setReadings] = useState<string[]>([]);

  const [wordVal, setWordVal] = useState<string>("");

  const [special, setSpecial] = useState<number[]>([]);

  const [copied, setCopied] = useState(false);

  const allRef = useRef<HTMLButtonElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const mainInput = useRef<HTMLInputElement>(null);
  const meaningInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void (async () => {
      if (!LS?.idb) return;
      const object = await LS.idb.getAll("wordbank");

      if (!object) return;

      if (words !== null) return;

      setWords(() =>
        object.map((k) => ({
          ...k,
          full: getReadings(k.word, k.meaning, k.readings),
          hint: getReadingsWithout(k.word, k.meaning, k.readings, k.special),
        })),
      );
    })();
  }, [LS, words]);

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (e.code === "KeyW" && e.altKey) {
        allRef.current?.click();
      }
      if (e.code === "KeyQ" && (e.ctrlKey || e.altKey)) {
        const nextToFocused = document.querySelector<HTMLInputElement>(
          "div:has(.reading-input:focus) + div > .reading-input",
        );
        const first = document.querySelector<HTMLInputElement>(
          ".reading-input:not(:focus)",
        );
        console.log(nextToFocused, first);
        (nextToFocused ?? first)?.focus();
      }
      if (e.code === "KeyA" && e.altKey) {
        mainInput.current?.focus();
      }
      if (e.code === "Enter" && (e.ctrlKey || e.altKey)) {
        addRef.current?.click();
      }
      const num = /Digit(\d)/.exec(e.code);
      if (num && e.altKey) {
        const special = parseInt(num[1] ?? "a");
        if (!isNaN(special)) {
          setSpecial((q) =>
            q.includes(special - 1)
              ? q.filter((p) => p !== special - 1)
              : [...new Set([...q, special - 1])],
          );
        }
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  }, []);

  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => {
        setCopied(false);
      }, 1000);
      return () => {
        clearTimeout(timeout);
      };
    }
  }, [copied]);

  useEffect(() => {
    setReadings((q) => {
      if (q.length < wordVal.length)
        return [
          ...q,
          ...[...Array<string>(wordVal.length - q.length)].map((_) => ""),
        ];
      return [...q.slice(0, wordVal.length)];
    });
    setSpecial((q) => {
      return q.filter((q) => q < wordVal.length);
    });
  }, [wordVal]);

  return (
    <>
      <div className="mx-auto w-fit">
        Word:
        <div className="flex max-w-[50vw] flex-wrap">
          {readings.map((a, i) => (
            <div
              key={`read_${i}`}
              className={creatorCSS.ruby + " relative"}
              style={{ "--kanji": `"${wordVal[i]}"` }}
            >
              <input
                placeholder={wordVal[i]}
                title={wordVal[i]}
                value={a}
                onChange={(e) => {
                  const val = e.target.value;
                  setReadings((p) => {
                    const v = [...p];
                    v[i] = val;
                    return v;
                  });
                }}
                onDoubleClick={() => {
                  setSpecial((p) =>
                    p.includes(i) ? p.filter((q) => q !== i) : [...p, i],
                  );
                }}
                className="reading-input m-0 w-[8rem] justify-self-center border-none p-0 text-center text-[1.4rem] outline-none placeholder:text-center"
                style={{
                  backgroundColor: special.includes(i) ? "green" : "initial",
                }}
              />
            </div>
          ))}
          {readings.length > 0 && (
            <button
              onClick={() => {
                if (new Set(special).size === readings.length) setSpecial([]);
                else
                  setSpecial(
                    [...Array<number>(readings.length)].map((_, i) => i),
                  );
              }}
              ref={allRef}
            >
              ALL
            </button>
          )}
        </div>
        <div className="mx-auto mt-1 w-fit">
          <input
            onKeyDown={(e) => {
              if (e.code === "Enter") {
                meaningInput.current?.focus();
              }
            }}
            ref={mainInput}
            className="w-[60%] text-center outline-none"
            value={wordVal}
            onChange={(e) => setWordVal(e.target.value)}
          />
          <input
            ref={meaningInput}
            placeholder="Meaning"
            className="ml-2 w-[20%] text-center outline-none"
            value={meaning}
            onChange={(e) => setMeaning(e.target.value)}
          />
          <button
            className="ml-2 p-3"
            ref={addRef}
            onClick={() => {
              void (async () => {
                for (const sp of special) {
                  const kanji = wordVal[sp];
                  if (kanji) {
                    const newW: QuizWord = {
                      kanji: kanji,
                      readings,
                      special: sp,
                      word: wordVal,
                      meaning,
                      blanked: getWordWithout(wordVal, sp),
                    };
                    console.log("puttin in", newW);
                    setWords((p) => (!p ? [toRQW(newW)] : [...p, toRQW(newW)]));
                    await LS.idb?.put("wordbank", newW);
                  }
                }
                setMeaning("");
                setWordVal("");
                mainInput.current?.focus();
              })();
            }}
          >
            ADD
          </button>
          <button
            className="ml-2 p-3"
            onClick={() => {
              if (words) {
                void navigator.clipboard.writeText(JSON.stringify(words));
                setCopied(true);
              }
            }}
          >
            {copied ? "DONE" : "COPY"}
          </button>
        </div>
      </div>
      <div className="mx-auto flex max-w-[90vw] flex-wrap justify-center gap-1">
        {words
          ?.filter((q) => q.word.includes(wordVal))
          ?.map((q, i) => (
            <div
              key={`kc_${q.word}_${q.special}`}
              className="w-fit flex-grow"
              onDoubleClick={() => {
                setWords(() => {
                  return words.filter((_, ix) => ix !== i);
                });
                console.log("Removing ", q.blanked, "from the store!");
                void LS.idb?.delete("wordbank", [q.word, q.special]);
              }}
            >
              <KanjiCard
                classNames={{ border: "w-full", text: "text-xl" }}
                key={`${q.word}_${q.special}_quiz`}
                commit={noop}
                word={q}
                disableButtons
                sideOverride="quiz"
              />
              <KanjiCard
                key={`${q.word}_${q.special}_ans`}
                classNames={{ border: "w-full", text: "text-xl" }}
                commit={noop}
                word={q}
                disableButtons
                sideOverride="answer"
              />
            </div>
          ))}
      </div>
    </>
  );
}
