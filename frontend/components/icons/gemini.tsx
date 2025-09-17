import * as React from "react";

export default function Gemini(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={24} height={24} fill="none" {...props}>
      <circle cx={12} cy={12} r={10} stroke="currentColor" strokeWidth={2} />
      <path d="M8 8h8M8 16h8" stroke="currentColor" strokeWidth={2} />
    </svg>
  );
}