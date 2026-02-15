"use client";

import type { HTMLAttributes, MouseEvent } from "react";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import styles from "./SpotlightCard.module.css";

type SpotlightCardProps = HTMLAttributes<HTMLDivElement> & {
  spotlightColor?: string;
};

export default function SpotlightCard({
  children,
  className,
  spotlightColor = "rgba(209, 243, 102, 0.2)",
  onMouseMove,
  ...props
}: SpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const element = cardRef.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    element.style.setProperty("--mouse-x", `${x}px`);
    element.style.setProperty("--mouse-y", `${y}px`);
    element.style.setProperty("--spotlight-color", spotlightColor);

    if (onMouseMove) {
      onMouseMove(event);
    }
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className={cn(styles.card, className)}
      {...props}
    >
      {children}
    </div>
  );
}
