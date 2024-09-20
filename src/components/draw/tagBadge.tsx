import { type CSSProperties } from "react";

export default function TagLabel({
  tag,
  bgColor,
  color,
  onClick,
}: {
  tag: string;
  bgColor?: CSSProperties["backgroundColor"];
  color?: CSSProperties["color"];
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}) {
  return (
    <button
      className="rounded-xl px-2 py-0 text-center"
      style={{ backgroundColor: bgColor, color }}
      onClick={onClick}
    >
      {tag}
    </button>
  );
}
