import { apiClient } from '../lib/apiClient'
import type { ChapterRequest, ChapterResponse } from '../types/chapter'

function fileNameFromDisposition(disposition: string | undefined, fallback: string): string {
  if (!disposition) return fallback
  const encodedName = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  if (encodedName) return decodeURIComponent(encodedName)
  return disposition.match(/filename="?([^";]+)"?/i)?.[1] ?? fallback
}

function chapterFileName(title: string): string {
  const safeTitle = title.replace(/[<>:"/\\|?*]/g, '').trim()
  return `${safeTitle || 'Capítulo de Marginalia'}.pdf`
}

/**
 * Retrieves a book's chapters as a flat list.
 *
 * @param bookId - The identifier of the owning book.
 * @returns The chapters ordered by the API response.
 */
export async function getBookChapters(bookId: string): Promise<ChapterResponse[]> {
  const { data } = await apiClient.get<ChapterResponse[]>(`/api/books/${bookId}/chapters`)
  return data
}

/**
 * Creates a chapter within a book.
 *
 * @param bookId - The identifier of the owning book.
 * @param request - The chapter title, parent, and ordering data.
 * @returns The created chapter.
 */
export async function createChapter(bookId: string, request: ChapterRequest): Promise<ChapterResponse> {
  const { data } = await apiClient.post<ChapterResponse>(`/api/books/${bookId}/chapters`, request)
  return data
}

/**
 * Updates a chapter's title, parent, or ordering data.
 *
 * @param chapterId - The identifier of the chapter to update.
 * @param request - The replacement chapter data.
 * @returns The updated chapter.
 */
export async function updateChapter(chapterId: string, request: ChapterRequest): Promise<ChapterResponse> {
  const { data } = await apiClient.put<ChapterResponse>(`/api/chapters/${chapterId}`, request)
  return data
}

/**
 * Deletes a chapter.
 *
 * @param chapterId - The identifier of the chapter to delete.
 * @returns A promise that resolves when deletion completes.
 */
export async function deleteChapter(chapterId: string): Promise<void> {
  await apiClient.delete(`/api/chapters/${chapterId}`)
}

/**
 * Generates and downloads the selected chapter and its nested chapters as a PDF.
 *
 * @param chapter - The chapter to export.
 * @returns The generated document and its server-provided file name.
 */
export async function exportChapterPdf(chapter: Pick<ChapterResponse, 'id' | 'title'>): Promise<{ blob: Blob; fileName: string }> {
  const { data, headers } = await apiClient.get<Blob>(`/api/chapters/${chapter.id}/export`, { responseType: 'blob' })
  return {
    blob: data,
    fileName: fileNameFromDisposition(headers['content-disposition'], chapterFileName(chapter.title)),
  }
}
