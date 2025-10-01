// components/Logo.tsx
import React from "react";

type Props = { className?: string; title?: string };

/**
 * Logo animado: nube + nodos conectados.
 * - Usa animaciones SVG (<animate>) para pulso y desplazamiento suave.
 * - No requiere dependencias externas.
 * - Ajusta tamaño con la prop `className` (ej. "w-14 h-14").
 */
export default function Logo({ className = "w-14 h-14", title = "NuboSocial" }: Props) {
  return (
    <span className={className} role="img" aria-label={title} title={title}>
      <svg
        viewBox="10 0 95 85"
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="gCloud" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="50%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>

          <filter id="softShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feOffset dy="1" result="offsetBlur" />
            <feMerge>
              <feMergeNode in="offsetBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* subtle floating group (cloud + nodes) */}
        <g filter="url(#softShadow)">
          {/* cloud body */}
          <g id="cloud" transform="translate(10,10)">
            <path
              d="M20 50
                 C12 50, 8 44, 10 38
                 C6 36, 6 30, 12 28
                 C14 22, 20 20, 26 22
                 C30 16, 38 14, 44 18
                 C50 10, 62 12, 66 20
                 C76 20, 82 28, 78 36
                 C86 38, 88 46, 82 52
                 Z"
              fill="url(#gCloud)"
            >
              {/* gentle vertical float */}
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0 0; 0 -2; 0 0"
                dur="3.6s"
                repeatCount="indefinite"
              />
            </path>
          </g>

          {/* connection lines (appear then fade) */}
          <g id="lines" stroke="rgba(255,255,255,0.55)" strokeWidth="1.2" strokeLinecap="round">
            <line x1="22" y1="36" x2="40" y2="24" opacity="0.9">
              <animate attributeName="opacity" values="0.6;0.9;0.6" dur="3s" repeatCount="indefinite" />
            </line>
            <line x1="56" y1="30" x2="72" y2="38" opacity="0.8">
              <animate attributeName="opacity" values="0.5;0.85;0.5" dur="3.2s" repeatCount="indefinite" />
            </line>
            <line x1="44" y1="52" x2="60" y2="44" opacity="0.7">
              <animate attributeName="opacity" values="0.4;0.75;0.4" dur="3.4s" repeatCount="indefinite" />
            </line>
          </g>

          {/* nodes (pulsing dots) */}
          <g id="nodes" fill="#fff" stroke="none">
            <circle cx="22" cy="36" r="3.4">
              <animate attributeName="r" values="2.8;4;2.8" dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;1;0.8" dur="2.4s" repeatCount="indefinite" />
            </circle>

            <circle cx="40" cy="24" r="2.6">
              <animate attributeName="r" values="2.2;3.4;2.2" dur="2.6s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.7;1;0.7" dur="2.6s" repeatCount="indefinite" />
            </circle>

            <circle cx="56" cy="30" r="3.2">
              <animate attributeName="r" values="2.6;4;2.6" dur="2.2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.75;1;0.75" dur="2.2s" repeatCount="indefinite" />
            </circle>

            <circle cx="72" cy="38" r="2.6">
              <animate attributeName="r" values="2.2;3.6;2.2" dur="2.8s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.6;1;0.6" dur="2.8s" repeatCount="indefinite" />
            </circle>

            <circle cx="60" cy="44" r="2.8">
              <animate attributeName="r" values="2.4;3.8;2.4" dur="3s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.6;1;0.6" dur="3s" repeatCount="indefinite" />
            </circle>
          </g>
        </g>

        {/* small accent sparkles */}
        <g fill="white" opacity="0.12">
          <circle cx="84" cy="14" r="2">
            <animate attributeName="opacity" values="0.08;0.24;0.08" dur="3.6s" repeatCount="indefinite" />
          </circle>
          <circle cx="10" cy="12" r="1.6">
            <animate attributeName="opacity" values="0.06;0.2;0.06" dur="4s" repeatCount="indefinite" />
          </circle>
        </g>
      </svg>

      <span className="sr-only">{title}</span>
    </span>
  );
}
