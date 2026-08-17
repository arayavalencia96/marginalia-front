import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { SiteLayout } from './components/SiteLayout'
import { AuthProvider } from './features/auth/AuthContext'
import { AccountSettingsPage } from './features/auth/AccountSettingsPage'
import { BooksListPage } from './features/books/BooksListPage'
import { BookDetailPage } from './features/books/BookDetailPage'
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage'
import { GoodbyePage } from './features/auth/GoodbyePage'
import { LoginPage } from './features/auth/LoginPage'
import { OAuthCallbackPage } from './features/auth/OAuthCallbackPage'
import { RegisterPage } from './features/auth/RegisterPage'
import { ResetPasswordPage } from './features/auth/ResetPasswordPage'
import { VerifyAccountPage } from './features/auth/VerifyAccountPage'
import { queryClient } from './lib/queryClient'
import { LegalPage } from './pages/LegalPage'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route element={<SiteLayout />}>
              <Route
                path="/"
                element={
                  <main className="grid min-h-screen place-items-center">
                    <h1 className="text-4xl font-semibold">Marginalia</h1>
                  </main>
                }
              />
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
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
