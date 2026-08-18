import { apiClient } from '../lib/apiClient'
import type { BookPdfDownload, BookRequest, BookResponse, PdfExportStatusResponse } from '../types/book'

const exportPollIntervalMs = 1_500
const exportPollAttempts = 80

function fileNameFromDisposition(disposition: string | undefined, fallback: string): string {
  if (!disposition) return fallback
  const encodedName = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  if (encodedName) return decodeURIComponent(encodedName)
  return disposition.match(/filename="?([^";]+)"?/i)?.[1] ?? fallback
}

function bookFileName(title: string): string {
  const safeTitle = title.replace(/[<>:"/\\|?*]/g, '').trim()
  return `${safeTitle || 'Libro de Marginalia'}.pdf`
}

async function waitForExport(bookId: string, exportId: string): Promise<PdfExportStatusResponse> {
  for (let attempt = 0; attempt < exportPollAttempts; attempt += 1) {
    const { data } = await apiClient.get<PdfExportStatusResponse>(`/api/books/${bookId}/exports/${exportId}`)
    if (data.ready) return data
    if (data.status === 'FAILED') throw new Error(data.message)
    await new Promise((resolve) => window.setTimeout(resolve, exportPollIntervalMs))
  }
  throw new Error('La exportación está tardando más de lo esperado. Inténtalo nuevamente.')
}

/**
 * Retrieves the books owned by the authenticated user.
 *
 * @returns The user's books.
 */
export async function getBooks(): Promise<BookResponse[]> {
  const { data } = await apiClient.get<BookResponse[]>('/api/books')
  return data
}

/**
 * Creates a book for the authenticated user.
 *
 * @param request - The book information to persist.
 * @returns The newly created book.
 */
export async function createBook(request: BookRequest): Promise<BookResponse> {
  const { data } = await apiClient.post<BookResponse>('/api/books', request)
  return data
}

/**
 * Updates a book owned by the authenticated user.
 *
 * @param bookId - Identifier of the book to update.
 * @param request - Replacement book information.
 * @returns The updated book.
 */
export async function updateBook(bookId: string, request: BookRequest): Promise<BookResponse> {
  const { data } = await apiClient.put<BookResponse>(`/api/books/${bookId}`, request)
  return data
}

/**
 * Deletes a book and its nested content.
 *
 * @param bookId - Identifier of the book to delete.
 */
export async function deleteBook(bookId: string): Promise<void> {
  await apiClient.delete(`/api/books/${bookId}`)
}

/**
 * Generates and downloads a book PDF, polling asynchronous exports until ready.
 *
 * @param book - Identifier and title of the book to export.
 * @returns The generated PDF and its server-provided file name.
 */
export async function exportBookPdf(book: Pick<BookResponse, 'id' | 'title'>): Promise<BookPdfDownload> {
  const bookId = book.id
  const fallbackFileName = bookFileName(book.title)
  const initial = await apiClient.get<Blob>(`/api/books/${bookId}/export`, { responseType: 'blob' })
  if (initial.status === 200) {
    return {
      blob: initial.data,
      fileName: fileNameFromDisposition(initial.headers['content-disposition'], fallbackFileName),
    }
  }

  const queued = JSON.parse(await initial.data.text()) as PdfExportStatusResponse
  const status = await waitForExport(bookId, queued.exportId)
  const completed = await apiClient.get<Blob>(
    status.downloadUrl ?? `/api/books/${bookId}/exports/${queued.exportId}/download`,
    { responseType: 'blob' },
  )
  return {
    blob: completed.data,
    fileName: fileNameFromDisposition(completed.headers['content-disposition'], fallbackFileName),
  }
}
