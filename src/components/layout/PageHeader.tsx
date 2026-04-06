import type { ReactNode } from 'react'

type PageHeaderProps = {
  title: string
  badge?: ReactNode
  action?: ReactNode
  trailing?: ReactNode
}

export function PageHeader({ title, badge, action, trailing }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <h1
          className="text-[length:var(--title-s)] leading-8 font-bold text-[var(--text-title)] tracking-tight"
          style={{ fontWeight: 'var(--font-weight-bold)' }}
        >
          {title}
        </h1>
        {badge}
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-auto">
        {action}
        {trailing}
      </div>
    </div>
  )
}
