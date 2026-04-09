import { Link } from 'react-router-dom'

const linkClass =
  'text-[12px] font-medium text-[var(--text-link)] hover:text-[var(--text-link-hover)] hover:underline'

export function ActivityRecruitmentBreadcrumbs() {
  return (
    <nav
      className="mb-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px] text-[#4d4d4d]"
      aria-label="Breadcrumb"
    >
      <Link to="/recruitment/job-openings" className={linkClass}>
        Recruitment
      </Link>
      <span aria-hidden className="text-[#aaaaaa]">
        /
      </span>
      <Link to="/recruitment/communication-analytics" className={linkClass}>
        Communication Analytics
      </Link>
      <span aria-hidden className="text-[#aaaaaa]">
        /
      </span>
      <span className="text-[12px] font-medium text-[#131313]">Activity</span>
    </nav>
  )
}
