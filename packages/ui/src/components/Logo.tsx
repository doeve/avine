

export const Logo = ({ className, size = 32 }: { className?: string; size?: number }) => {
  return (
    <svg
      width={size * 3}
      height={size}
      viewBox="0 0 120 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* A - Stylized */}
      <path
        d="M10 35 L20 5 L30 35"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary"
      />
      
      {/* v */}
      <path
        d="M35 15 L45 35 L55 15"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary"
      />

      {/* i */}
      <path
        d="M65 15 L65 35"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        className="text-primary"
      />
      <circle cx="65" cy="8" r="3" fill="currentColor" className="text-primary" />

      {/* n */}
      <path
        d="M75 35 V15 C75 15 80 10 85 15 V35"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary"
      />

      {/* e */}
      <path
        d="M110 28 C110 32 107 35 102.5 35 C98 35 95 31 95 25 C95 19 98 15 102.5 15 C107 15 110 18 110 24 H95"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary"
      />
    </svg>
  );
};
