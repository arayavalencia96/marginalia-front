export type ContentBlockType = 'NOTE' | 'HEADING' | 'STEP_LIST' | 'CODE' | 'MATH' | 'EXERCISE' | 'QUESTION_ANSWER' | 'IMAGE'
export type HeadingLevel = 'TITLE' | 'SUBTITLE'
export type StepStyle = 'NUMERIC' | 'ALPHABETIC' | 'BULLETED'

export interface StepListBlockResponse {
  stepStyle: StepStyle
  steps: string[]
}

export interface StepListBlockRequest {
  stepStyle: StepStyle
  steps: string[]
}

export interface ContentBlockResponse {
  id: string
  chapterId: string
  type: ContentBlockType
  content: string | null
  answer?: string | null
  description?: string | null
  headingLevel?: HeadingLevel | null
  codeLanguage: string | null
  resolved: boolean
  orderIndex: number
  stepList: StepListBlockResponse | null
  attachments: AttachmentResponse[]
}

export interface ContentBlockRequest {
  type: ContentBlockType
  content: string | null
  answer?: string | null
  description?: string | null
  headingLevel: HeadingLevel | null
  codeLanguage: string | null
  orderIndex: number
  stepList: StepListBlockRequest | null
}

export interface ContentBlockOrderRequest {
  blockId: string
  orderIndex: number
}

export interface AttachmentResponse {
  id: string
  contentBlockId: string
  url: string
  sizeBytes: number
  createdAt: string
}
