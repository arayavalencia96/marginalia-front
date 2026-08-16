import { apiClient } from '../lib/apiClient'
import type { ChapterRequest, ChapterResponse } from '../types/chapter'

export async function getBookChapters(bookId: string): Promise<ChapterResponse[]> {
  const { data } = await apiClient.get<ChapterResponse[]>(`/api/books/${bookId}/chapters`)
  return data
}

export async function createChapter(bookId: string, request: ChapterRequest): Promise<ChapterResponse> {
  const { data } = await apiClient.post<ChapterResponse>(`/api/books/${bookId}/chapters`, request)
  return data
}

export async function updateChapter(chapterId: string, request: ChapterRequest): Promise<ChapterResponse> {
  const { data } = await apiClient.put<ChapterResponse>(`/api/chapters/${chapterId}`, request)
  return data
}

export async function deleteChapter(chapterId: string): Promise<void> {
  await apiClient.delete(`/api/chapters/${chapterId}`)
}
