import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import OfflineBanner from './OfflineBanner'

export function AppShell() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <OfflineBanner />
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar />
        <div
          style={{
            marginLeft: 220,
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
          }}
        >
          <TopBar />
          <main
            style={{
              flex: 1,
              padding: '24px',
              overflowY: 'auto',
            }}
          >
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
