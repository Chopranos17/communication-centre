import { Link } from 'react-router-dom'

/**
 * Header breadcrumb for Activity Command Center: parent (muted, truncates) / bold current page.
 */
export function ActivityCommandCenterBreadcrumb() {
  return (
    <nav
      className="flex min-w-0 max-w-[min(100%,calc(100%-12rem))] items-center gap-x-1.5 sm:max-w-none"
      aria-label="Breadcrumb"
    >
      <Link
        to="/recruitment/communication-hub"
        className="min-w-0 max-w-[42vw] truncate font-normal text-[#4d4d4d] transition-colors hover:text-[#131313] hover:underline sm:max-w-[14rem]"
        title="Communication Hub"
      >
        Communication Hub
      </Link>
      <span className="shrink-0 text-[13px] text-[#aaaaaa]" aria-hidden>
        /
      </span>
      <span className="shrink-0 text-[13px] font-bold leading-snug text-[#131313]">
        Activity command center
      </span>
    </nav>
  )
}
