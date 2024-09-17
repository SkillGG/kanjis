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
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import kanjiCSS from "@/components/list/list.module.css";

import creatorCSS from "./creator.module.css";
import { LS_KEYS, useLocalStorage } from "@/components/localStorageProvider";

const POPUP_SHOW_TIME = 1000;

import defaultWordBank from "./wordbank.json";
import { gt, inc } from "semver";
import Link from "next/link";

export default function KanjiCardCreator() {
  const LS = useLocalStorage();

  const [words, setWords] = useState<ReactQuizWord[] | null>(null);

  const [meaning, setMeaning] = useState("");

  const [readings, setReadings] = useState<string[]>([]);

  const [wordVal, setWordVal] = useState<string>("");

  const [special, setSpecial] = useState<number[]>([]);

  const [copied, setCopied] = useState(false);

  const [sureIfAdd, setSureIfAdd] = useState(false);

  const [autoFilter, setAutoFilter] = useState(true);

  const allRef = useRef<HTMLButtonElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const mainInput = useRef<HTMLInputElement>(null);
  const meaningInput = useRef<HTMLInputElement>(null);

  const shownWords = useMemo(() => {
    return words
      ?.filter((q) => (autoFilter ? q.word.includes(wordVal) : true))
      .reverse();
  }, [autoFilter, wordVal, words]);

  const [canUpdateBank, setCanUpdateBank] = useState(false);

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

    const wordver = LS.getString(LS_KEYS.wordbank_ver);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    if (!wordver || gt(defaultWordBank.version, wordver)) {
      setCanUpdateBank(true);
    }
  }, [LS, words]);

  useEffect(() => {
    function handlekeydown(e: KeyboardEvent) {
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

  const [popup, setPopup] = useState<
    | {
        text: React.ReactNode;
        time?: number;
        borderColor?: string;
        color?: string;
      }
    | {
        text: (close: () => void) => React.ReactNode;
        time: "user";
        borderColor?: string;
        color?: string;
      }
    | null
  >(null);
  const [popupOpen, setPopupOpen] = useState(false);

  useEffect(() => {
    if (popup === null) return;
    setPopupOpen(true);
    if (popup.time !== "user") {
      const oT = setTimeout(() => {
        setPopupOpen(false);
      }, popup.time ?? POPUP_SHOW_TIME);
      return () => {
        clearTimeout(oT);
      };
    }
  }, [popup]);

  useEffect(() => {
    if (!popupOpen) {
      const cT = setTimeout(() => {
        setPopup(null);
      }, 200);
      return () => {
        clearTimeout(cT);
      };
    }
  }, [popupOpen]);

  const updateBank = useCallback(async () => {
    if (!LS.idb) return;
    const words = defaultWordBank.words as QuizWord[];
    console.log("Updating wordbank!");
    const skipped = [];
    const added = [];
    for (const word of words) {
      const numberof = await LS.idb.count("wordbank", [
        word.word,
        word.special,
        word.readings,
      ]);
      if (numberof >= 1) {
        skipped.push(word);
        continue;
      }
      await LS.idb.put("wordbank", word);
      added.push(word);
    }
    console.log("Update results: addedd:", added, "skipped: ", skipped);
    LS.set(LS_KEYS.wordbank_ver, defaultWordBank.version);
    setCanUpdateBank(false);
  }, [LS]);

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
      return [...q.filter((q) => q < wordVal.length), wordVal.length];
    });
  }, [wordVal]);

  return (
    <>
      {popup && (
        <div
          className={kanjiCSS.popup}
          style={{
            "--borderColor": popup.borderColor ?? "green",
            "--textColor": popup.color ?? "white",
          }}
          data-open={popupOpen ? "open" : "closed"}
        >
          <div>
            {typeof popup.text == "function"
              ? popup.text(() => setPopupOpen(false))
              : popup.text}
          </div>
        </div>
      )}
      <Link
        className={
          "absolute block items-center justify-start p-2 text-left underline"
        }
        href={"/"}
      >
        Go back
      </Link>
      <div className="mx-auto w-fit max-w-[90vw] text-center sm:max-w-[70vw]">
        <div className="text-xl">Wordbank</div>
        <div className="text-[1.2rem]">
          A place to add all your words you want to use to learn with. Write a
          word into the main field, the green kanji will be made
          &quot;guessable&quot;. Click ADD
        </div>
        <div>You can use enter to quickly focus next fields!</div>
        <label>
          Filter data on input
          <input
            type="checkbox"
            onChange={() => setAutoFilter((p) => !p)}
            checked={autoFilter}
          />
        </label>
        <div className="flex w-full max-w-[100%] flex-wrap sm:max-w-[100%]">
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
                onKeyDown={(e) => {
                  if (e.code === "Enter") {
                    const next =
                      e.currentTarget.parentElement?.nextElementSibling?.querySelector(
                        "input",
                      ) ?? meaningInput.current;
                    const prev =
                      e.currentTarget?.parentElement?.previousElementSibling?.querySelector(
                        "input",
                      ) ?? mainInput.current;

                    const toFocus = e.shiftKey ? prev : next;

                    if (e.nativeEvent.isComposing) {
                      e.currentTarget.blur();
                      setTimeout(() => toFocus?.focus(), 20);
                    } else {
                      e.currentTarget.blur();
                      toFocus?.focus();
                    }
                  }
                }}
                className="reading-input m-0 w-[8rem] justify-self-center border-none p-0 text-center text-[1.4rem] outline-none placeholder:text-center"
                style={{
                  backgroundColor: special.includes(i) ? "green" : "initial",
                  imeMode: "active",
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
        <div className="mx-auto mt-1 w-full">
          <div className="mb-1 grid w-full grid-rows-2 sm:grid-cols-2 sm:grid-rows-1">
            <input
              onKeyDown={(e) => {
                if (e.code === "Enter") {
                  const next =
                    document.querySelector<HTMLInputElement>(
                      ".reading-input",
                    ) ?? meaningInput.current;
                  if (e.nativeEvent.isComposing) {
                    e.currentTarget.blur();
                    setTimeout(() => next?.focus(), 20);
                  } else {
                    e.currentTarget.blur();
                    next?.focus();
                  }
                }
              }}
              ref={mainInput}
              style={{
                imeMode: "active",
              }}
              className="w-full text-center outline-none"
              value={wordVal}
              placeholder="単語"
              onChange={(e) => {
                setSureIfAdd(false);
                setWordVal(e.target.value);
              }}
            />
            <input
              ref={meaningInput}
              placeholder="意味"
              type="tel"
              className="w-full text-center outline-none sm:ml-2"
              value={meaning}
              onKeyDown={(e) => {
                if (e.code === "Enter") {
                  if (e.shiftKey) {
                    // go back
                    e.currentTarget.blur();
                    const prev =
                      document.querySelector<HTMLInputElement>(
                        "div:has(.reading-input):last-of-type > input",
                      ) ?? mainInput.current;
                    setTimeout(() => prev?.focus(), 20);
                    return;
                  }
                  addRef.current?.click();
                }
              }}
              onChange={(e) => {
                setSureIfAdd(false);
                setMeaning(e.target.value);
              }}
            />
          </div>
          <div>
            <button
              className="ml-2 p-3"
              ref={addRef}
              onClick={() => {
                if (!meaning && !sureIfAdd) {
                  return setSureIfAdd(true);
                }
                void (async () => {
                  const couldntAdd = [];
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

                      if (
                        words?.find(
                          (w) =>
                            w.word === wordVal &&
                            w.special === sp &&
                            w.readings.reduce(
                              (p, n, i) => (!p ? p : n === readings[i]),
                              true,
                            ),
                        )
                      ) {
                        couldntAdd.push(newW);
                        continue;
                      }

                      console.log("puttin in", newW);
                      setWords((p) =>
                        !p ? [toRQW(newW)] : [...p, toRQW(newW)],
                      );
                      await LS.idb?.put("wordbank", newW);
                      setSureIfAdd(false);
                    }
                  }
                  if (couldntAdd.length > 0) {
                    setPopup({
                      text: (
                        <div>
                          Could not create words for:
                          <div className="text-center">
                            {couldntAdd.map((p) => (
                              <div
                                className="mb-2 border-2 text-xl"
                                key={`${p.word},${p.special}`}
                              >
                                {toRQW(p).hint}
                              </div>
                            ))}
                          </div>
                        </div>
                      ),
                      borderColor: "red",
                      time: 2000,
                    });
                  }
                  setMeaning("");
                  setWordVal("");
                  mainInput.current?.focus();
                })();
              }}
            >
              {sureIfAdd ? (
                <b className="text-[red]">No meaning! Are you sure?</b>
              ) : (
                "ADD (alt + return)"
              )}
            </button>
            <button
              className="ml-2 p-3"
              onClick={() => {
                if (words) {
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                  const newVer = inc(defaultWordBank.version, "patch", true);
                  if (!newVer) return;
                  void navigator.clipboard.writeText(
                    JSON.stringify({
                      version: newVer,
                      words: words.map((q) => {
                        const {
                          blanked,
                          kanji,
                          meaning,
                          readings,
                          special,
                          word,
                        } = q;
                        return {
                          blanked,
                          kanji,
                          meaning,
                          readings,
                          special,
                          word,
                        } as QuizWord;
                      }),
                    }),
                  );
                  setCopied(true);
                }
              }}
            >
              {copied ? <span className="text-green-500">DONE</span> : "COPY"}
            </button>

            {canUpdateBank && (
              <button
                className="ml-2 p-3"
                onClick={() => {
                  void updateBank();
                }}
              >
                Update ({LS.getString(LS_KEYS.wordbank_ver) ?? "0.0.1"} =&gt;{" "}
                {defaultWordBank.version})
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="text-center text-xl">
        Kanjis currently in wordbank (
        {new Set(words?.map((w) => w.word) ?? []).size}):
      </div>
      <div className="mx-auto flex max-w-[90vw] flex-wrap justify-center gap-1">
        {shownWords?.map((q) => (
          <div
            key={`kc_${q.word}_${q.special}_${q.readings.join("_")}`}
            className="w-fit flex-grow"
            onContextMenu={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!LS?.idb || !words) return;

              console.log("Removing ", [q.word, q.special], "from the store!");
              await LS.idb.delete("wordbank", [q.word, q.special, q.readings]);
              setWords(() => {
                return (
                  words.filter(
                    (w) =>
                      `${q.kanji}_${q.special}_${q.readings.join("_")}` !==
                      `${w.kanji}_${w.special}_${w.readings.join("_")}`,
                  ) ?? null
                );
              });
            }}
          >
            <KanjiCard
              classNames={{
                border:
                  "w-full border-t-[blue] border-x-[blue] border-[1px] border-b-[yellow]",
                text: "text-xl",
              }}
              styles={{
                border: {
                  borderBottomStyle: "dotted",
                },
              }}
              key={`${q.word}_${q.special}_${q.readings.join("_")}_quiz`}
              commit={noop}
              word={q}
              disableButtons
              sideOverride="quiz"
            />
            <KanjiCard
              key={`${q.word}_${q.special}_${q.readings.join("_")}_ans`}
              classNames={{
                border:
                  "w-full border-b-[blue] border-x-[blue] border-[1px] border-t-[yellow]",
                text: "text-xl",
              }}
              styles={{
                border: {
                  borderTopStyle: "dotted",
                },
              }}
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
