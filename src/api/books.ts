import { apiClient } from '../lib/apiClient'
import type { BookRequest, BookResponse } from '../types/book'

export async function getBooks(): Promise<BookResponse[]> {
  const { data } = await apiClient.get<BookResponse[]>('/api/books')
  return data
}

export async function createBook(request: BookRequest): Promise<BookResponse> {
  const { data } = await apiClient.post<BookResponse>('/api/books', request)
  return data
}
