import { twMerge } from "tailwind-merge";

export function LoadingIcon({
  size,
  accent,
  className,
  spinner = "transparent",
  background = "transparent",
}: {
  className?: string;
  size: number;
  accent: string;
  spinner?: string;
  background?: string;
}) {
  return (
    <div
      className={twMerge(
        className,
        "h-[--size] w-[--size] animate-spin rounded-[50%] border-[2px] border-x-[--spinner] border-b-[--spinner] border-t-[--accent] bg-[--bg]",
      )}
      style={{
        "--size": size + "px",
        "--spinner": spinner,
        "--accent": accent,
        "--bg": background,
      }}
    ></div>
  );
}
