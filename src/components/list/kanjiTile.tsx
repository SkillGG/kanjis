import { twMerge } from "tailwind-merge";
import { type Kanji } from "../../appStore";
import kanjiCSS from "./list.module.css";
import { hoverColors, bgColors, borderColors, extraSignColor } from "./theme";

export const KanjiTile = ({
  kanji: kanjiData,
  badges,
  update,
  disabled,
  className,
  style,
  extraBadge,
  lvlBadge,
  overrideTitle,
}: {
  kanji: Kanji;
  className?: React.ComponentProps<"button">["className"];
  style?: React.ComponentProps<"button">["style"];
  badges: 0 | 1 | 2 | 3;
  extraBadge?: string;
  lvlBadge?: string;
  disabled?: boolean;
  overrideTitle?: string;
  update: (kanji: string, data: Partial<Omit<Kanji, "kanji">>) => void;
}) => {
  const { kanji, lvl, status, type } = kanjiData;
  return (
    <button
      onClick={(e) => {
        (e.target as HTMLElement)?.blur();
        update(kanji, {
          status:
            status === "new"
              ? "learning"
              : status === "learning"
                ? "completed"
                : "new",
        });
      }}
      key={kanji}
      id={kanji}
      className={twMerge(
        kanjiCSS.kanjiBtn +
          ` p-[0.65rem] text-[2rem] before:text-[0.9rem] after:text-[1rem]` +
          " " +
          (className ?? ""),
      )}
      data-disabled={disabled}
      style={{
        "--hoverColor": hoverColors[status],
        "--bgColor": bgColors[status],
        "--border": borderColors[status],
        "--extraSign": extraSignColor,
        ...style,
      }}
      data-extra={
        badges < 2
          ? (extraBadge ?? (type === "extra" ? "*" : undefined))
          : undefined
      }
      data-lvl={
        badges % 2 == 0 ? (lvlBadge ?? (disabled ? "L" : lvl)) : undefined
      }
      title={overrideTitle ?? `${type} kanji lvl ${lvl}`}
    >
      {kanji}
    </button>
  );
};
