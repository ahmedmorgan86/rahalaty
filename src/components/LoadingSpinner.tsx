import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  text?: string;
}

export default function LoadingSpinner({ size = 'md', className, text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg',
  };

  return (
    <div className={cn('flex flex-col items-center justify-center gap-4', className)}>
      <Loader2 className={cn('animate-spin text-emerald-500', sizeClasses[size])} />
      {text && (
        <p className={cn('text-stone-500 font-bold uppercase tracking-widest animate-pulse', textSizes[size])}>
          {text}
        </p>
      )}
    </div>
  );
}

export function PageLoader({ text = 'جاري التحميل...' }: { text?: string }) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}

export function SkeletonLoader({ className }: { className?: string }) {
  return (
    <div className={cn('bg-white/5 animate-pulse rounded-2xl', className)} />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-[#111] rounded-[2.5rem] p-8 border border-white/5 space-y-4">
      <SkeletonLoader className="h-4 w-1/3" />
      <SkeletonLoader className="h-8 w-2/3" />
      <SkeletonLoader className="h-4 w-1/2" />
      <div className="flex gap-4 pt-4">
        <SkeletonLoader className="h-12 w-24" />
        <SkeletonLoader className="h-12 w-24" />
      </div>
    </div>
  );
}

export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-b border-white/5">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-4">
          <SkeletonLoader className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}