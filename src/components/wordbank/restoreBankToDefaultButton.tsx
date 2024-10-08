import { usePopup } from "../usePopup";
import { type QuizWord } from "../draw/quizWords";
import { useAppStore } from "@/appStore";
import { useState } from "react";
import { LoadingIcon } from "./loadingIcon";

export function RestoreBankToDefault({
  defaultWordBank,
}: {
  defaultWordBank: { version: string; words: QuizWord[] };
}) {
  const { popup, setPopup } = usePopup();

  const setWords = useAppStore((s) => s.setWords);

  const [loading, setLoading] = useState(false);

  return (
    <>
      {popup}
      <button
        disabled={loading}
        onClick={async () => {
          setPopup({
            text: (close) => (
              <div className="text-center">
                Are you sure you want to restore the wordbank to default (v
                {defaultWordBank.version})?
                <br />
                <button
                  className="text-[red]"
                  onClick={async () => {
                    close();
                    setLoading(true);
                    setTimeout(() => {
                      void setWords(async () => defaultWordBank.words).then(
                        () => {
                          setLoading(false);
                        },
                      );
                    }, 20);
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
        {!loading ? (
          "RESTORE TO DEFAULT"
        ) : (
          <LoadingIcon accent="red" size={12} className="m-1" />
        )}
      </button>
    </>
  );
}
