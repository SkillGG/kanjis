import { twMerge } from "tailwind-merge";

export function LoadingIcon({
  size,
  accent,
  className,
  spinner = "transparent",
  background = "transparent",
  width = 2,
}: {
  className?: string;
  size: number;
  accent: string;
  spinner?: string;
  width?: number;
  background?: string;
}) {
  return (
    <div
      className={twMerge(
        className,
        "h-[--size] w-[--size] animate-spin rounded-[50%] border-x-[--spinner] border-b-[--spinner] border-t-[--accent] bg-[--bg]",
      )}
      style={{
        "--size": size + "px",
        "--width": width + "px",
        "--spinner": spinner,
        "--accent": accent,
        "--bg": background,
        borderWidth: width + "px",
      }}
    ></div>
  );
}
