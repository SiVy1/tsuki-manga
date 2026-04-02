"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

type CoverItem = {
  id: string;
  title: string;
  coverUrl: string | null;
};

type HomeCoverCloudProps = {
  covers: CoverItem[];
};

const cloudSlots = [
  "left-[3.5%] top-[11%] w-20 -rotate-6 xl:w-24",
  "left-[14%] top-[58%] w-26 rotate-[3deg] xl:w-30",
  "left-[31%] top-[5%] w-22 -rotate-[2deg] xl:w-25",
  "right-[24.5%] top-[5%] w-28 rotate-[5deg] xl:w-31",
  "right-[9%] top-[27%] w-22 -rotate-[4deg] xl:w-25",
  "right-[15%] top-[66%] w-24 rotate-[4deg] xl:w-28",
] as const;

export function HomeCoverCloud({ covers }: HomeCoverCloudProps) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const frame = frameRef.current;

    if (!frame) {
      return;
    }

    function handleMouseMove(event: MouseEvent) {
      const currentFrame = frameRef.current;

      if (!currentFrame) {
        return;
      }

      const rect = currentFrame.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 14;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 10;
      setOffset({ x, y });
    }

    function resetOffset() {
      setOffset({ x: 0, y: 0 });
    }

    frame.addEventListener("mousemove", handleMouseMove);
    frame.addEventListener("mouseleave", resetOffset);

    return () => {
      frame.removeEventListener("mousemove", handleMouseMove);
      frame.removeEventListener("mouseleave", resetOffset);
    };
  }, []);

  if (!covers.length) {
    return null;
  }

  return (
    <div
      ref={frameRef}
      className="pointer-events-none absolute inset-0 hidden overflow-hidden lg:block"
      aria-hidden="true"
    >
      {covers.slice(0, cloudSlots.length).map((cover, index) => (
        <article
          key={cover.id}
          className={`absolute ${cloudSlots[index]} transition-transform duration-500 ease-out`}
          style={{
            transform: `translate(${offset.x * ((index % 3) + 1) * 0.3}px, ${
              offset.y * ((index % 2) + 1) * 0.35
            }px)`,
          }}
        >
          {cover.coverUrl ? (
            <Image
              src={cover.coverUrl}
              alt={cover.title}
              width={176}
              height={240}
              sizes="176px"
              className="aspect-[3/4] h-auto w-full rounded-[1.4rem] object-cover shadow-[0_10px_24px_rgba(24,22,20,0.08)]"
            />
          ) : (
            <div className="flex aspect-[3/4] items-center justify-center rounded-[1.4rem] bg-[var(--cover-fallback)] font-serif text-sm text-muted shadow-[var(--shadow-soft)]">
              {cover.title}
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
