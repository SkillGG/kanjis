import React, { type CSSProperties } from "react";
import { twMerge } from "tailwind-merge";

export default React.forwardRef<
  HTMLButtonElement,
  {
    tag: string;
    bgColor?: CSSProperties["backgroundColor"];
    color?: CSSProperties["color"];
    border?: CSSProperties["borderColor"];
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    className?: string;
    onKeyDown?: React.KeyboardEventHandler<HTMLButtonElement>;
  }
>(function TagLabel(
  { tag, bgColor, color, border, onClick, onKeyDown, className },
  ref,
) {
  return (
    <button
      ref={ref}
      onKeyDown={onKeyDown}
      className={twMerge(className, `rounded-xl px-2 py-0 text-center`)}
      style={{ backgroundColor: bgColor, color, borderColor: border }}
      onClick={onClick}
    >
      {tag}
    </button>
  );
});
