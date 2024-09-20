import { type CSSProperties } from "react";

export default function TagLabel({
  tag,
  bgColor,
  color,
  border,
  onClick,
}: {
  tag: string;
  bgColor?: CSSProperties["backgroundColor"];
  color?: CSSProperties["color"];
  border?: CSSProperties["borderColor"];
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}) {
  return (
    <button
      className="rounded-xl px-2 py-0 text-center"
      style={{ backgroundColor: bgColor, color, borderColor: border }}
      onClick={onClick}
    >
      {tag}
    </button>
  );
}
