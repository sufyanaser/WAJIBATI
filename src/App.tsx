import { Suspense, lazy } from 'react'
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Spinner } from './components/Spinner'
import Login from './pages/Login'
import AdminLogin from './pages/AdminLogin'

const Today = lazy(() => import('./pages/Today'))
const Archive = lazy(() => import('./pages/Archive'))
const Inquiries = lazy(() => import('./pages/Inquiries'))
const AdminShell = lazy(() => import('./pages/admin/AdminShell'))
const DashboardHome = lazy(() => import('./pages/admin/DashboardHome'))
const HomeworkEntry = lazy(() => import('./pages/admin/HomeworkEntry'))
const NoticesPage = lazy(() => import('./pages/admin/NoticesPage'))
const ImportPage = lazy(() => import('./pages/admin/ImportPage'))
const MasterDataPage = lazy(() => import('./pages/admin/MasterDataPage'))
const SubjectsPage = lazy(() => import('./pages/admin/SubjectsPage'))
const TeachersPage = lazy(() => import('./pages/admin/TeachersPage'))
const SectionsPage = lazy(() => import('./pages/admin/SectionsPage'))
const TimetablePage = lazy(() => import('./pages/admin/TimetablePage'))
const StudentsPage = lazy(() => import('./pages/admin/StudentsPage'))
const GuardiansPage = lazy(() => import('./pages/admin/GuardiansPage'))
const SettingsPage = lazy(() => import('./pages/admin/SettingsPage'))

const isLocalFile = typeof window !== 'undefined' && window.location.protocol === 'file:'
const Router = isLocalFile ? HashRouter : BrowserRouter

export default function App() {
  return (
    <Router>
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/archive" element={<Archive />} />
          <Route path="/inquiries" element={<Inquiries />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminShell />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardHome />} />
            <Route path="homework" element={<HomeworkEntry />} />
            <Route path="notices" element={<NoticesPage />} />
            <Route path="import" element={<ImportPage />} />
            <Route path="master-data" element={<MasterDataPage />} />
            <Route path="database" element={<MasterDataPage />} />
            <Route path="subjects" element={<SubjectsPage />} />
            <Route path="teachers" element={<TeachersPage />} />
            <Route path="sections" element={<SectionsPage />} />
            <Route path="timetable" element={<TimetablePage />} />
            <Route path="students" element={<StudentsPage />} />
            <Route path="guardians" element={<GuardiansPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="/*" element={<Today />} />
        </Routes>
      </Suspense>
    </Router>
  )
}
