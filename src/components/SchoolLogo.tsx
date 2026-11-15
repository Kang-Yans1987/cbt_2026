import React, { useState } from 'react';

interface SchoolLogoProps {
  logoUrl?: string;
  schoolName?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const SchoolLogo: React.FC<SchoolLogoProps> = ({
  logoUrl,
  schoolName = 'DutawangiCBT',
  size = 'md',
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  const sizeClass =
    size === 'sm'
      ? 'h-7 w-7'
      : size === 'lg'
      ? 'h-12 w-12'
      : 'h-9 w-9';

  if (logoUrl && !imgFailed) {
    return (
      <img
        src={logoUrl}
        alt={`Logo ${schoolName}`}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        className={`${sizeClass} shrink-0 rounded-lg border border-slate-200 bg-white object-contain p-0.5`}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 40 40"
      className={`${sizeClass} shrink-0`}
      aria-hidden="true"
    >
      <rect width="40" height="40" rx="9" fill="#1D4ED8" />
      <rect x="9" y="8" width="22" height="24" rx="3" fill="#FFFFFF" />
      <rect x="12.5" y="13" width="11" height="2" rx="1" fill="#1E293B" />
      <rect x="12.5" y="17.5" width="15" height="1.5" rx="0.75" fill="#94A3B8" />
      <rect x="12.5" y="21" width="13" height="1.5" rx="0.75" fill="#94A3B8" />
      <circle cx="27" cy="27" r="6" fill="#059669" />
      <path
        d="M24.5 27L26.2 28.7L29.6 25.3"
        stroke="#FFFFFF"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
};
