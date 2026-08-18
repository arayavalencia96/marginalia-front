export const bookTopics = [
  'PROGRAMMING',
  'FINANCE_INVESTING',
  'PSYCHOLOGY',
  'PERSONAL_GROWTH',
  'BUSINESS_ENTREPRENEURSHIP',
  'LANGUAGES',
  'PHILOSOPHY',
  'HEALTH_SPORTS',
  'FICTION',
  'BIOGRAPHY',
  'LAW',
  'MATH',
  'SCIENCE',
  'HISTORY',
  'OTHER',
] as const

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

export type PdfExportStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

export interface PdfExportStatusResponse {
  exportId: string
  status: PdfExportStatus
  ready: boolean
  message: string
  downloadUrl: string | null
}

export interface BookPdfDownload {
  blob: Blob
  fileName: string
}
