import type { CSSProperties } from 'react';

/** A static placeholder block; it shimmers only when motion is allowed (see styles.css). */
export function Skeleton({ w, h = 14, className = '' }: { w?: number | string; h?: number; className?: string }) {
  return <span className={`skel ${className}`} aria-hidden="true" style={{ width: w, height: h } as CSSProperties} />;
}

/** Stand-in for a whole view while the active site's result is on its way. */
export function StageSkeleton({ label }: { label: string }) {
  return (
    <div className="stage-skel" role="status">
      <span className="sr-only">{label}</span>
      <Skeleton h={320} className="block" />
      <Skeleton w="40%" />
    </div>
  );
}
