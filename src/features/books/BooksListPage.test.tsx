import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../test/renderWithProviders'
import { server } from '../../test/server'
import { BooksListPage } from './BooksListPage'

const downloadBlobMock = vi.hoisted(() => vi.fn())

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'reader@example.com' } }),
}))

vi.mock('../../lib/downloadBlob', () => ({ downloadBlob: downloadBlobMock }))

const book = {
  id: 'book-1',
  title: 'Effective Java',
  author: 'Joshua Bloch',
  topic: 'PROGRAMMING' as const,
  userId: 'user-1',
  createdAt: '2026-08-17T00:00:00Z',
}

describe('BooksListPage book actions', () => {
  beforeEach(() => downloadBlobMock.mockReset())

  it('edits and deletes an owned book with confirmation', async () => {
    const user = userEvent.setup()
    const updates: unknown[] = []
    let deletedBookId: string | undefined
    let currentBook = book
    server.use(
      http.get('*/api/books', () => HttpResponse.json(deletedBookId ? [] : [currentBook])),
      http.put('*/api/books/:bookId', async ({ params, request }) => {
        const body = await request.json() as { title: string; author: string; topic: typeof book.topic }
        updates.push(body)
        currentBook = { ...currentBook, ...body, id: String(params.bookId) }
        return HttpResponse.json(currentBook)
      }),
      http.delete('*/api/books/:bookId', ({ params }) => {
        deletedBookId = String(params.bookId)
        return new HttpResponse(null, { status: 204 })
      }),
    )

    renderWithProviders(<BooksListPage />)
    expect(await screen.findByText('Effective Java')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Editar' }))
    const title = screen.getByLabelText('Título')
    await user.clear(title)
    await user.type(title, 'Effective Java, 3rd Edition')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => expect(updates).toEqual([{
      title: 'Effective Java, 3rd Edition',
      author: 'Joshua Bloch',
      topic: 'PROGRAMMING',
    }]))
    expect(await screen.findByText('Effective Java, 3rd Edition')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Eliminar' }))
    expect(screen.getByText(/También se eliminarán sus capítulos/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Eliminar definitivamente' }))

    await waitFor(() => expect(deletedBookId).toBe('book-1'))
  })

  it('downloads a synchronously generated PDF', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('*/api/books', () => HttpResponse.json([book])),
      http.get('*/api/books/book-1/export', () => new HttpResponse(new Blob(['pdf']), {
        headers: {
          'Content-Type': 'application/pdf',
        },
      })),
    )

    renderWithProviders(<BooksListPage />)
    await user.click(await screen.findByRole('button', { name: 'Exportar PDF' }))

    await waitFor(() => expect(downloadBlobMock).toHaveBeenCalledWith(expect.any(Blob), 'Effective Java.pdf'))
  })
})
