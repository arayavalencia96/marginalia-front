export type ContentBlockType = 'NOTE' | 'STEP_LIST' | 'CODE' | 'MATH' | 'EXERCISE' | 'IMAGE'

export interface StepListBlockResponse {
  stepStyle: 'NUMERIC' | 'ALPHABETIC'
  steps: string[]
}

export interface StepListBlockRequest {
  stepStyle: 'NUMERIC' | 'ALPHABETIC'
  steps: string[]
}

export interface ContentBlockResponse {
  id: string
  chapterId: string
  type: ContentBlockType
  content: string | null
  codeLanguage: string | null
  resolved: boolean
  orderIndex: number
  stepList: StepListBlockResponse | null
  attachments: AttachmentResponse[]
}

export interface ContentBlockRequest {
  type: ContentBlockType
  content: string | null
  codeLanguage: string | null
  orderIndex: number
  stepList: StepListBlockRequest | null
}

export interface AttachmentResponse {
  id: string
  contentBlockId: string
  url: string
  sizeBytes: number
  createdAt: string
}
