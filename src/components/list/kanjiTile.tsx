import { type Kanji } from "./kanjiStore";
import kanjiCSS from "./list.module.css";
import { hoverColors, bgColors, borderColors, extraSignColor } from "./theme";

export const KanjiTile = ({
  kanji: kanjiData,
  badges,
  update,
  disabled,
  className,
  style,
}: {
  kanji: Kanji;
  className?: React.ComponentProps<"button">["className"];
  style?: React.ComponentProps<"button">["style"];
  badges: 0 | 1 | 2 | 3;
  disabled?: boolean;
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
      className={
        (className ?? "") + " " + kanjiCSS.kanjiBtn + ` p-[0.4rem] text-[2rem]`
      }
      data-disabled={disabled}
      style={{
        "--hoverColor": hoverColors[status],
        "--bgColor": bgColors[status],
        "--border": borderColors[status],
        "--extraSign": extraSignColor,
        ...style,
      }}
      data-extra={badges < 2 && type === "extra" ? "*" : undefined}
      data-lvl={badges % 2 == 0 ? (disabled ? "L" : lvl) : undefined}
      title={`${type} kanji lvl ${lvl}`}
    >
      {kanji}
    </button>
  );
};
