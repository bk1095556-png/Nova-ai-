export function NovaLogo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="NOVA AI Logo"
      className="shrink-0"
    >
      <defs>
        <linearGradient id="novaGrad" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#06B6D4" />
          <stop offset="50%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <rect
        x="2"
        y="2"
        width="36"
        height="36"
        rx="11"
        fill="url(#novaGrad)"
        fillOpacity="0.14"
        stroke="url(#novaGrad)"
        strokeWidth="1.5"
      />
      <ellipse
        cx="20"
        cy="20"
        rx="12"
        ry="5.2"
        transform="rotate(-32 20 20)"
        stroke="url(#novaGrad)"
        strokeWidth="1.5"
        strokeOpacity="0.7"
      />
      <path
        d="M20 9.5L22.5 17.5L30.5 20L22.5 22.5L20 30.5L17.5 22.5L9.5 20L17.5 17.5L20 9.5Z"
        fill="url(#novaGrad)"
      />
    </svg>
  );
}
