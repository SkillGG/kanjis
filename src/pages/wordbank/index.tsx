import { KanjiCard } from "@/components/draw/kanjiCard";
import {
  areWordsTheSame,
  fromRQW,
  getWordWithout,
  type QuizWord,
  type ReactQuizWord,
  toRQW,
} from "@/components/draw/quizWords";
import { es5With, log, noop } from "@/utils/utils";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import creatorCSS from "./creator.module.css";
import { LS_KEYS, useLocalStorage } from "@/components/localStorageProvider";

type MultiRQW = ReactQuizWord & { multiSpecial?: number[] };

const alphabet = `あいうえおかきくけこがぎぐげごさしすせそざじずぜぞたちつてとだぢづでどなにぬねのはひふへほばびぶべぼぱぴぷぺぽまみむめもやゆよらりるれろわをん`;

const compareReadings = (
  a: QuizWord,
  b: QuizWord,
  comp: (a: number, b: number) => number = (a, b) => a - b,
): number => {
  const aWord = a.word
    .split("")
    .map((k, i) => `${k}${a.readings[i]}`)
    .join("");
  const bWord = b.word
    .split("")
    .map((k, i) => `${k}${b.readings[i]}`)
    .join("");

  const firstA = aWord.split("").find((q) => alphabet.includes(q));
  const firstB = bWord.split("").find((q) => alphabet.includes(q));

  if (!firstB) return 1;
  if (!firstA) return -1;

  const ixA = alphabet.indexOf(firstA);
  const ixB = alphabet.indexOf(firstB);

  return comp(ixA, ixB);
};

import defaultWordBank from "./wordbank.json";
import { gt, inc } from "semver";
import Link from "next/link";
import { usePopup } from "@/components/usePopup";
import TagLabel from "@/components/draw/tagBadge";
import { type TagInfo, useKanjiStore } from "@/components/list/kanjiStore";
import { TagEditor } from "@/components/wordbank/tagEditor";

export default function KanjiCardCreator() {
  const LS = useLocalStorage();

  const { tagColors, setTagColors } = useKanjiStore((s) => ({
    tagColors: s.tagColors,
    setTagColors: s.setTagColors,
  }));

  const { setPopup, popup } = usePopup();

  const [words, setWords] = useState<ReactQuizWord[] | null>(null);

  const [meaning, setMeaning] = useState("");

  const [readings, setReadings] = useState<string[]>([]);

  const [wordVal, setWordVal] = useState<string>("");

  const [special, setSpecial] = useState<number[]>([]);

  const [copied, setCopied] = useState(false);

  const [sureIfAdd, setSureIfAdd] = useState(false);

  const [autoFilter, setAutoFilter] = useState(true);

  const [canUpdateBank, setCanUpdateBank] = useState(false);

  const [autoIMEChange, setAutoIMEChange] = useState(false);

  const allRef = useRef<HTMLButtonElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const mainInput = useRef<HTMLInputElement>(null);
  const meaningInput = useRef<HTMLInputElement>(null);

  const shownWords = useMemo(
    () =>
      [...(words ?? [])]
        ?.filter((q) => (autoFilter ? q.word.includes(wordVal) : true))
        ?.reduce<MultiRQW[]>((p, n) => {
          const prevInArr = p.find(
            (z) =>
              z.word === n.word &&
              z.readings.join("_") === n.readings.join("_"),
          );

          if (prevInArr) {
            const newMS = [
              ...(prevInArr.multiSpecial ?? [prevInArr.special]),
              n.special,
            ];
            return [
              ...p.filter(
                (x) =>
                  !(
                    x.readings.join(".") === prevInArr.readings.join(".") &&
                    x.word === prevInArr.word
                  ),
              ),
              {
                ...toRQW({ ...prevInArr }, {}, newMS),
                multiSpecial: newMS,
              },
            ];
          }
          return [...p, { ...n, multiSpecial: [n.special] }];
        }, [])
        .sort((a, b) => compareReadings(a, b)),
    [words, autoFilter, wordVal],
  );

  useEffect(() => {
    void (async () => {
      if (!LS?.idb) return;
      const object = await LS.idb.getAll("wordbank");

      if (!object) return;

      if (words !== null) return;

      setWords(() => object.map((k) => toRQW(k)));
    })();

    const wordver = LS.getString(LS_KEYS.wordbank_ver);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    if (!wordver || gt(defaultWordBank.version, wordver)) {
      setCanUpdateBank(true);
    }
  }, [LS, words]);

  useEffect(() => {
    const tColors = defaultWordBank.tags as Record<string, TagInfo>;

    if (!tagColors) {
      // first edit
      const lsColors =
        LS.getObject<Record<string, TagInfo>>(LS_KEYS.tag_colors) ?? {};
      setTagColors({ ...tColors, ...lsColors });
    } else {
      let restored = false;
      const mix = { ...tagColors };
      for (const [name, obj] of Object.entries(tColors)) {
        if (!(name in mix)) {
          restored = true;
          mix[name] = obj;
        }
      }
      if (restored) {
        setTagColors(mix);
      } else {
        LS.set(LS_KEYS.tag_colors, mix);
      }
    }
  }, [LS, setTagColors, tagColors]);

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

    window.removeEventListener("keydown", handlekeydown);
    window.addEventListener("keydown", handlekeydown);
    return () => {
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

  const updateBank = useCallback(async () => {
    if (!LS.idb) return;
    const words = defaultWordBank.words as QuizWord[];
    log`Updating wordbank!`;
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
    log`Update results: addedd: ${added} skipped: ${skipped}`;
    LS.set(LS_KEYS.wordbank_ver, defaultWordBank.version);
    setCanUpdateBank(false);
    setWords((await LS.idb.getAll("wordbank")).map((w) => toRQW(w)));
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

  const [openTagEditor, setOpenTagEditor] = useState(false);

  return (
    <>
      {popup}
      <Link
        className={
          "absolute block items-center justify-start p-2 text-left underline"
        }
        href={"/"}
      >
        Go back
      </Link>
      {tagColors && (
        <TagEditor
          close={() => setOpenTagEditor(false)}
          state={openTagEditor ? "open" : "closed"}
          setTags={(tC) => {
            LS.set(LS_KEYS.tag_colors, tC);
            setTagColors({ ...tC });
          }}
          tags={tagColors}
        />
      )}
      <div className="mx-auto w-fit max-w-[90vw] text-center sm:max-w-[70vw]">
        <div className="text-xl">Wordbank</div>
        <div className="text-[1.2rem]">
          A place to add all your words you want to use to learn with. Write a
          word into the main field, the green kanji will be made
          &quot;guessable&quot;.
        </div>
        <button onClick={() => setOpenTagEditor(true)}>Edit tags</button>
        <div>You can use enter to quickly focus next fields!</div>
        <label>
          Filter data on input
          <input
            type="checkbox"
            onChange={() => setAutoFilter((p) => !p)}
            checked={autoFilter}
          />
        </label>
        <br />
        <label>
          Auto Change IME in meaning field (doesn&apos;t work on mobile)
          <input
            type="checkbox"
            onChange={() => setAutoIMEChange((p) => !p)}
            checked={autoIMEChange}
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
                  if (e.code === "Enter" || e.keyCode === 13) {
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
                  imeMode: autoIMEChange ? "active" : "unset",
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
                if (e.code === "Enter" || e.keyCode === 13) {
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
              spellCheck={true}
              style={{
                imeMode: autoIMEChange ? "active" : "unset",
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
              spellCheck={true}
              type={autoIMEChange ? "tel" : "text"}
              className="w-full text-center outline-none sm:ml-2"
              value={meaning}
              onKeyDown={(e) => {
                if (e.code === "Enter" || e.keyCode === 13) {
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

                      if (words?.find((w) => areWordsTheSame(w, newW))) {
                        couldntAdd.push(newW);
                        continue;
                      }

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
                      words: words.map(
                        ({
                          blanked,
                          kanji,
                          meaning,
                          readings,
                          special,
                          word,
                        }) =>
                          ({
                            blanked,
                            kanji,
                            meaning,
                            readings,
                            special,
                            word,
                          }) as QuizWord,
                      ),
                    }),
                  );
                  setCopied(true);
                }
              }}
            >
              {copied ? <span className="text-green-500">DONE</span> : "COPY"}
            </button>
            <button
              className="ml-2 p-3"
              onClick={async () => {
                setPopup({
                  text: (close) => (
                    <div className="text-center">
                      Are yo usure you want to restore the wordbank to default
                      (v{defaultWordBank.version})?
                      <br />
                      <button
                        className="text-[red]"
                        onClick={async () => {
                          if (!LS.idb) return;
                          log`Restoring...`;
                          await LS.idb.clear("wordbank");
                          await LS.dbPutMultiple(
                            LS.idb,
                            "wordbank",
                            defaultWordBank.words,
                          );
                          setWords(() =>
                            defaultWordBank.words.map((w) => toRQW(w)),
                          );
                          close();
                        }}
                      >
                        YES
                      </button>
                      <button
                        onClick={() => {
                          close();
                        }}
                      >
                        NO
                      </button>
                    </div>
                  ),
                  time: "user",
                  borderColor: "red",
                });
              }}
            >
              RESTORE TO DEFAULT
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
        {shownWords?.map((q) => {
          const editTags = async (tags: string[]) => {
            if (!LS?.idb || !words) return;
            log`Changing tags for word ${q} from ${q.tags} to ${tags}`;
            await LS.idb.put("wordbank", { ...fromRQW(q), tags });
            setWords((prev) => {
              if (!prev) return prev;
              return es5With(
                prev,
                prev.findIndex((w) => areWordsTheSame(q, w)),
                { ...q, tags },
              );
            });
          };
          return (
            <div
              key={`kc_${q.word}_${q.special}_${q.readings.join("_")}`}
              className="relative w-fit flex-grow"
            >
              <button
                className="absolute right-2 top-1 border-none text-[red]"
                onClick={async () => {
                  if (!LS?.idb || !words) return;
                  const kanjiSpecs = q.multiSpecial ?? [q.special];
                  for (const spec of kanjiSpecs) {
                    log`Removing word ${{ ...q, special: spec }}`;
                    await LS.idb.delete("wordbank", [q.word, spec, q.readings]);
                    setWords((prev) => {
                      return (
                        prev?.filter(
                          (w) => !areWordsTheSame(w, { ...q, special: spec }),
                        ) ?? null
                      );
                    });
                  }
                }}
              >
                X
              </button>
              <KanjiCard
                key={`${q.word}_${q.special}_${q.readings.join("_")}_ans`}
                classNames={{
                  border: "w-full border-[blue] border-[1px]",
                  text: "text-xl",
                }}
                tagOverride={
                  <div className="flex flex-wrap gap-2">
                    {q.tags?.map((t) => {
                      return (
                        <div key={t}>
                          <TagLabel
                            tag={t}
                            color={tagColors?.[t]?.color}
                            bgColor={tagColors?.[t]?.bg}
                            border={tagColors?.[t]?.border}
                            onClick={() => {
                              void editTags(
                                q.tags?.filter((f) => f !== t) ?? [],
                              );
                            }}
                          />
                        </div>
                      );
                    })}
                    <div>
                      <TagLabel
                        tag={"Add tag"}
                        onClick={() => {
                          const newTag = prompt("Tag");
                          if (newTag) {
                            void editTags((q.tags ?? []).concat([newTag]));
                          }
                        }}
                      />
                    </div>
                  </div>
                }
                styles={{ text: { "--color": "lime" } }}
                commit={noop}
                word={q}
                disableButtons
                sideOverride="answer"
              />
            </div>
          );
        })}
      </div>
    </>
  );
}
