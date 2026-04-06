import { NavLink } from 'react-router-dom'
import { usePersona } from '../../context/PersonaContext'
import type { Persona } from '../../types/persona'
import { PERSONA_LABELS } from '../../types/persona'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'px-3 py-2 rounded-md text-[length:var(--body-m)] transition-colors',
    isActive
      ? 'text-[var(--text-link)] font-medium bg-[var(--blue-10)]'
      : 'text-[var(--text-body)] hover:text-[var(--text-link)] hover:bg-[var(--charcoal-5)]',
  ].join(' ')

export function AppHeader() {
  const { persona, setPersona, personaLabel } = usePersona()

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border-default)] bg-[var(--bg-surface)] shadow-[var(--elevation-1)]">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-6">
          <span
            className="shrink-0 text-[length:var(--title-xxs)] font-bold tracking-tight text-[var(--text-title)]"
            style={{ fontWeight: 'var(--font-weight-bold)' }}
          >
            Darwinbox
          </span>
          <nav className="flex items-center gap-1" aria-label="Recruitment">
            <NavLink to="/recruitment/job-openings" className={navLinkClass}>
              Job Openings
            </NavLink>
            <NavLink to="/recruitment/candidates" className={navLinkClass}>
              All Candidates
            </NavLink>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span
            className="hidden text-[length:var(--body-s)] text-[var(--text-label)] sm:inline"
            title="Active persona for this session"
          >
            {personaLabel}
          </span>
          <label className="sr-only" htmlFor="persona-switcher">
            Role
          </label>
          <select
            id="persona-switcher"
            value={persona}
            onChange={(e) => setPersona(e.target.value as Persona)}
            className="max-w-[11rem] cursor-pointer rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] py-1.5 pl-2 pr-8 text-[length:var(--body-m)] text-[var(--text-body)] shadow-sm focus:border-[var(--border-active)] focus:outline-none focus:ring-1 focus:ring-[var(--blue-500)]"
          >
            {(Object.keys(PERSONA_LABELS) as Persona[]).map((key) => (
              <option key={key} value={key}>
                {PERSONA_LABELS[key]}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--charcoal-5)] text-[var(--icon-default)] hover:bg-[var(--bg-surface-hover)]"
            aria-label="Account"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}
