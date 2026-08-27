import React from 'react';

interface SkeletonProps {
  className?: string;
  id?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', id }) => {
  return (
    <div
      id={id}
      className={`animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800/80 ${className}`}
    />
  );
};

export const SubjectCardSkeleton: React.FC<{ id?: string }> = ({ id }) => {
  return (
    <div
      id={id}
      className="relative rounded-xl p-5 flex flex-col justify-between bg-slate-900/60 border border-slate-800/90 shadow-md backdrop-blur-sm overflow-hidden animate-pulse min-h-[220px]"
    >
      {/* Subtle top ambient line shimmer */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-slate-800/60" />

      <div className="space-y-3.5 relative z-10">
        {/* Header Badges: Code, Credits, Exam Format */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-5 w-20 rounded-md bg-slate-800/90 border border-slate-700/60" />
            <Skeleton className="h-5 w-14 rounded-md bg-slate-800/70 border border-slate-700/40" />
          </div>
          <Skeleton className="h-5 w-24 rounded-md bg-slate-800/80 border border-slate-700/50" />
        </div>

        {/* Title & English Subtitle */}
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-3/4 rounded-md bg-slate-800/90" />
          <Skeleton className="h-3.5 w-1/2 rounded bg-slate-800/60" />
        </div>

        {/* Description Lines */}
        <div className="space-y-1.5 pt-1">
          <Skeleton className="h-3 w-full rounded bg-slate-800/60" />
          <Skeleton className="h-3 w-11/12 rounded bg-slate-800/50" />
          <Skeleton className="h-3 w-4/5 rounded bg-slate-800/40" />
        </div>
      </div>

      {/* Card Footer */}
      <div className="pt-3.5 mt-4 border-t border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Skeleton className="w-3.5 h-3.5 rounded-full bg-slate-800/70" />
          <Skeleton className="h-3.5 w-16 rounded bg-slate-800/60" />
        </div>
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-3.5 w-14 rounded bg-slate-800/80" />
          <Skeleton className="w-3.5 h-3.5 rounded-full bg-slate-800/70" />
        </div>
      </div>
    </div>
  );
};

export const SubjectGridSkeleton: React.FC<{ count?: number; id?: string }> = ({
  count = 6,
  id = 'subject-grid-skeleton'
}) => {
  return (
    <div id={id} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
      {Array.from({ length: count }).map((_, index) => (
        <SubjectCardSkeleton key={index} id={`subject-card-skeleton-${index}`} />
      ))}
    </div>
  );
};

export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return <SubjectGridSkeleton count={count} />;
};

export const CategorySkeleton: React.FC = () => {
  return (
    <div id="category-page-skeleton" className="space-y-6 animate-in fade-in duration-150">
      {/* Breadcrumbs & Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="space-y-2">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-3.5 w-14" />
            <span className="text-slate-700">/</span>
            <Skeleton className="h-3.5 w-32" />
            <span className="text-slate-700">/</span>
            <Skeleton className="h-3.5 w-24" />
          </div>

          {/* Title group */}
          <div className="flex items-center gap-3 pt-1">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-7 w-56" />
              <Skeleton className="h-3.5 w-64" />
            </div>
          </div>
        </div>

        <Skeleton className="h-9 w-36 rounded-xl self-start sm:self-center" />
      </div>

      {/* Description Banner Skeleton */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-4/5" />
      </div>

      {/* Search & Multi-filter Toolbar Skeleton */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3.5 shadow-lg">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <Skeleton className="h-9 w-full md:max-w-md rounded-lg" />
          <Skeleton className="h-9 w-44 rounded-lg self-start md:self-center shrink-0" />
        </div>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-7 w-48 rounded-lg" />
            <Skeleton className="h-7 w-56 rounded-lg" />
          </div>
          <Skeleton className="h-4 w-32 rounded self-end lg:self-center" />
        </div>
      </div>

      {/* Grid of Subject Cards */}
      <SubjectGridSkeleton count={6} />
    </div>
  );
};

export const SubjectDetailSkeleton: React.FC = () => {
  return (
    <div id="subject-detail-skeleton" className="space-y-6 animate-in fade-in duration-150">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-3.5 w-14" />
        <span className="text-slate-700">/</span>
        <Skeleton className="h-3.5 w-28" />
        <span className="text-slate-700">/</span>
        <Skeleton className="h-3.5 w-48" />
      </div>

      {/* Hero Header Box Skeleton */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl flex-1">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-20 rounded-md" />
            <Skeleton className="h-5 w-28 rounded-md" />
            <Skeleton className="h-4 w-24 rounded" />
          </div>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Skeleton className="w-9 h-9 rounded-xl" />
          <Skeleton className="h-9 w-36 rounded-xl" />
          <Skeleton className="h-9 w-44 rounded-xl" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-8 w-40 rounded-lg" />
      </div>

      {/* 2x2 Grid of Detail Specs Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Course Specs Skeleton */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-5 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col items-center space-y-2">
              <Skeleton className="h-8 w-12" />
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col items-center space-y-2">
              <Skeleton className="h-8 w-12" />
              <Skeleton className="h-3 w-20" />
            </div>
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col items-center space-y-2">
              <Skeleton className="h-8 w-12" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/60 space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
          </div>
        </div>

        {/* Card 2: Grading Weights Skeleton */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-5 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col items-center space-y-2">
                <Skeleton className="w-12 h-12 rounded-full" />
                <Skeleton className="h-3.5 w-16" />
                <Skeleton className="h-2.5 w-12" />
              </div>
            ))}
          </div>
          <Skeleton className="h-3.5 w-3/4" />
        </div>

        {/* Card 3: Prerequisites Skeleton */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <Skeleton className="h-5 w-56" />
          </div>
          <div className="space-y-2 pt-1">
            <div className="flex justify-between py-2 border-b border-slate-800/60">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-40" />
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800/60">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        </div>

        {/* Card 4: Syllabus Outline Skeleton */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <Skeleton className="h-5 w-52" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-12 rounded" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-3 w-3/4 pl-8" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export interface LoadingSkeletonProps {
  variant?: 'category' | 'subject' | 'cards' | 'grid' | 'default';
  count?: number;
  className?: string;
  id?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  variant = 'default',
  count = 6,
  className = '',
  id
}) => {
  switch (variant) {
    case 'category':
      return <CategorySkeleton />;
    case 'subject':
      return <SubjectDetailSkeleton />;
    case 'cards':
    case 'grid':
      return <SubjectGridSkeleton count={count} id={id} />;
    default:
      return <Skeleton id={id} className={className} />;
  }
};

export default LoadingSkeleton;

