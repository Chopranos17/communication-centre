import { useEffect, useRef, useState } from 'react'
import { usePersona } from '../../context/PersonaContext'
import type { Persona } from '../../types/persona'
import { PERSONA_LABELS } from '../../types/persona'
import { Bell, Star } from 'lucide-react'

export function TopBar() {
  const { persona, setPersona, personaLabel } = usePersona()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuOpen])

  const personaInitial = personaLabel.slice(0, 1).toUpperCase()

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-gray-200/60 bg-white px-4">
      <span className="shrink-0 text-sm font-bold tracking-tight text-gray-900">Darwinbox</span>

      <div className="flex min-w-0 flex-1 justify-center px-2">
        <label className="sr-only" htmlFor="topbar-search">
          Search for people and settings
        </label>
        <input
          id="topbar-search"
          type="search"
          placeholder="Search for people and settings"
          className="w-[400px] max-w-full rounded-full border-0 bg-gray-100 px-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          className="relative flex h-10 w-10 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100"
          aria-label="Notifications"
        >
          <Bell size={20} strokeWidth={1.5} />
          <span className="absolute right-1 top-1 min-w-[1.25rem] rounded-full bg-red-500 px-1 text-center text-[10px] font-semibold leading-tight text-white">
            99+
          </span>
        </button>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100"
          aria-label="Bookmarks"
        >
          <Star size={20} strokeWidth={1.5} />
        </button>

        <div className="relative pl-1" ref={menuRef}>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200/60 bg-gray-100 text-sm font-medium text-gray-700 hover:bg-gray-200"
            aria-expanded={menuOpen}
            aria-haspopup="listbox"
            aria-label="Account and role"
            onClick={() => setMenuOpen((o) => !o)}
          >
            {personaInitial}
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-gray-200/60 bg-white py-2 shadow-[var(--elevation-2)]"
              role="listbox"
              aria-label="Role"
            >
              <div className="border-b border-gray-100 px-3 pb-2 text-xs text-gray-500">Role</div>
              <div className="flex flex-col py-1">
                {(Object.keys(PERSONA_LABELS) as Persona[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    role="option"
                    aria-selected={persona === key}
                    onClick={() => {
                      setPersona(key)
                      setMenuOpen(false)
                    }}
                    className={[
                      'px-3 py-2 text-left text-sm',
                      persona === key
                        ? 'bg-blue-50 font-medium text-blue-800'
                        : 'text-gray-800 hover:bg-gray-50',
                    ].join(' ')}
                  >
                    {PERSONA_LABELS[key]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
