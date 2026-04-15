type DashboardIconName =
  | "overview"
  | "series"
  | "chapters"
  | "comments"
  | "legal"
  | "settings"
  | "discord"
  | "users"
  | "trash"
  | "home";

type DashboardIconProps = {
  name: DashboardIconName;
  className?: string;
};

export function DashboardIcon({ name, className }: DashboardIconProps) {
  const classes = className ?? "h-4 w-4";

  switch (name) {
    case "overview":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={classes}>
          <path d="M4 5.5h7v5H4z" />
          <path d="M13 5.5h7v13h-7z" />
          <path d="M4 12.5h7v6H4z" />
        </svg>
      );
    case "series":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={classes}>
          <path d="M6 4.5h9a3 3 0 0 1 3 3v12H9a3 3 0 0 0-3 3z" />
          <path d="M6 4.5v15a3 3 0 0 1 3-3h9" />
          <path d="M10 8.5h5" />
          <path d="M10 12h5" />
        </svg>
      );
    case "chapters":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={classes}>
          <path d="M7 5h10" />
          <path d="M7 9.5h10" />
          <path d="M7 14h10" />
          <path d="M7 18.5h6" />
          <path d="M4.5 5h.01" />
          <path d="M4.5 9.5h.01" />
          <path d="M4.5 14h.01" />
          <path d="M4.5 18.5h.01" />
        </svg>
      );
    case "comments":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={classes}>
          <path d="M6 17.5 3.5 20V6.5A2.5 2.5 0 0 1 6 4h12A2.5 2.5 0 0 1 20.5 6.5v8A2.5 2.5 0 0 1 18 17H6z" />
          <path d="M8 9h8" />
          <path d="M8 12.5h5" />
        </svg>
      );
    case "legal":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={classes}>
          <path d="M12 4.5v15" />
          <path d="M6 7.5h12" />
          <path d="M8 7.5 5.5 12a2.5 2.5 0 0 0 5 0L8 7.5Z" />
          <path d="M16 7.5 13.5 12a2.5 2.5 0 0 0 5 0L16 7.5Z" />
          <path d="M7.5 19.5h9" />
        </svg>
      );
    case "settings":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={classes}>
          <path d="M10.5 4h3l.7 2.1a6.8 6.8 0 0 1 1.7.7L18 5.7l2.1 2.1-1.1 2.1c.3.6.5 1.1.7 1.7l2.1.7v3l-2.1.7a6.8 6.8 0 0 1-.7 1.7l1.1 2.1-2.1 2.1-2.1-1.1a6.8 6.8 0 0 1-1.7.7L13.5 22h-3l-.7-2.1a6.8 6.8 0 0 1-1.7-.7L6 20.3l-2.1-2.1L5 16.1a6.8 6.8 0 0 1-.7-1.7L2.2 13.7v-3l2.1-.7c.2-.6.4-1.1.7-1.7L3.9 6.2 6 4.1l2.1 1.1c.6-.3 1.1-.5 1.7-.7z" />
          <circle cx="12" cy="12" r="3.2" />
        </svg>
      );
    case "discord":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={classes}>
          <path d="M8.5 7.5a11 11 0 0 1 7 0" />
          <path d="M7 17c1.8 1.2 3.4 1.8 5 1.8s3.2-.6 5-1.8" />
          <path d="M8 7 6 10.5v5.5L8.8 18" />
          <path d="M16 7l2 3.5V16L15.2 18" />
          <circle cx="9.5" cy="12.5" r="1" fill="currentColor" stroke="none" />
          <circle cx="14.5" cy="12.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "users":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={classes}>
          <path d="M16 19.5v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1" />
          <circle cx="9.5" cy="8" r="3" />
          <path d="M20.5 19.5v-1a4 4 0 0 0-3-3.9" />
          <path d="M15.5 5.1a3 3 0 0 1 0 5.8" />
        </svg>
      );
    case "trash":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={classes}>
          <path d="M4 7h16" />
          <path d="M9 7V5.5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5.5V7" />
          <path d="M7 7l.7 11a2 2 0 0 0 2 1.9h4.6a2 2 0 0 0 2-1.9L17 7" />
          <path d="M10 11v5" />
          <path d="M14 11v5" />
        </svg>
      );
    case "home":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={classes}>
          <path d="M4 10.5 12 4l8 6.5" />
          <path d="M6.5 9.5V20h11V9.5" />
          <path d="M10 20v-5h4v5" />
        </svg>
      );
  }
}

export type { DashboardIconName };
