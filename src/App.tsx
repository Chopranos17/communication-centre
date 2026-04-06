import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { PersonaProvider } from './context/PersonaContext'
import { AppLayout } from './components/layout/AppLayout'
import { JobOpeningsPage } from './pages/JobOpeningsPage'
import { CandidatesPage } from './pages/CandidatesPage'

export default function App() {
  return (
    <BrowserRouter>
      <PersonaProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/recruitment/job-openings" replace />} />
            <Route path="/recruitment/job-openings" element={<JobOpeningsPage />} />
            <Route path="/recruitment/candidates" element={<CandidatesPage />} />
            <Route path="*" element={<Navigate to="/recruitment/job-openings" replace />} />
          </Route>
        </Routes>
      </PersonaProvider>
    </BrowserRouter>
  )
}
