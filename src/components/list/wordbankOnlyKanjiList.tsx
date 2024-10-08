import { type Kanji, useAppStore } from "@/appStore";
import { useMemo } from "react";
import { usePopup } from "../usePopup";
import { noop } from "@/utils/utils";
import { type QuizWord } from "../draw/quizWords";

import listCSS from "./list.module.css";
import { twMerge } from "tailwind-merge";
import KanjiTile from "./kanjiTile";

export default function WordbankOnlyKanjiList({
  listKanji,
  bankFilter = () => true,
  className,
}: {
  listKanji: Kanji[];
  bankFilter?: (w: QuizWord) => boolean;
  className?: string;
}) {
  const words = useAppStore((s) => s.words);

  const foreignKanji = useMemo(() => {
    const fK: QuizWord[] = [];
    for (const word of words.filter(bankFilter)) {
      if (!listKanji.some((k) => word.kanji === k.kanji)) {
        if (!fK.some((k) => k.kanji === word.kanji)) {
          fK.push(word);
        }
      }
    }
    return [...fK];
  }, [bankFilter, listKanji, words]);

  const { popup, setPopup } = usePopup();

  return (
    <div
      className={twMerge(className, `${listCSS["setting-menu"]} self-center`)}
    >
      {popup}
      {foreignKanji.length > 0 && (
        <KanjiTile
          badges={3}
          kanji={{
            index: 0,
            kanji: "？",
            lvl: 0,
            status: "new",
            type: "extra",
          }}
          disabled
          update={() => {
            setPopup({
              modal: true,
              text: (close) => (
                <div className="max-h-[80vh] overflow-scroll text-center">
                  <div className="text-xl">
                    Kanjis are in the wordbank, but are not in this list
                  </div>
                  <div className="flex flex-row flex-wrap justify-center gap-1">
                    {foreignKanji.map((k) => (
                      <KanjiTile
                        key={k.kanji}
                        badges={0}
                        className="w-fit max-w-fit"
                        lvlBadge="?"
                        overrideTitle={`From: ${k.word}`}
                        kanji={{
                          index: 0,
                          kanji: k.kanji,
                          lvl: 0,
                          status: "new",
                          type: "extra",
                        }}
                        update={noop}
                      />
                    ))}
                  </div>
                  <button onClick={() => close()}>CLOSE</button>
                </div>
              ),
              time: "user",
            });
          }}
        />
      )}
    </div>
  );
}
