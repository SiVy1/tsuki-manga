"use client";

import { useEffect, useState } from "react";

import { SubmitButton } from "@/app/_components/submit-button";

type ChapterPageBatchToolbarProps = {
  formId: string;
  removePagesFormAction: (formData: FormData) => void | Promise<void>;
};

function getSelectionInputs(formId: string) {
  const escapedFormId =
    typeof CSS !== "undefined" && typeof CSS.escape === "function"
      ? CSS.escape(formId)
      : formId.replace(/([ #;?%&,.+*~':"!^$[\]()=>|/@])/g, "\\$1");

  return Array.from(
    document.querySelectorAll<HTMLInputElement>(
      `input[type="checkbox"][name="pageIds"][form="${escapedFormId}"]`,
    ),
  );
}

export function ChapterPageBatchToolbar({
  formId,
  removePagesFormAction,
}: ChapterPageBatchToolbarProps) {
  const [selectedCount, setSelectedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    function updateSelectedCount() {
      const inputs = getSelectionInputs(formId);
      const nextCount = inputs.filter((input) => input.checked).length;
      setSelectedCount(nextCount);
      setTotalCount(inputs.length);
    }

    updateSelectedCount();

    const inputs = getSelectionInputs(formId);
    for (const input of inputs) {
      input.addEventListener("change", updateSelectedCount);
    }

    return () => {
      for (const input of inputs) {
        input.removeEventListener("change", updateSelectedCount);
      }
    };
  }, [formId]);

  function clearSelection() {
    for (const input of getSelectionInputs(formId)) {
      input.checked = false;
    }

    setSelectedCount(0);
  }

  function selectAll() {
    const inputs = getSelectionInputs(formId);

    for (const input of inputs) {
      input.checked = true;
    }

    setSelectedCount(inputs.length);
    setTotalCount(inputs.length);
  }

  return (
    <form
      id={formId}
      action={removePagesFormAction}
      className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4"
    >
      <p className="text-sm text-muted" aria-live="polite">
        {selectedCount ? `${selectedCount} selected` : "Select pages to remove them together."}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={selectAll}
          disabled={!totalCount || selectedCount === totalCount}
          className="rounded-full border border-border px-4 py-2 text-sm text-muted transition hover:border-foreground/20 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          Select all
        </button>
        <button
          type="button"
          onClick={clearSelection}
          disabled={!selectedCount}
          className="rounded-full border border-border px-4 py-2 text-sm text-muted transition hover:border-foreground/20 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          Clear
        </button>
        <SubmitButton
          pendingLabel="Removing..."
          disabled={!selectedCount}
          className="danger-outline rounded-full px-4 py-2.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          Remove selected
        </SubmitButton>
      </div>
    </form>
  );
}
