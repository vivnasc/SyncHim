type Props = { className?: string };

export function SeparadorVerso({ className }: Props) {
  return (
    <svg
      viewBox="0 0 320 16"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden="true"
      className={className}
    >
      <g stroke="currentColor" strokeWidth="0.6" fill="none">
        <line x1="0" y1="8" x2="60" y2="8" />
        <line x1="260" y1="8" x2="320" y2="8" />
        <circle cx="160" cy="8" r="3.5" />
      </g>
      <g fill="currentColor">
        <circle cx="66" cy="8" r="2" />
        <circle cx="160" cy="8" r="1.2" />
        <circle cx="254" cy="8" r="2" />
      </g>
    </svg>
  );
}
