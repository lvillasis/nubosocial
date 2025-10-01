import React from "react";

type Props = {
  className?: string;
  title?: string;
  variant?: "horizontal" | "stacked";
  hideText?: boolean;
};

export default function Logo({
  className = "w-14 h-14",
  title = "NuboSocial",
  variant = "horizontal",
  hideText = false,
}: Props) {
  const isHorizontal = variant === "horizontal";

  return (
    <div
      className={`flex ${isHorizontal ? "flex-row items-center gap-3" : "flex-col items-center gap-2"} group transform transition-transform duration-300 hover:scale-105`}
      role="img"
      aria-label={title}
      title={title}
    >
      {/* Icon container: redondeado (rounded-full) para badge */}
      <div
        className={`rounded-full overflow-visible flex items-center justify-center ${className} bg-transparent`}
        aria-hidden
      >
        <svg viewBox="0 0 90 75" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="gCloudLogo" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#C4B5FD" />
              <stop offset="45%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#06B6D4" />
            </linearGradient>

            <filter id="softShadowLogo" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feOffset dy="2" result="offsetBlur" />
              <feMerge>
                <feMergeNode in="offsetBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* shadow + cloud */}
          <g filter="url(#softShadowLogo)">
            <path
              d="M20 50 C12 50, 8 44, 10 38 C6 36, 6 30, 12 28 C14 22, 20 20, 26 22 C30 16, 38 14, 44 18 C50 10, 62 12, 66 20 C76 20, 82 28, 78 36 C86 38, 88 46, 82 52 Z"
              fill="url(#gCloudLogo)"
            >
              <animateTransform attributeName="transform" type="translate" values="0 0; 0 -1.4; 0 0" dur="3.6s" repeatCount="indefinite" />
            </path>

            <g stroke="rgba(255,255,255,0.85)" strokeWidth="1.1" strokeLinecap="round">
              <line x1="22" y1="36" x2="40" y2="24" opacity="0.95">
                <animate attributeName="opacity" values="0.45;0.95;0.45" dur="3s" repeatCount="indefinite" />
              </line>
              <line x1="56" y1="30" x2="72" y2="38" opacity="0.9">
                <animate attributeName="opacity" values="0.4;0.9;0.4" dur="3.2s" repeatCount="indefinite" />
              </line>
            </g>

            <g fill="#fff">
              <circle cx="22" cy="36" r="3.6" />
              <circle cx="40" cy="24" r="2.8" />
              <circle cx="56" cy="30" r="3.4" />
            </g>
          </g>

          {/* small sparkles */}
          <g fill="white" opacity="0.18">
            <circle cx="84" cy="14" r="2" />
            <circle cx="10" cy="12" r="1.6" />
          </g>
        </svg>
      </div>

      {!hideText && (
        <div className={`${isHorizontal ? "text-left" : "text-center"}`}>
          <div className="text-lg sm:text-xl font-extrabold text-white drop-shadow-md leading-tight">
            NuboSocial
          </div>
          <div className="text-xs sm:text-sm text-white/80 -mt-0.5">Conecta. Comparte. Crece.</div>
        </div>
      )}
    </div>
  );
}
