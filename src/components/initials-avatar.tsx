function initials(name?: string | null) {
  if (!name) return "?";
  const parts = name.replace(/^Dr\.?\s+/i, "").trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase() || "?";
}

const SIZES = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-10 w-10 text-xs",
  lg: "h-12 w-12 text-sm",
  xl: "h-20 w-20 text-lg",
} as const;

export function InitialsAvatar({
  name,
  size = "md",
  className = "",
  src,
}: {
  name?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
  src?: string | null;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={name ?? "User"}
        className={`shrink-0 rounded-full object-cover ring-1 ring-primary/30 ${SIZES[size]} ${className}`}
      />
    );
  }
  return (
    <div
      aria-label={name ?? "User"}
      className={`grid shrink-0 place-items-center rounded-full bg-primary/15 font-semibold text-primary ring-1 ring-primary/30 ${SIZES[size]} ${className}`}
    >
      {initials(name)}
    </div>
  );
}