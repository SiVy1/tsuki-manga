"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  type AnchorHTMLAttributes,
  type ReactNode,
} from "react";

type PrefetchStrategy = "intent" | "visible";

type ReaderNextChapterLinkProps = {
  children: ReactNode;
  className: string;
  href: string;
  prefetchStrategy?: PrefetchStrategy;
} & Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "children" | "className" | "href"
>;

const prefetchedChapterHrefs = new Set<string>();

export function ReaderNextChapterLink({
  children,
  className,
  href,
  prefetchStrategy = "intent",
  onFocus,
  onMouseEnter,
  onTouchStart,
  ...props
}: ReaderNextChapterLinkProps) {
  const router = useRouter();
  const linkRef = useRef<HTMLAnchorElement | null>(null);

  function prefetchHref() {
    if (prefetchedChapterHrefs.has(href)) {
      return;
    }

    router.prefetch(href);
    prefetchedChapterHrefs.add(href);
  }

  useEffect(() => {
    if (
      prefetchStrategy !== "visible" ||
      typeof window === "undefined" ||
      typeof IntersectionObserver === "undefined" ||
      !linkRef.current
    ) {
      return;
    }

    function prefetchVisibleHref() {
      if (prefetchedChapterHrefs.has(href)) {
        return;
      }

      router.prefetch(href);
      prefetchedChapterHrefs.add(href);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          prefetchVisibleHref();
          observer.disconnect();
        }
      },
      {
        rootMargin: "160px 0px",
        threshold: 0.01,
      },
    );

    observer.observe(linkRef.current);

    return () => {
      observer.disconnect();
    };
  }, [href, prefetchStrategy, router]);

  return (
    <Link
      {...props}
      ref={linkRef}
      href={href}
      prefetch={false}
      className={className}
      onMouseEnter={(event) => {
        onMouseEnter?.(event);
        prefetchHref();
      }}
      onFocus={(event) => {
        onFocus?.(event);
        prefetchHref();
      }}
      onTouchStart={(event) => {
        onTouchStart?.(event);
        prefetchHref();
      }}
    >
      {children}
    </Link>
  );
}
