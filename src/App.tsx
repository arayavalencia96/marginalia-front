import { QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppToaster } from './components/AppToaster'
import { SiteLayout } from './components/SiteLayout'
import { AuthProvider } from './features/auth/AuthContext'
import { queryClient } from './lib/queryClient'
import { LegalPage } from './pages/LegalPage'
import { HomePage } from './pages/HomePage'

const AccountSettingsPage = lazy(() => import('./features/auth/AccountSettingsPage').then(({ AccountSettingsPage }) => ({ default: AccountSettingsPage })))
const BookDetailPage = lazy(() => import('./features/books/BookDetailPage').then(({ BookDetailPage }) => ({ default: BookDetailPage })))
const BooksListPage = lazy(() => import('./features/books/BooksListPage').then(({ BooksListPage }) => ({ default: BooksListPage })))
const ForgotPasswordPage = lazy(() => import('./features/auth/ForgotPasswordPage').then(({ ForgotPasswordPage }) => ({ default: ForgotPasswordPage })))
const GoodbyePage = lazy(() => import('./features/auth/GoodbyePage').then(({ GoodbyePage }) => ({ default: GoodbyePage })))
const LoginPage = lazy(() => import('./features/auth/LoginPage').then(({ LoginPage }) => ({ default: LoginPage })))
const OAuthCallbackPage = lazy(() => import('./features/auth/OAuthCallbackPage').then(({ OAuthCallbackPage }) => ({ default: OAuthCallbackPage })))
const RegisterPage = lazy(() => import('./features/auth/RegisterPage').then(({ RegisterPage }) => ({ default: RegisterPage })))
const ResetPasswordPage = lazy(() => import('./features/auth/ResetPasswordPage').then(({ ResetPasswordPage }) => ({ default: ResetPasswordPage })))
const VerifyAccountPage = lazy(() => import('./features/auth/VerifyAccountPage').then(({ VerifyAccountPage }) => ({ default: VerifyAccountPage })))

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status">
      <span className="text-sm text-slate-600 dark:text-stone-300">Cargando...</span>
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppToaster />
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route element={<SiteLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/goodbye" element={<GoodbyePage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/verify" element={<VerifyAccountPage />} />
                <Route path="/terms" element={<LegalPage title="Términos y condiciones" description="Información legal sobre el uso de Marginalia." />} />
                <Route path="/privacy" element={<LegalPage title="Política de privacidad" description="Información sobre cómo Marginalia trata tus datos personales." />} />
                <Route path="/cookies" element={<LegalPage title="Política de cookies" description="Información sobre el uso de cookies y tecnologías similares." />} />
                <Route element={<ProtectedRoute />}>
                  <Route path="/books" element={<BooksListPage />} />
                  <Route path="/books/:bookId" element={<BookDetailPage />} />
                  <Route path="/account" element={<AccountSettingsPage />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
