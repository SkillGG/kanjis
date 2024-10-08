import React, { useState } from "react";

import TagLabel from "@/components/draw/tagBadge";
import { usePopup } from "../usePopup";
import { keyboradEventToNumber } from "@/pages/wordbank";
import { useAppStore } from "@/appStore";
import { type MultiQW } from "../draw/quizWords";
import { LoadingIcon } from "./loadingIcon";

export function AddTagButton({
  word,
  onAdded,
}: React.PropsWithoutRef<{
  word: MultiQW;
  onAdded: (t: string) => Promise<void>;
}>) {
  const tagColors = useAppStore((s) => s.tagColors);
  const { popup, setPopup } = usePopup();

  const [loading, setLoading] = useState(false);

  return (
    <>
      <div>
        {popup}
        <TagLabel
          tag={
            !loading ? (
              "Add tag"
            ) : (
              <LoadingIcon
                accent="green"
                size={12}
                spinner="white"
                className="m-1"
              />
            )
          }
          onClick={() => {
            setPopup({
              modal: true,
              modalStyle: {
                styles: { "--backdrop": "#fff6" },
              },
              onOpen(d) {
                d?.focus();
              },
              onCancel() {
                setLoading(false);
              },
              onKeyDown(e, d) {
                const num = keyboradEventToNumber(e);
                if (num === -1) return;
                const buttons = d?.querySelectorAll("button");
                if (!buttons) return;
                if (!tagColors) return;
                const btn = [...buttons].find(
                  (b) =>
                    Object.keys(tagColors).indexOf(b.innerText.trim()) ===
                    num - 1,
                );
                if (document.activeElement === btn) {
                  btn?.click();
                } else {
                  btn?.focus();
                }
              },
              text(close) {
                if (!tagColors) {
                  close(true);
                  setLoading(false);
                  return <></>;
                }
                return (
                  <>
                    <div className="text-xl">Choose a tag</div>
                    <div className="flex flex-col items-center gap-2">
                      {Object.entries(tagColors)
                        .filter(([t]) => !word.tags?.includes(t))
                        .map((tc) => (
                          <div key={tc[0]}>
                            <TagLabel
                              tag={tc[0]}
                              bgColor={tc[1].bg}
                              border={tc[1].border}
                              color={tc[1].color}
                              onClick={async () => {
                                setLoading(true);
                                close();
                                setTimeout(() => {
                                  void onAdded(tc[0]).then(() => {
                                    setLoading(false);
                                  });
                                }, 20);
                              }}
                            />
                          </div>
                        ))}
                    </div>
                  </>
                );
              },
              time: "user",
            });
          }}
        />
      </div>
    </>
  );
}
