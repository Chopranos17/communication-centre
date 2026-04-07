import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Persona } from '../types/persona'
import { PERSONA_LABELS } from '../types/persona'

type PersonaContextValue = {
  persona: Persona
  setPersona: (p: Persona) => void
  personaLabel: string
  /** Recruiter or Hiring Lead — full prototype access (compose, bulk send, etc.). */
  canManageRecruitment: boolean
  /** Candidate portal view: read-only communications (received messages only). */
  isCandidatePersona: boolean
}

const PersonaContext = createContext<PersonaContextValue | null>(null)

export function PersonaProvider({ children }: { children: ReactNode }) {
  const [persona, setPersonaState] = useState<Persona>('recruiter')

  const setPersona = useCallback((p: Persona) => {
    setPersonaState(p)
  }, [])

  const value = useMemo(() => {
    const isCandidatePersona = persona === 'candidate'
    return {
      persona,
      setPersona,
      personaLabel: PERSONA_LABELS[persona],
      canManageRecruitment: persona === 'recruiter' || persona === 'hiring_lead',
      isCandidatePersona,
    }
  }, [persona, setPersona])

  return (
    <PersonaContext.Provider value={value}>{children}</PersonaContext.Provider>
  )
}

export function usePersona() {
  const ctx = useContext(PersonaContext)
  if (!ctx) {
    throw new Error('usePersona must be used within PersonaProvider')
  }
  return ctx
}
