type Props = { className?: string };

export function Vesica({ className }: Props) {
  return (
    <svg
      viewBox="0 0 80 48"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden="true"
      className={className}
    >
      <g transform="translate(40, 24)" fill="none" stroke="currentColor" strokeWidth="0.6">
        <circle cx="-10" cy="0" r="22" />
        <circle cx="10" cy="0" r="22" />
      </g>
      <circle cx="40" cy="24" r="2" fill="currentColor" />
    </svg>
  );
}
