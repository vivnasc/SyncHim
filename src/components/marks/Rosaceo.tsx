type Props = { className?: string };

export function Rosaceo({ className }: Props) {
  return (
    <svg
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden="true"
      className={className}
    >
      <g transform="translate(20, 20)" fill="none" stroke="currentColor" strokeWidth="0.6">
        <line x1="0" y1="-16" x2="0" y2="16" />
        <line x1="-16" y1="0" x2="16" y2="0" />
        <line x1="-11.3" y1="-11.3" x2="11.3" y2="11.3" />
        <line x1="-11.3" y1="11.3" x2="11.3" y2="-11.3" />
        <circle cx="0" cy="0" r="11" />
        <circle cx="0" cy="0" r="7" />
      </g>
      <g transform="translate(20, 20)" fill="currentColor">
        <circle cx="0" cy="0" r="1.8" />
        <circle cx="0" cy="-11" r="1.4" />
        <circle cx="0" cy="11" r="1.4" />
        <circle cx="-11" cy="0" r="1.4" />
        <circle cx="11" cy="0" r="1.4" />
      </g>
    </svg>
  );
}
