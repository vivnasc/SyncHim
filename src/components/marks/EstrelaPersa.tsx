type Props = {
  className?: string;
  title?: string;
  strokeWidth?: number;
};

export function EstrelaPersa({ className, title = 'SyncHim', strokeWidth = 0.6 }: Props) {
  return (
    <svg
      viewBox="0 0 60 60"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
      className={className}
    >
      <g transform="translate(30, 30)">
        <polygon
          points="0,-26 6,-9 23,-13 13,1 25,11 9,11 0,26 -6,9 -23,13 -13,-1 -25,-11 -9,-11"
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
        />
        <circle cx="0" cy="0" r="8" fill="none" stroke="currentColor" strokeWidth={strokeWidth} />
        <circle cx="0" cy="0" r="3" fill="currentColor" />
      </g>
    </svg>
  );
}
