import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { authTokenStore } from '../../lib/authTokenStore'
import { server } from '../../test/server'
import { AuthProvider } from './AuthContext'
import { LoginPage } from './LoginPage'

const accessToken = `header.${btoa(JSON.stringify({ sub: 'user-1', email: 'reader@example.com' }))}.signature`

function renderLoginPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider><LoginPage /></AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    authTokenStore.clear()
    server.use(http.post('*/api/auth/refresh', () => new HttpResponse(null, { status: 401 })))
  })

  it('shows validation errors before submitting invalid credentials', async () => {
    const user = userEvent.setup()
    renderLoginPage()

    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(await screen.findByText('El correo electrónico es obligatorio.')).toBeInTheDocument()
    expect(screen.getByText('La contraseña debe tener al menos 8 caracteres.')).toBeInTheDocument()
  })

  it('submits valid credentials and stores the returned access token', async () => {
    let receivedBody: unknown
    server.use(
      http.post('*/api/auth/login', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ accessToken })
      }),
      http.get('*/api/users/me', () => HttpResponse.json({
        id: 'user-1',
        email: 'reader@example.com',
        username: 'reader',
        passwordConfigured: true,
      })),
    )
    const user = userEvent.setup()
    renderLoginPage()

    await user.type(screen.getByLabelText('Correo electrónico'), 'reader@example.com')
    await user.type(screen.getByLabelText('Contraseña'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    await waitFor(() => expect(receivedBody).toEqual({ email: 'reader@example.com', password: 'password123' }))
    expect(authTokenStore.getAccessToken()).toBe(accessToken)
  })
})
