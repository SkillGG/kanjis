import { useState } from "react";

export function OCDB({
  onClick,
  children,
  swappedChildren,
  ...props
}: Omit<React.ComponentProps<"button">, "onClick"> & {
  swappedChildren: React.ReactNode;
  onClick?: (
    e: React.MouseEvent<HTMLButtonElement>,
    finished: () => void,
  ) => void;
}) {
  const [clicked, setClicked] = useState(false);

  return (
    <button
      onClick={(e) => {
        setClicked(true);
        onClick?.(e, () => setClicked(false));
      }}
      {...props}
    >
      {!clicked ? children : swappedChildren}
    </button>
  );
}
