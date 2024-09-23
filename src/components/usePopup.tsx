import { type CSSProperties, useEffect, useRef, useState } from "react";

import popupCSS from "./popup.module.css";
import { twMerge } from "tailwind-merge";

const POPUP_SHOW_TIME = 2000;

type ClosePopupCallback = (
  close: (cancel?: boolean) => void,
) => React.ReactNode;

export const usePopup = () => {
  const [popup, setPopup] = useState<
    | ({
        borderColor?: string;
        color?: string;
        modal?: boolean;
        onCancel?: () => void;
        onKeyDown?: (
          k: React.KeyboardEvent<HTMLDivElement>,
          d?: HTMLDivElement,
        ) => void;
        onOpen?: (d?: HTMLDivElement) => void;
        contentStyle?: { className?: string; styles?: CSSProperties };
        modalStyle?: { className?: string; styles?: CSSProperties };
      } & (
        | {
            text: ClosePopupCallback | React.ReactNode;
            time?: number;
          }
        | {
            text: ClosePopupCallback;
            time: "user";
          }
      ))
    | null
  >(null);
  const [popupOpen, setPopupOpen] = useState(false);

  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (popup === null) return;
    const spO = setTimeout(() => {
      popup?.onOpen?.(divRef.current ?? undefined);
      setPopupOpen(true);
    }, 0);

    if (popup.time !== "user") {
      const oT = setTimeout(() => {
        setPopupOpen(false);
      }, popup.time ?? POPUP_SHOW_TIME);
      return () => {
        clearTimeout(oT);
        clearTimeout(spO);
      };
    }
    return () => {
      clearTimeout(spO);
    };
  }, [popup]);

  useEffect(() => {
    if (!popupOpen) {
      const cT = setTimeout(() => {
        popup?.onCancel?.();
        setPopup(null);
      }, 400);
      return () => {
        clearTimeout(cT);
      };
    }
  }, [popup, popupOpen]);

  return {
    setPopup,
    popup: (
      <>
        {popup && (
          <div
            tabIndex={popup.onKeyDown ? 0 : undefined}
            ref={divRef}
            onKeyDown={(e) =>
              popup?.onKeyDown?.(e, divRef.current ?? undefined)
            }
            className={twMerge(
              popupCSS.popup,
              popup.modal && popupCSS.popupModal,
              popup.modalStyle?.className,
            )}
            style={{
              "--borderColor": popup.borderColor ?? "green",
              "--textColor": popup.color ?? "white",
              ...popup.modalStyle?.styles,
            }}
            data-open={popupOpen ? "open" : "closed"}
            onClick={() => {
              popup.onCancel?.();
              setPopupOpen(false);
            }}
          >
            <div
              onClick={(e) => {
                e.stopPropagation();
              }}
              style={{ ...popup.contentStyle?.styles }}
              className={twMerge(
                "w-fit rounded-xl border-2 p-[1em]",
                popup.contentStyle?.className,
              )}
            >
              {typeof popup.text == "function"
                ? popup.text((cancel?: boolean) => {
                    setPopupOpen(false);
                    if (cancel) {
                      popup.onCancel?.();
                    }
                  })
                : popup.text}
            </div>
          </div>
        )}
      </>
    ),
  };
};
