import React from 'react';
import { RefreshCw, SearchX } from 'lucide-react';

interface EmptyStateIllustrationProps {
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
  badge?: string;
}

export const EmptyStateIllustration: React.FC<EmptyStateIllustrationProps> = ({
  title = 'Không tìm thấy tài liệu nào',
  description = 'Thử điều chỉnh từ khóa tìm kiếm hoặc bỏ chọn các bộ lọc hiện tại để xem nhiều kết quả hơn.',
  actionText,
  onAction,
  className = '',
  badge = 'Không có kết quả'
}) => {
  return (
    <div className={`p-8 sm:p-12 text-center rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col items-center justify-center max-w-xl mx-auto my-4 transition-all ${className}`}>
      {/* Friendly Minimalist Vector Illustration */}
      <div className="relative w-40 h-36 mb-5 select-none">
        <svg
          viewBox="0 0 200 180"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-xs"
        >
          {/* Subtle Ambient Glow */}
          <ellipse cx="100" cy="145" rx="75" ry="14" className="fill-slate-200/60 dark:fill-slate-800/40" />

          {/* Background Document / Folder */}
          <rect
            x="38"
            y="45"
            width="82"
            height="100"
            rx="12"
            transform="rotate(-8 38 45)"
            className="fill-slate-100 dark:fill-slate-800/60 stroke-slate-300 dark:stroke-slate-700"
            strokeWidth="2"
          />
          <line x1="52" y1="72" x2="100" y2="65" className="stroke-slate-300 dark:stroke-slate-600" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="55" y1="90" x2="95" y2="84" className="stroke-slate-300 dark:stroke-slate-600" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="58" y1="108" x2="85" y2="104" className="stroke-slate-300 dark:stroke-slate-600" strokeWidth="2.5" strokeLinecap="round" />

          {/* Foreground Primary Document */}
          <rect
            x="64"
            y="30"
            width="88"
            height="112"
            rx="12"
            className="fill-white dark:fill-[#1e293b] stroke-indigo-200 dark:stroke-indigo-900/60"
            strokeWidth="2"
          />
          {/* Document Content Lines */}
          <line x1="80" y1="52" x2="136" y2="52" className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="3" strokeLinecap="round" />
          <line x1="80" y1="68" x2="128" y2="68" className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="3" strokeLinecap="round" />
          <line x1="80" y1="84" x2="116" y2="84" className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="3" strokeLinecap="round" />

          {/* Friendly Magnifying Glass */}
          <g className="transition-transform duration-300 hover:scale-105">
            {/* Lens Rim */}
            <circle
              cx="128"
              cy="98"
              r="28"
              className="fill-indigo-50/80 dark:fill-indigo-950/50 stroke-indigo-600 dark:stroke-indigo-400"
              strokeWidth="4"
            />
            {/* Lens Reflection */}
            <path
              d="M 112 88 A 20 20 0 0 1 138 80"
              className="stroke-indigo-300 dark:stroke-indigo-500"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Little Question Mark / Search Icon Inside Lens */}
            <circle cx="128" cy="95" r="7" className="stroke-indigo-500 dark:stroke-indigo-400" strokeWidth="2.5" fill="none" />
            <path d="M 128 102 L 128 105" className="stroke-indigo-500 dark:stroke-indigo-400" strokeWidth="2.5" strokeLinecap="round" />

            {/* Handle */}
            <line
              x1="148"
              y1="118"
              x2="175"
              y2="145"
              className="stroke-indigo-600 dark:stroke-indigo-400"
              strokeWidth="5.5"
              strokeLinecap="round"
            />
          </g>

          {/* Neutral Accent Sparkles */}
          <path
            d="M 40 32 L 42 38 L 48 40 L 42 42 L 40 48 L 38 42 L 32 40 L 38 38 Z"
            className="fill-amber-400/80"
          />
          <circle cx="165" cy="45" r="3.5" className="fill-indigo-400/60" />
          <circle cx="34" cy="120" r="2.5" className="fill-slate-300 dark:fill-slate-600" />
        </svg>

        {badge && (
          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 whitespace-nowrap">
            {badge}
          </span>
        )}
      </div>

      {/* Text Content */}
      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5 flex items-center gap-1.5 justify-center">
        <SearchX className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        {title}
      </h3>
      <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md leading-relaxed mb-5">
        {description}
      </p>

      {/* Action Button */}
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{actionText}</span>
        </button>
      )}
    </div>
  );
};

export default EmptyStateIllustration;
