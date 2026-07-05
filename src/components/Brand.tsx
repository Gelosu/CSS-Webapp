export function Brand({
  size = "sm",
  center = false,
}: {
  size?: "sm" | "lg";
  center?: boolean;
}) {
  const isLg = size === "lg";

  return (
    <div
      className={`flex items-center gap-3 ${center ? "flex-col text-center" : ""}`}
    >
      <div
        className={`flex shrink-0 items-center justify-center rounded-full border-2 border-accent bg-primary text-accent ${
          isLg ? "h-14 w-14" : "h-10 w-10"
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={isLg ? "h-7 w-7" : "h-5 w-5"}
        >
          <path d="M2 10 12 5l10 5-10 5-10-5Z" />
          <path d="M6 12.5V17c0 1.1 2.7 2 6 2s6-.9 6-2v-4.5" />
          <path d="M22 10v5" />
        </svg>
      </div>
      <div>
        <p
          className={`font-serif font-semibold leading-tight text-foreground ${
            isLg ? "text-xl" : "text-sm"
          }`}
        >
          Computer Systems Servicing
        </p>
        <p
          className={`font-medium uppercase tracking-widest text-muted ${
            isLg ? "mt-1 text-xs" : "text-[10px]"
          }`}
        >
          Admin Portal
        </p>
      </div>
    </div>
  );
}
