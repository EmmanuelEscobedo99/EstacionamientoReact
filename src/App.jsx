import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import RoleRoute from './components/RoleRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Guide from './pages/Guide'
import Usuarios from './pages/Usuarios'
import Estacionamientos from './pages/Estacionamientos'
import EstacionamientoView from './pages/EstacionamientoView'
import Espacios from './pages/Espacios'
import Vehiculos from './pages/Vehiculos'
import EntradasSalidas from './pages/EntradasSalidas'
import Pagos from './pages/Pagos'
import Archivo from './pages/Archivo'
import MiCuenta from './pages/MiCuenta'
import SalidaQr from './pages/SalidaQr'

function HomeRedirect() {
  const { isAuthenticated, user } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return user.rol === 'CLIENTE' ? <Navigate to="/estacionamiento" replace /> : <Guide />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<HomeRedirect />} />

          <Route
            path="/estacionamiento"
            element={
              <RoleRoute roles={['ADMIN', 'EMPLEADO', 'CLIENTE']}>
                <EstacionamientoView />
              </RoleRoute>
            }
          />
          <Route
            path="/estacionamientos"
            element={
              <RoleRoute roles={['ADMIN', 'EMPLEADO']}>
                <Estacionamientos />
              </RoleRoute>
            }
          />
          <Route
            path="/espacios"
            element={
              <RoleRoute roles={['ADMIN', 'EMPLEADO']}>
                <Espacios />
              </RoleRoute>
            }
          />
          <Route
            path="/vehiculos"
            element={
              <RoleRoute roles={['ADMIN', 'CLIENTE']}>
                <Vehiculos />
              </RoleRoute>
            }
          />
          <Route
            path="/entradas"
            element={
              <RoleRoute roles={['ADMIN', 'EMPLEADO', 'CLIENTE']}>
                <EntradasSalidas />
              </RoleRoute>
            }
          />
          <Route
            path="/pagos"
            element={
              <RoleRoute roles={['ADMIN', 'CLIENTE']}>
                <Pagos />
              </RoleRoute>
            }
          />
          <Route
            path="/usuarios"
            element={
              <RoleRoute roles={['ADMIN']}>
                <Usuarios />
              </RoleRoute>
            }
          />
          <Route
            path="/archivo"
            element={
              <RoleRoute roles={['ADMIN', 'EMPLEADO']}>
                <Archivo />
              </RoleRoute>
            }
          />
          <Route
            path="/mi-cuenta"
            element={
              <RoleRoute roles={['ADMIN', 'CLIENTE']}>
                <MiCuenta />
              </RoleRoute>
            }
          />
          <Route
            path="/salida-qr"
            element={
              <RoleRoute roles={['ADMIN', 'EMPLEADO']}>
                <SalidaQr />
              </RoleRoute>
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
