import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Today from './pages/Today'
import Archive from './pages/Archive'
import AdminLogin from './pages/AdminLogin'
import Admin from './pages/Admin'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/archive" element={<Archive />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/*" element={<Admin />} />
        <Route path="/*" element={<Today />} />
      </Routes>
    </BrowserRouter>
  )
}
