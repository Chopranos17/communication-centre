import type { ReactNode } from 'react'

type PageHeaderProps = {
  /** Ignored when `heading` is set. */
  title?: string
  /**
   * Overrides default page title size/line-height (`--title-s` / `leading-8`).
   * Use for subtle per-page adjustments without changing global tokens.
   */
  titleSizeClassName?: string
  /** Replaces the default title row (title + badge). Use for custom headings e.g. breadcrumbs. */
  heading?: ReactNode
  badge?: ReactNode
  action?: ReactNode
  trailing?: ReactNode
  /** When false, omit bottom margin (e.g. parent `flex flex-col gap-*` provides spacing). Default true. */
  marginBottom?: boolean
  /**
   * `card` — white rounded block (default). `strip` — layout only; use inside a full-width white bar
   * (e.g. Communication Hub / Activity Command Center).
   */
  variant?: 'card' | 'strip'
  /** Extra classes on the header row (e.g. `mx-auto max-w-screen-xl px-6` for strip layout). */
  className?: string
}

export function PageHeader({
  title,
  titleSizeClassName,
  heading,
  badge,
  action,
  trailing,
  marginBottom = true,
  variant = 'card',
  className = '',
}: PageHeaderProps) {
  const isCard = variant === 'card'
  const titleSizeClasses =
    titleSizeClassName ??
    'text-[length:var(--title-s)] leading-8'
  return (
    <div
      className={[
        'flex flex-wrap items-center justify-between gap-3 min-w-0',
        isCard ? 'rounded-sds-8 bg-white px-4 py-3' : '',
        marginBottom ? 'mb-4' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {heading ? (
          heading
        ) : (
          <>
            <h1
              className={`${titleSizeClasses} font-bold text-[var(--text-title)] tracking-tight`}
              style={{ fontWeight: 'var(--font-weight-bold)' }}
            >
              {title}
            </h1>
            {badge}
          </>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-auto">
        {action}
        {trailing}
      </div>
    </div>
  )
}
