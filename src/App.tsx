import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Today from './pages/Today'
import Archive from './pages/Archive'
import AdminLogin from './pages/AdminLogin'
import AdminShell from './pages/admin/AdminShell'
import HomeworkEntry from './pages/admin/HomeworkEntry'
import NoticesPage from './pages/admin/NoticesPage'
import ImportPage from './pages/admin/ImportPage'
import MasterDataPage from './pages/admin/MasterDataPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/archive" element={<Archive />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminShell />}>
          <Route index element={<Navigate to="homework" replace />} />
          <Route path="homework" element={<HomeworkEntry />} />
          <Route path="notices" element={<NoticesPage />} />
          <Route path="import" element={<ImportPage />} />
          <Route path="master-data" element={<MasterDataPage />} />
        </Route>
        <Route path="/*" element={<Today />} />
      </Routes>
    </BrowserRouter>
  )
}
