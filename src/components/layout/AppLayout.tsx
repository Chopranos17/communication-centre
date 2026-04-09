import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="scrollbar-sleek min-h-0 w-full min-w-0 flex-1 overflow-auto bg-brand-10 pt-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
