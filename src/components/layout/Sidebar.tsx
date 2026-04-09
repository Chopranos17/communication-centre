import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  IconAllApps,
  IconCompensation,
  IconDashboard,
  IconEmployees,
  IconEngagement,
  IconFlows,
  IconHelpdesk,
  IconOrgView,
  IconPoliciesHr,
  IconProfile,
  IconRecruitment,
  type SidebarIconComponent,
} from './SidebarIcons'
import { sdsInput } from '../../lib/sdsFormClasses'

const STORAGE_KEY = 'sidebar-expanded'
/** Darwinbox primary blue — active Recruitment module icon */
const RECRUITMENT_ICON_ACTIVE = '#0183FF'

export type ModuleChild = {
  id: string
  label: string
  path?: string
  disabled?: boolean
}

export type ModuleDef = {
  id: string
  label: string
  icon: SidebarIconComponent
  disabled?: boolean
  children?: ModuleChild[]
}

const recruitmentChildren: ModuleChild[] = [
  { id: 'overview', label: 'Overview', disabled: true },
  { id: 'job-openings', label: 'Job Openings', path: '/recruitment/job-openings' },
  { id: 'candidates', label: 'Candidates', path: '/recruitment/candidates' },
  // TODO: Add permission guard for Communication Analytics
  {
    id: 'communication-analytics',
    label: 'Communication Analytics',
    path: '/recruitment/communication-analytics',
  },
  { id: 'requisitions', label: 'Requisitions', disabled: true },
  { id: 'my-interviews', label: 'My Interviews', disabled: true },
  { id: 'refer', label: 'Refer', disabled: true },
  { id: 'my-referrals', label: 'My Referrals', disabled: true },
  { id: 'ijp-openings', label: 'IJP Openings', disabled: true },
  { id: 'ijp-jobs-applied', label: 'IJP Jobs Applied', disabled: true },
  { id: 'offer-letter', label: 'Offer Letter', disabled: true },
  { id: 'offer-proposal', label: 'Offer Proposal', disabled: true },
  { id: 'link-accounts', label: 'Link Accounts', disabled: true },
  { id: 'configure-job-boards', label: 'Configure Job Boards', disabled: true },
]

const modules: ModuleDef[] = [
  { id: 'dashboard', label: 'Dashboard', icon: IconDashboard, disabled: true },
  { id: 'profile', label: 'Profile', icon: IconProfile, disabled: true },
  { id: 'employees', label: 'Employees', icon: IconEmployees, disabled: true },
  { id: 'policies', label: 'Policies HR', icon: IconPoliciesHr, disabled: true },
  { id: 'flows', label: 'Flows', icon: IconFlows, disabled: true },
  { id: 'compensation', label: 'Compensation', icon: IconCompensation, disabled: true },
  { id: 'engagement', label: 'Employee Engagement', icon: IconEngagement, disabled: true },
  { id: 'orgview', label: 'Org View', icon: IconOrgView, disabled: true },
  { id: 'helpdesk', label: 'Helpdesk', icon: IconHelpdesk, disabled: true },
  { id: 'recruitment', label: 'Recruitment', icon: IconRecruitment, children: recruitmentChildren },
]

const OPEN_DELAY_MS = 150
const CLOSE_DELAY_MS = 200
const VIEWPORT_PAD = 16
/** Fallback before flyout is measured */
const FLYOUT_HEIGHT_ESTIMATE = 520

function clampFlyoutTop(iconTop: number, flyoutHeight: number): number {
  const maxTop = window.innerHeight - VIEWPORT_PAD - flyoutHeight
  let top = iconTop
  if (top + flyoutHeight > window.innerHeight - VIEWPORT_PAD) {
    top = maxTop
  }
  if (top < VIEWPORT_PAD) {
    top = VIEWPORT_PAD
  }
  return top
}

function readExpanded(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function isRecruitmentPath(pathname: string) {
  return pathname.startsWith('/recruitment')
}

function expandedModuleIconProps(
  mod: ModuleDef,
  rowActive: boolean,
  disabledNoKids: boolean,
): { className: string; style?: { color: string } } {
  if (disabledNoKids) {
    return { className: 'shrink-0 text-white/30 opacity-40' }
  }
  if (mod.id === 'recruitment' && rowActive) {
    return { className: 'shrink-0', style: { color: RECRUITMENT_ICON_ACTIVE } }
  }
  return { className: 'shrink-0 text-white/50 group-hover:text-white' }
}

function collapsedModuleIconProps(
  mod: ModuleDef,
  routeActive: boolean,
  flyoutOpen: boolean,
): { className: string; style?: { color: string } } {
  if (mod.id === 'recruitment' && routeActive) {
    return { className: 'shrink-0', style: { color: RECRUITMENT_ICON_ACTIVE } }
  }
  if (routeActive || flyoutOpen) {
    return { className: 'shrink-0 text-white' }
  }
  return { className: 'shrink-0 text-white/50' }
}

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const pathname = location.pathname

  const [expanded, setExpanded] = useState(readExpanded)
  const [openModuleId, setOpenModuleId] = useState<string | null>(() =>
    isRecruitmentPath(pathname) ? 'recruitment' : null,
  )

  const [flyoutModuleId, setFlyoutModuleId] = useState<string | null>(null)
  const [flyoutTop, setFlyoutTop] = useState(0)

  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const iconRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const flyoutPanelRef = useRef<HTMLDivElement | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement | null>(null)
  const recruitmentAccordionRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, expanded ? 'true' : 'false')
    } catch {
      /* ignore */
    }
  }, [expanded])

  useLayoutEffect(() => {
    document.documentElement.style.setProperty(
      '--app-sidebar-width',
      expanded ? '272px' : '4rem',
    )
  }, [expanded])

  useEffect(() => {
    if (isRecruitmentPath(pathname)) {
      setOpenModuleId('recruitment')
    } else {
      setOpenModuleId(null)
    }
  }, [pathname])

  const clearOpenTimer = useCallback(() => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current)
      openTimerRef.current = null
    }
  }, [])

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }, [])

  const updateFlyoutTop = useCallback((moduleId: string) => {
    const el = iconRefs.current[moduleId]
    if (!el) return
    const iconTop = el.getBoundingClientRect().top
    const measured =
      flyoutPanelRef.current?.offsetHeight && flyoutPanelRef.current.offsetHeight > 0
        ? flyoutPanelRef.current.offsetHeight
        : FLYOUT_HEIGHT_ESTIMATE
    setFlyoutTop(clampFlyoutTop(iconTop, measured))
  }, [])

  const openFlyout = useCallback(
    (moduleId: string) => {
      clearCloseTimer()
      clearOpenTimer()
      setFlyoutModuleId(moduleId)
    },
    [clearCloseTimer, clearOpenTimer],
  )

  const scheduleOpenFlyout = useCallback(
    (moduleId: string) => {
      clearCloseTimer()
      clearOpenTimer()
      openTimerRef.current = setTimeout(() => {
        openFlyout(moduleId)
        openTimerRef.current = null
      }, OPEN_DELAY_MS)
    },
    [clearCloseTimer, clearOpenTimer, openFlyout],
  )

  const scheduleCloseFlyout = useCallback(() => {
    clearOpenTimer()
    closeTimerRef.current = setTimeout(() => {
      setFlyoutModuleId(null)
      closeTimerRef.current = null
    }, CLOSE_DELAY_MS)
  }, [clearOpenTimer])

  const cancelCloseFlyout = useCallback(() => {
    clearCloseTimer()
  }, [clearCloseTimer])

  useLayoutEffect(() => {
    if (!flyoutModuleId || expanded) return
    const el = iconRefs.current[flyoutModuleId]
    if (!el) return
    const measure = () => {
      const iconTop = el.getBoundingClientRect().top
      const raw = flyoutPanelRef.current?.offsetHeight ?? 0
      const h = raw > 0 ? raw : FLYOUT_HEIGHT_ESTIMATE
      setFlyoutTop(clampFlyoutTop(iconTop, h))
    }
    measure()
    const raf = requestAnimationFrame(measure)
    return () => cancelAnimationFrame(raf)
  }, [flyoutModuleId, expanded, pathname])

  useEffect(() => {
    if (!flyoutModuleId) return
    const onScroll = () => updateFlyoutTop(flyoutModuleId)
    window.addEventListener('scroll', onScroll, true)
    return () => window.removeEventListener('scroll', onScroll, true)
  }, [flyoutModuleId, updateFlyoutTop])

  useEffect(() => {
    const el = scrollAreaRef.current
    if (!el || !flyoutModuleId) return
    const onScroll = () => updateFlyoutTop(flyoutModuleId)
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [flyoutModuleId, updateFlyoutTop])

  useEffect(() => {
    if (!flyoutModuleId || expanded) return
    const onResize = () => updateFlyoutTop(flyoutModuleId)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [flyoutModuleId, expanded, updateFlyoutTop])

  useEffect(() => {
    if (!expanded || openModuleId !== 'recruitment') return
    const t = window.setTimeout(() => {
      const nav = scrollAreaRef.current
      const acc = recruitmentAccordionRef.current
      if (!nav || !acc) return
      const navRect = nav.getBoundingClientRect()
      const accRect = acc.getBoundingClientRect()
      if (accRect.bottom > navRect.bottom - 8) {
        nav.scrollTop += accRect.bottom - navRect.bottom + 8
      }
    }, 220)
    return () => window.clearTimeout(t)
  }, [expanded, openModuleId])

  useEffect(() => {
    if (!flyoutModuleId) return
    const onPointerDown = (e: Event) => {
      const t = e.target as Node
      const iconEl = iconRefs.current[flyoutModuleId]
      if (flyoutPanelRef.current?.contains(t)) return
      if (iconEl?.contains(t)) return
      setFlyoutModuleId(null)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [flyoutModuleId])

  const recruitmentModule = modules.find((m) => m.id === 'recruitment')
  const flyoutChildren = recruitmentModule?.children ?? []

  const isRecruitmentActive = isRecruitmentPath(pathname)

  const handleCollapsedIconEnter = (mod: ModuleDef) => () => {
    if (!mod.children?.length) return
    scheduleOpenFlyout(mod.id)
  }

  const handleCollapsedIconLeave = () => {
    scheduleCloseFlyout()
  }

  const handleCollapsedIconClick = (mod: ModuleDef) => (e: ReactMouseEvent<HTMLButtonElement>) => {
    if (!mod.children?.length) return
    e.stopPropagation()
    if (flyoutModuleId === mod.id) {
      clearOpenTimer()
      clearCloseTimer()
      setFlyoutModuleId(null)
    } else {
      clearOpenTimer()
      clearCloseTimer()
      openFlyout(mod.id)
    }
  }

  const canNavigateToChild = (child: ModuleChild) =>
    Boolean(child.path) && !child.disabled

  const handleFlyoutChildClick = (child: ModuleChild) => {
    if (!canNavigateToChild(child)) return
    navigate(child.path!)
    setFlyoutModuleId(null)
  }

  const toggleAccordion = (mod: ModuleDef) => {
    if (!mod.children?.length) return
    setOpenModuleId((prev) => (prev === mod.id ? null : mod.id))
  }

  const handleModuleRowClick = (mod: ModuleDef) => {
    if (mod.disabled) return
    if (mod.children?.length) {
      toggleAccordion(mod)
    }
  }

  const childIsActive = (path?: string) => {
    if (!path) return false
    return pathname === path || pathname.startsWith(`${path}/`)
  }

  const flyoutContent =
    flyoutModuleId === 'recruitment' && !expanded ? (
      <div
        ref={flyoutPanelRef}
        role="menu"
        className="fixed z-50 w-[240px] rounded-sds-8 border border-white/10 bg-[#252836] shadow-[var(--elevation-3)]"
        style={{ left: 64, top: flyoutTop }}
        onMouseEnter={cancelCloseFlyout}
        onMouseLeave={scheduleCloseFlyout}
      >
        <div className="border-b border-white/10 px-4 py-3 font-semibold text-white">
          Recruitment
        </div>
        <ul className="py-1">
          {flyoutChildren.map((child) => {
            const active = child.path ? childIsActive(child.path) : false
            const navigable = canNavigateToChild(child)
            return (
              <li key={child.id}>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleFlyoutChildClick(child)}
                  className={[
                    'flex w-full border-l-[3px] px-4 py-2.5 text-left text-sm transition-colors',
                    active
                      ? 'border-blue-500 bg-white/10 font-medium text-white'
                      : 'border-transparent text-white/80 hover:bg-white/10 hover:text-white',
                    navigable ? 'cursor-pointer' : 'cursor-default',
                  ].join(' ')}
                >
                  {child.label}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    ) : null

  return (
    <>
      <aside
        className={[
          'relative flex h-screen shrink-0 flex-col overflow-x-hidden bg-[#1a1d2e] transition-all duration-200 ease-in-out',
          expanded ? 'w-[272px]' : 'w-16',
        ].join(' ')}
      >
        <button
          type="button"
          className="absolute right-0 top-1/2 z-30 flex h-10 w-5 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-r-sds-4 bg-[#1a1d2e] text-white/60 transition-colors hover:bg-[#2a2d3e]"
          aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? (
            <ChevronLeft size={16} strokeWidth={2} className="shrink-0 text-white/60" aria-hidden />
          ) : (
            <ChevronRight size={16} strokeWidth={2} className="shrink-0 text-white/60" aria-hidden />
          )}
        </button>

        {expanded ? (
          <>
            <div className="flex shrink-0 flex-col px-4 py-3">
              <div className="flex items-center gap-2 pr-2">
                <IconAllApps className="h-5 w-5 shrink-0 text-white" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">All Apps</span>
              </div>
              <label className="mt-3 block">
                <span className="sr-only">Search apps</span>
                <input
                  type="search"
                  placeholder="All Apps"
                  className={`${sdsInput} w-full`}
                />
              </label>
            </div>

            <nav
              ref={scrollAreaRef}
              className="scrollbar-hidden flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden py-2"
            >
              {modules.map((mod) => {
                const Icon = mod.icon
                const hasKids = Boolean(mod.children?.length)
                const isOpen = openModuleId === mod.id
                const rowActive =
                  mod.id === 'recruitment' ? isRecruitmentActive : false
                const disabledNoKids = Boolean(mod.disabled && !hasKids)
                const iconProps = expandedModuleIconProps(mod, rowActive, disabledNoKids)

                return (
                  <div
                    key={mod.id}
                    ref={mod.id === 'recruitment' ? recruitmentAccordionRef : undefined}
                    className="min-w-0"
                  >
                    <button
                      type="button"
                      disabled={mod.disabled && !hasKids}
                      onClick={() => handleModuleRowClick(mod)}
                      className={[
                        'group flex w-full min-w-0 items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors',
                        mod.disabled && !hasKids
                          ? 'cursor-not-allowed text-white/30'
                          : rowActive
                            ? 'bg-white/10 text-white'
                            : 'cursor-pointer text-white/70 hover:bg-white/5 hover:text-white',
                      ].join(' ')}
                    >
                      <Icon
                        className={['h-5 w-5', iconProps.className].filter(Boolean).join(' ')}
                        style={iconProps.style}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate">{mod.label}</span>
                      {hasKids && (
                        <span className="ml-auto shrink-0 text-white/50" aria-hidden>
                          {isOpen ? (
                            <ChevronDown size={16} strokeWidth={2} />
                          ) : (
                            <ChevronRight size={16} strokeWidth={2} />
                          )}
                        </span>
                      )}
                    </button>
                    {hasKids && (
                      <div
                        className={[
                          'overflow-hidden transition-[max-height] duration-200 ease-in-out',
                          isOpen ? 'max-h-[1200px]' : 'max-h-0',
                        ].join(' ')}
                      >
                        <ul className="pb-1 pl-12 pr-2">
                          {mod.children!.map((child) => {
                            const active = child.path ? childIsActive(child.path) : false
                            const navigable = canNavigateToChild(child)
                            return (
                              <li key={child.id}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!navigable || !child.path) return
                                    navigate(child.path)
                                  }}
                                  className={[
                                    'mb-0.5 w-full rounded-r py-2 pl-3 text-left text-sm transition-colors text-white/60',
                                    active
                                      ? 'border-l-[3px] border-blue-500 bg-white/10 font-medium text-white'
                                      : 'border-l-[3px] border-transparent hover:bg-white/5 hover:text-white',
                                    navigable ? 'cursor-pointer' : 'cursor-default',
                                  ].join(' ')}
                                >
                                  {child.label}
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                )
              })}
            </nav>

            <div className="shrink-0 border-t border-white/10 px-4 py-3">
              <p className="text-center text-xs text-white/30">
                Privacy Policy | Terms of Use
              </p>
            </div>
          </>
        ) : (
          <>
            <div
              ref={scrollAreaRef}
              className="scrollbar-hidden flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden"
            >
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  className="flex h-12 w-12 items-center justify-center rounded-sds-8 text-white transition-colors hover:bg-white/10"
                  aria-label="All Apps"
                >
                  <IconAllApps className="h-5 w-5 text-white/50" aria-hidden />
                </button>
              </div>
              <div className="mx-3 my-2 border-t border-white/10" />
              <div className="flex flex-col items-center gap-1 px-0 pb-2">
                {modules.map((mod) => {
                  const Icon = mod.icon
                  const hasKids = Boolean(mod.children?.length)
                  const isFlyoutOpen = flyoutModuleId === mod.id
                  const routeActive =
                    mod.id === 'recruitment' ? isRecruitmentActive : false
                  const iconProps = collapsedModuleIconProps(mod, routeActive, isFlyoutOpen)

                  return (
                    <button
                      key={mod.id}
                      ref={(el) => {
                        iconRefs.current[mod.id] = el
                      }}
                      type="button"
                      disabled={!hasKids && mod.disabled}
                      onMouseEnter={hasKids ? handleCollapsedIconEnter(mod) : undefined}
                      onMouseLeave={hasKids ? handleCollapsedIconLeave : undefined}
                      onClick={handleCollapsedIconClick(mod)}
                      className={[
                        'flex h-12 w-12 items-center justify-center rounded-sds-8 text-white transition-colors',
                        routeActive || isFlyoutOpen ? 'bg-white/10' : 'hover:bg-white/10',
                        !hasKids && mod.disabled ? 'cursor-not-allowed opacity-40' : '',
                      ].join(' ')}
                      aria-label={mod.label}
                      title={undefined}
                    >
                      <Icon
                        className={['h-5 w-5', iconProps.className].filter(Boolean).join(' ')}
                        style={iconProps.style}
                        aria-hidden
                      />
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </aside>

      {typeof document !== 'undefined' && flyoutContent && createPortal(flyoutContent, document.body)}
    </>
  )
}
