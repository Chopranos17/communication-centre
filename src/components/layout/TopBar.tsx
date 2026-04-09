import { useEffect, useRef, useState } from 'react'
import { usePersona } from '../../context/PersonaContext'
import type { Persona } from '../../types/persona'
import { PERSONA_LABELS } from '../../types/persona'
import { Bell, Star } from 'lucide-react'
import {
  sdsButtonSecondary,
  sdsMenuItemBtn,
  sdsTopBarIconButton,
} from '../../lib/sdsButtonClasses'
import { sdsInput } from '../../lib/sdsFormClasses'

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
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-[#e0e0e0]/60 bg-white px-4">
      <span className="shrink-0 text-sm font-bold tracking-tight text-[#131313]">Darwinbox</span>

      <div className="flex min-w-0 flex-1 justify-center px-2">
        <label className="sr-only" htmlFor="topbar-search">
          Search for people and settings
        </label>
        <input
          id="topbar-search"
          type="search"
          placeholder="Search for people and settings"
          className={`${sdsInput} w-[400px] max-w-full`}
        />
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          className={`${sdsTopBarIconButton} relative`}
          aria-label="Notifications"
        >
          <Bell size={20} strokeWidth={1.5} />
          <span className="absolute right-1 top-1 min-w-[1.25rem] rounded-full bg-red-500 px-1 text-center text-[10px] font-semibold leading-tight text-white">
            99+
          </span>
        </button>

        <button
          type="button"
          className={sdsTopBarIconButton}
          aria-label="Bookmarks"
        >
          <Star size={20} strokeWidth={1.5} />
        </button>

        <div className="relative pl-1" ref={menuRef}>
          <button
            type="button"
            className={`${sdsButtonSecondary} h-10 w-10 shrink-0 rounded-full p-0 text-sm`}
            aria-expanded={menuOpen}
            aria-haspopup="listbox"
            aria-label="Account and role"
            onClick={() => setMenuOpen((o) => !o)}
          >
            {personaInitial}
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 z-50 mt-2 w-56 rounded-sds-8 border border-[#e0e0e0]/60 bg-white py-2 shadow-[var(--elevation-2)]"
              role="listbox"
              aria-label="Role"
            >
              <div className="border-b border-[#f5f5f5] px-3 pb-2 text-xs text-[#4d4d4d]">Role</div>
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
                      sdsMenuItemBtn,
                      'text-sm',
                      persona === key
                        ? 'bg-[#E6F3FF] font-medium'
                        : '',
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
