"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";

type UploadPreview = {
  id: string;
  name: string;
  sizeLabel: string;
  previewUrl: string;
  file: File;
};

type SortMode = "reading-order" | "reverse-reading-order" | "selected";

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

function sortPreviews(previews: UploadPreview[], sortMode: SortMode) {
  if (sortMode === "selected") {
    return previews;
  }

  const sorted = [...previews].sort((left, right) =>
    left.name.localeCompare(right.name, undefined, {
      numeric: true,
      sensitivity: "base",
    }),
  );

  if (sortMode === "reverse-reading-order") {
    sorted.reverse();
  }

  return sorted;
}

export function ChapterUploadDropzone() {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previews, setPreviews] = useState<UploadPreview[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>("reading-order");

  useEffect(() => {
    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.previewUrl));
    };
  }, [previews]);

  function syncInputFiles(nextPreviews: UploadPreview[]) {
    if (!inputRef.current) {
      return;
    }

    const transfer = new DataTransfer();

    nextPreviews.forEach((preview) => {
      transfer.items.add(preview.file);
    });

    inputRef.current.files = transfer.files;
  }

  function syncFiles(files: FileList | null) {
    setPreviews((current) => {
      current.forEach((preview) => URL.revokeObjectURL(preview.previewUrl));

      const nextPreviews = Array.from(files ?? []).map((file, index) => ({
        id: `${file.name}-${file.size}-${index}`,
        name: file.name,
        sizeLabel: formatFileSize(file.size),
        previewUrl: URL.createObjectURL(file),
        file,
      }));

      const sortedPreviews = sortPreviews(nextPreviews, sortMode);
      syncInputFiles(sortedPreviews);

      return sortedPreviews;
    });
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    syncFiles(event.currentTarget.files);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);

    if (!inputRef.current || event.dataTransfer.files.length === 0) {
      return;
    }

    const transfer = new DataTransfer();

    Array.from(event.dataTransfer.files).forEach((file) => {
      transfer.items.add(file);
    });

    inputRef.current.files = transfer.files;
    syncFiles(transfer.files);
  }

  function handleSortModeChange(nextSortMode: SortMode) {
    setSortMode(nextSortMode);
    setPreviews((current) => {
      const nextPreviews = sortPreviews(current, nextSortMode);
      syncInputFiles(nextPreviews);
      return nextPreviews;
    });
  }

  return (
    <div className="space-y-4">
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => {
          setIsDragging(false);
        }}
        onDrop={handleDrop}
        className={`flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-[1.5rem] border border-dashed px-6 py-8 text-center transition ${
          isDragging
            ? "border-foreground/30 bg-[var(--surface-hover)]"
            : "border-border bg-background/70 hover:border-foreground/20 hover:bg-surface"
        }`}
      >
        <input
          ref={inputRef}
          id={inputId}
          name="files"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          onChange={handleFileChange}
          className="sr-only"
        />
        <span className="font-medium">Drop pages here</span>
        <span className="mt-2 text-sm text-muted">PNG, JPG, WebP</span>
        <span className="mt-1 text-xs uppercase tracking-[0.16em] text-muted">
          Up to 40 MB each
        </span>
      </label>

      {previews.length ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Selected files</p>
              <p className="text-xs uppercase tracking-[0.16em] text-muted">
                {previews.length} file{previews.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleSortModeChange("reading-order")}
                className={`rounded-full px-3 py-1.5 text-xs transition ${
                  sortMode === "reading-order"
                    ? "bg-[var(--surface-active)] text-foreground"
                    : "text-muted hover:bg-[var(--surface-hover)] hover:text-foreground"
                }`}
              >
                Reading order
              </button>
              <button
                type="button"
                onClick={() => handleSortModeChange("reverse-reading-order")}
                className={`rounded-full px-3 py-1.5 text-xs transition ${
                  sortMode === "reverse-reading-order"
                    ? "bg-[var(--surface-active)] text-foreground"
                    : "text-muted hover:bg-[var(--surface-hover)] hover:text-foreground"
                }`}
              >
                Reverse order
              </button>
              <button
                type="button"
                onClick={() => handleSortModeChange("selected")}
                className={`rounded-full px-3 py-1.5 text-xs transition ${
                  sortMode === "selected"
                    ? "bg-[var(--surface-active)] text-foreground"
                    : "text-muted hover:bg-[var(--surface-hover)] hover:text-foreground"
                }`}
              >
                Selection
              </button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {previews.map((preview, index) => (
              <article
                key={preview.id}
                className="rounded-[1.25rem] border border-border bg-background/70 p-3"
              >
                <div className="overflow-hidden rounded-[1rem] border border-border bg-surface">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview.previewUrl} alt="" className="aspect-[3/4] w-full object-cover" />
                </div>
                <div className="mt-3 space-y-1">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted">
                    Page {index + 1}
                  </p>
                  <p className="truncate text-sm font-medium">{preview.name}</p>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted">
                    {preview.sizeLabel}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
