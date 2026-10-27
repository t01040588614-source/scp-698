type BrandMarkSvgProps = {
  size?: number;
  className?: string;
  gradId: string;
};

/** MarketLens 로고 마크 — 헤더·파비콘 공통 */
export default function BrandMarkSvg({ size = 32, className, gradId }: BrandMarkSvgProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="6" y1="4" x2="26" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6eb4ff" />
          <stop stopColor="#2563eb" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${gradId})`} />
      <path
        d="M4 12.5C4 8.91 6.91 6 10.5 6H21.5C25.09 6 28 8.91 28 12.5V19.5C28 23.09 25.09 26 21.5 26H10.5C6.91 26 4 23.09 4 19.5V12.5Z"
        fill="white"
        fillOpacity="0.1"
      />
      <rect x="9" y="19" width="2" height="5" rx="0.5" fill="white" fillOpacity="0.45" />
      <rect x="9" y="17.5" width="2" height="1.5" fill="white" fillOpacity="0.95" />
      <rect x="13.5" y="20" width="2" height="4" rx="0.5" fill="white" fillOpacity="0.45" />
      <rect x="13.5" y="18.5" width="2" height="1.5" fill="white" fillOpacity="0.95" />
      <rect x="18" y="18" width="2" height="6" rx="0.5" fill="white" fillOpacity="0.45" />
      <rect x="18" y="16.5" width="2" height="1.5" fill="white" fillOpacity="0.95" />
      <path
        d="M8 21.5L12.5 17.5L16.5 19L23.5 12"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="23.5" cy="12" r="2" fill="white" />
    </svg>
  );
}
