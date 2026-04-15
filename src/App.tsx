import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { PersonaProvider } from './context/PersonaContext'
import { ToastProvider } from './contexts/ToastContext'
import { AppLayout } from './components/layout/AppLayout'
import { JobOpeningsPage } from './pages/JobOpeningsPage'
import { JobDetailPage } from './pages/JobDetailPage'
import { CandidatesPage } from './pages/CandidatesPage'
import { CandidateDetailPage } from './pages/CandidateDetailPage'
import { CommunicationHubPage } from './pages/CommunicationHubPage'
import { ActivityCommandCenterPage } from './pages/ActivityCommandCenterPage'
import { SmsSettingsPage } from './pages/SmsSettingsPage'

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <PersonaProvider>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/recruitment/job-openings" replace />} />
              <Route path="/recruitment/job-openings" element={<JobOpeningsPage />} />
              <Route path="/recruitment/jobs/:jobId" element={<JobDetailPage />} />
              <Route path="/recruitment/candidates" element={<CandidatesPage />} />
              <Route path="/recruitment/candidates/:candidateId" element={<CandidateDetailPage />} />
              <Route
                path="/recruitment/communication-analytics"
                element={<Navigate to="/recruitment/communication-hub" replace />}
              />
              <Route
                path="/recruitment/communication-analytics/activity"
                element={
                  <Navigate to="/recruitment/communication-hub/activity" replace />
                }
              />
              <Route
                path="/recruitment/communication-hub/activity"
                element={<ActivityCommandCenterPage />}
              />
              <Route
                path="/recruitment/communication-hub"
                element={<CommunicationHubPage />}
              />
              <Route
                path="/recruitment/settings/sms"
                element={<SmsSettingsPage />}
              />
              <Route path="*" element={<Navigate to="/recruitment/job-openings" replace />} />
            </Route>
          </Routes>
        </PersonaProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
