export const bookTopics = ['PROGRAMMING', 'MATH', 'SCIENCE', 'HISTORY', 'OTHER'] as const

export type BookTopic = (typeof bookTopics)[number]

export interface BookRequest {
  title: string
  author: string
  topic: BookTopic
}

export interface BookResponse extends BookRequest {
  id: string
  userId: string
  createdAt: string
}
