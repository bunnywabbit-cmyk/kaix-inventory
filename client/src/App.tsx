import { useState } from 'react'
import ProtectedRoute from './components/auth/ProtectedRoute'
// AIChatDrawer temporarily disabled — not being used for now. Re-enable by
// restoring this import and the <AIChatDrawer /> line below.
// import AIChatDrawer from './components/dashboard/AIChatDrawer'
import DashboardHome from './components/dashboard/DashboardHome'
import Header from './components/layout/Header'
import Sidebar from './components/layout/Sidebar'
import CategoryManager from './components/views/CategoryManager'
import Designs from './components/views/Designs'
import DtfPrints from './components/views/DtfPrints'
import OnHandStock from './components/views/OnHandStock'
import PrintRuns from './components/views/PrintRuns'
import RawMaterials from './components/views/RawMaterials'
import ScreenRack from './components/views/ScreenRack'
import SettingsView from './components/views/SettingsView'
import { AuthProvider } from './context/AuthContext'
import { useTheme } from './hooks/useTheme'
import type { ViewKey } from './lib/navigation'

function AppShell() {
  const [activeView, setActiveView] = useState<ViewKey>('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { theme, toggleTheme } = useTheme()

  const handleNavigate = (view: ViewKey) => {
    setActiveView(view)
    setMobileNavOpen(false)
  }

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardHome onNavigate={handleNavigate} />
      case 'raw-materials':
        return <RawMaterials searchQuery={searchQuery} />
      case 'designs':
        return <Designs searchQuery={searchQuery} />
      case 'screen-rack':
        return <ScreenRack searchQuery={searchQuery} />
      case 'print-runs':
        return <PrintRuns searchQuery={searchQuery} />
      case 'dtf-prints':
        return <DtfPrints searchQuery={searchQuery} />
      case 'on-hand-stock':
        return <OnHandStock searchQuery={searchQuery} />
      case 'category-manager':
        return <CategoryManager />
      case 'settings':
        return <SettingsView theme={theme} onToggleTheme={toggleTheme} />
      default:
        return null
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Sidebar
        activeView={activeView}
        onNavigate={handleNavigate}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((prev) => !prev)}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Header
          activeView={activeView}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{renderView()}</main>
      </div>

      {/* <AIChatDrawer /> */}
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    </AuthProvider>
  )
}

export default App
