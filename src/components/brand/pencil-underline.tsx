/** Hand-drawn underline for the active nav item: a pencil stroke plus a faint second pass. */
export function PencilUnderline({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 6"
      preserveAspectRatio="none"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
    >
      <path d="M1 3.6 C20 2.4 45 3.2 62 2.6 C78 2.1 90 3 99 2.2" strokeWidth={2.2} vectorEffect="non-scaling-stroke" />
      <path
        d="M8 4.6 C30 4 60 4.4 92 3.6"
        strokeWidth={1}
        strokeOpacity={0.35}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
