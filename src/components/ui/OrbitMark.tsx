type OrbitMarkProps = {
  className?: string;
  showInitials?: boolean;
  initials?: string;
};

export function OrbitMark({
  className = "",
  showInitials = false,
  initials = "",
}: OrbitMarkProps) {
  return (
    <span className={`orbit-mark ${className}`.trim()} aria-hidden="true">
      <svg viewBox="0 0 48 48" fill="none">
        <ellipse
          cx="24"
          cy="24"
          rx="20"
          ry="7.2"
          transform="rotate(-22 24 24)"
          stroke="currentColor"
          strokeOpacity="0.55"
          strokeWidth="1"
        />
        <ellipse
          cx="24"
          cy="24"
          rx="14.5"
          ry="5"
          transform="rotate(28 24 24)"
          stroke="currentColor"
          strokeOpacity="0.22"
          strokeWidth="0.8"
        />
        <circle cx="24" cy="24" r="3" fill="currentColor" />
        <circle cx="40.5" cy="16.5" r="1.5" fill="#f2bd82" />
      </svg>
      {showInitials && initials ? (
        <span className="orbit-mark__initials">{initials}</span>
      ) : null}
    </span>
  );
}
