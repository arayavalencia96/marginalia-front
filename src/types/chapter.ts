export interface ChapterResponse {
  id: string
  bookId: string
  title: string
  parentChapterId: string | null
  orderIndex: number
}

export interface ChapterRequest {
  title: string
  parentChapterId: string | null
  orderIndex: number
}
