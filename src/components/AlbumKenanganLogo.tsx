interface AlbumKenanganLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showText?: boolean;
}

export function AlbumKenanganLogo({
  size = 'md',
  className = '',
  showText = false,
}: AlbumKenanganLogoProps) {
  const sizeMap = {
    sm: { box: 'w-7 h-7', icon: 16 },
    md: { box: 'w-9 h-9', icon: 20 },
    lg: { box: 'w-12 h-12', icon: 28 },
  };

  const current = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`} id="album-kenangan-brand-logo">
      {/* Bespoke Album Kenangan Icon Badge */}
      <div
        className={`${current.box} rounded-xl bg-slate-900 text-amber-400 p-1.5 flex items-center justify-center shadow-xs border border-slate-800/80 relative shrink-0`}
      >
        {/* Bespoke Memory Book & Photo Frame SVG */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-full h-full"
        >
          {/* Back Book Cover */}
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
          {/* Spine Accent */}
          <path d="M6 2v20" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
          {/* Photo Frame inside the album */}
          <rect x="9" y="5" width="8" height="6.5" rx="1" fill="#f59e0b" fillOpacity="0.2" stroke="#f59e0b" strokeWidth="1.5" />
          {/* Mountain / Photo detail */}
          <path d="M9 10l2.5-2.5 4 4" stroke="#f59e0b" strokeWidth="1.2" />
          <circle cx="15" cy="7" r="0.75" fill="#f59e0b" stroke="none" />
          {/* Bookmark Ribbon */}
          <path d="M12 14v4l2-1.2 2 1.2v-4" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1" />
        </svg>

        {/* Small gold sparkle accent */}
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-400 rounded-full ring-2 ring-white" />
      </div>

      {showText && (
        <div className="flex flex-col">
          <span 
            className="text-base font-bold tracking-tight text-slate-900 leading-none"
            style={{ fontFamily: "'Dancing Script', cursive, serif" }}
          >
            album kenangan
          </span>
          <span className="text-[10px] font-medium text-slate-400 tracking-wider uppercase mt-0.5">
            Portal Koleksi Foto
          </span>
        </div>
      )}
    </div>
  );
}
