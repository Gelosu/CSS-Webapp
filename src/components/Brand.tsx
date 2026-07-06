import Image from "next/image";

export function Brand({
  size = "sm",
  center = false,
}: {
  size?: "sm" | "lg";
  center?: boolean;
}) {
  const isLg = size === "lg";
  const px = isLg ? 56 : 40;

  return (
    <div
      className={`flex items-center gap-3 ${center ? "flex-col text-center" : ""}`}
    >
      <Image
        src="/jprshs-logo.png"
        alt="JPRSHS logo"
        width={px}
        height={px}
        className="shrink-0"
        priority
      />
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
