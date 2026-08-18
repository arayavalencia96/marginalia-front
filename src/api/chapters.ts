import { apiClient } from '../lib/apiClient'
import type { ChapterRequest, ChapterResponse } from '../types/chapter'

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
