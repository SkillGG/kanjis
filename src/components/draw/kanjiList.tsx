import { useAppStore } from "@/appStore";
import React from "react";
import KanjiTile from "../list/kanjiTile";
import { type QuizWord } from "./quizWords";

export function KanjiSelector({
  search,
  selectedKanjis,
  selectedWords,
  setSelectedKanjis,
}: {
  selectedKanjis: string[];
  setSelectedKanjis: React.Dispatch<React.SetStateAction<string[]>>;
  search?: string;
  selectedWords: QuizWord[];
}) {
  const kanji = useAppStore((s) => s.kanji);
  const rowCount = useAppStore((s) => s.settings.kanjiRowCount);

  return (
    <>
      <div className="z-20 grid w-full justify-center justify-self-center overflow-auto pt-3">
        <div
          className="grid w-min gap-1"
          style={{
            gridTemplateColumns: "1fr ".repeat(rowCount ?? 8),
          }}
        >
          {kanji
            ?.filter((f) => (search ? search.includes(f.kanji) : true))
            .map((kanji) => {
              const on = selectedKanjis.includes(kanji.kanji);
              return (
                <KanjiTile
                  badges={0}
                  kanji={{
                    ...kanji,
                    status: on ? "completed" : "new",
                  }}
                  style={{
                    "--border": on ? "green" : "red",
                  }}
                  extraBadge={`${selectedWords.filter((f) => f.kanji === kanji.kanji).length}`}
                  className="w-min hover:z-10"
                  key={kanji.kanji}
                  update={() => {
                    if (
                      selectedWords.filter((w) => w.kanji === kanji.kanji)
                        .length > 0
                    )
                      setSelectedKanjis((prev) =>
                        prev.includes(kanji.kanji)
                          ? prev.filter((k) => k !== kanji.kanji)
                          : [...prev, kanji.kanji],
                      );
                  }}
                />
              );
            })}
        </div>
      </div>
    </>
  );
}
