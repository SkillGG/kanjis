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
    function handlekeydown(e: KeyboardEvent) {
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
        console.log("keyup event", nextToFocused, first);
        const focused = document.querySelector<HTMLInputElement>("input:focus");

        if (e.isComposing) {
          // fix chrome IME bugging out and firing this event twice if triggered while isComposing
          console.warn("Applied chrome being weird fix!");
          focused?.blur();
          setTimeout(() => (nextToFocused ?? first)?.focus(), 20);
        } else {
          focused?.blur();
          (nextToFocused ?? first)?.focus();
        }
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
    console.log("removing keyup");
    window.removeEventListener("keydown", handlekeydown);
    console.log("adding keydown");
    window.addEventListener("keydown", handlekeydown);
    return () => {
      console.log("removing keydown(eff)");
      window.removeEventListener("keydown", handlekeydown);
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
      <div className="mx-auto w-fit max-w-[50vw] text-center">
        <div className="text-xl">Wordbank</div>
        <div className="text-[1.2rem]">
          A place to add all your words you want to use to learn with. Write a
          word into the main field, select which kanjis do you want to make
          &quot;guessable&quot; and click ADD
        </div>
        <div>Double click reading / alt + num - toggle this kanji addition</div>
        <div>Alt + a - toggle every reading</div>
        <div>alt + q focus next reading field:</div>
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
            <>
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
                ALL (alt + w)
              </button>
            </>
          )}
        </div>
        <div className="mx-auto mt-1 w-fit">
          <input
            onKeyDown={(e) => {
              if (e.code === "Enter") {
                if (e.nativeEvent.isComposing) {
                  e.currentTarget.blur();
                  setTimeout(() => meaningInput.current?.focus(), 20);
                  meaningInput.current?.focus();
                } else {
                  e.currentTarget.blur();
                  meaningInput.current?.focus();
                }
              }
            }}
            ref={mainInput}
            className="w-[50%] text-center outline-none"
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
            ADD (alt + return)
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
      <div className="text-center text-xl">Kanjis currently in wordbank:</div>
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
