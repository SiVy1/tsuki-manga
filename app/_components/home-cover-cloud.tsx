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
  "left-[-2%] top-[3%] w-34 -rotate-[10deg] xl:w-40",
  "left-[8%] top-[48%] w-40 rotate-[6deg] xl:w-46",
  "left-[26%] top-[-6%] w-30 -rotate-[7deg] xl:w-36",
  "right-[19%] top-[-3%] w-42 rotate-[8deg] xl:w-48",
  "right-[-1%] top-[20%] w-32 -rotate-[9deg] xl:w-38",
  "right-[8%] top-[57%] w-38 rotate-[7deg] xl:w-44",
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
          className={`absolute ${cloudSlots[index]} transition-transform duration-700 ease-out`}
          style={{
            transform: `translate(${offset.x * ((index % 3) + 1) * 0.3}px, ${
              offset.y * ((index % 2) + 1) * 0.35
            }px)`,
            opacity: 0.34,
            filter: `blur(${index % 2 === 0 ? 12 : 18}px) saturate(0.88)`,
          }}
        >
          {cover.coverUrl ? (
            <Image
              src={cover.coverUrl}
              alt={cover.title}
              width={176}
              height={240}
              sizes="176px"
              className="aspect-[3/4] h-auto w-full rounded-[2.4rem] object-cover"
            />
          ) : (
            <div className="flex aspect-[3/4] items-center justify-center rounded-[2.4rem] bg-[var(--cover-fallback)] font-serif text-sm text-muted">
              {cover.title}
            </div>
          )}
        </article>
      ))}

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,transparent_28%,var(--surface)_68%,var(--surface)_100%)] opacity-95" />
    </div>
  );
}
