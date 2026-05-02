"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center space-y-6 text-center">
      <div className="space-y-2">
        <h2 className="font-serif text-2xl">Something went wrong</h2>
        <p className="max-w-md text-sm text-muted">
          {error.message || "An unexpected error occurred in the dashboard."}
        </p>
      </div>
      <button
        onClick={() => reset()}
        className="rounded-full bg-foreground px-6 py-2.5 text-sm font-medium text-background transition hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}
