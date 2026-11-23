import { cn } from "@/lib/utils";

/**
 * 9px registration cross for the framed Home page plate (docs/DESIGN.md §4 & §5).
 * Positioned at the intersections of side rails and horizontal rules.
 */
export function CropMark({ className }: { className?: string }) {
  return (
    <svg
      width="9"
      height="9"
      viewBox="0 0 9 9"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("pointer-events-none select-none text-[var(--border-strong)]", className)}
      aria-hidden="true"
    >
      <line x1="4.5" y1="0" x2="4.5" y2="9" stroke="currentColor" strokeWidth="1" />
      <line x1="0" y1="4.5" x2="9" y2="4.5" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
