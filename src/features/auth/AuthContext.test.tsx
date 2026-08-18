import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { ProtectedRoute } from '../../components/ProtectedRoute'
import { useAuth } from '../../hooks/useAuth'
import { authTokenStore } from '../../lib/authTokenStore'
import { server } from '../../test/server'
import { AuthProvider } from './AuthContext'

const accessToken = `header.${btoa(JSON.stringify({ sub: 'user-1', email: 'reader@example.com' }))}.signature`

function SessionUser() {
  const { user } = useAuth()
  return <p>{user?.email}</p>
}

function renderProtectedSession() {
  return render(
    <MemoryRouter initialEntries={['/books']}>
      <AuthProvider>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/books" element={<SessionUser />} />
          </Route>
          <Route path="/login" element={<p>Login page</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('AuthProvider session restoration', () => {
  beforeEach(() => authTokenStore.clear())

  it('restores an authenticated session from the refresh cookie', async () => {
    server.use(http.post('*/api/auth/refresh', () => HttpResponse.json({ accessToken })))

    renderProtectedSession()

    expect(screen.getByRole('status')).toHaveTextContent('Restaurando sesión...')
    expect(await screen.findByText('reader@example.com')).toBeInTheDocument()
    expect(authTokenStore.getAccessToken()).toBe(accessToken)
  })

  it('redirects to login after session restoration fails', async () => {
    server.use(http.post('*/api/auth/refresh', () => new HttpResponse(null, { status: 401 })))

    renderProtectedSession()

    expect(await screen.findByText('Login page')).toBeInTheDocument()
    expect(authTokenStore.getAccessToken()).toBeUndefined()
  })
})
