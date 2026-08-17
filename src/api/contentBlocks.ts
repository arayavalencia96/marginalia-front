import { apiClient } from '../lib/apiClient'
import type { AttachmentResponse, ContentBlockRequest, ContentBlockResponse } from '../types/contentBlock'

export async function getChapterBlocks(chapterId: string): Promise<ContentBlockResponse[]> {
  const { data } = await apiClient.get<ContentBlockResponse[]>(`/api/chapters/${chapterId}/blocks`)
  return data
}

export async function createContentBlock(chapterId: string, request: ContentBlockRequest): Promise<ContentBlockResponse> {
  const { data } = await apiClient.post<ContentBlockResponse>(`/api/chapters/${chapterId}/blocks`, request)
  return data
}

export async function updateContentBlock(blockId: string, request: ContentBlockRequest): Promise<ContentBlockResponse> {
  const { data } = await apiClient.put<ContentBlockResponse>(`/api/blocks/${blockId}`, request)
  return data
}

export async function deleteContentBlock(blockId: string): Promise<void> {
  await apiClient.delete(`/api/blocks/${blockId}`)
}

export async function toggleContentBlockResolved(blockId: string): Promise<ContentBlockResponse> {
  const { data } = await apiClient.patch<ContentBlockResponse>(`/api/blocks/${blockId}/resolve`)
  return data
}

export async function uploadBlockAttachment(
  blockId: string,
  file: File,
  onProgress: (percentage: number) => void,
): Promise<AttachmentResponse> {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await apiClient.post<AttachmentResponse>(`/api/blocks/${blockId}/attachments`, formData, {
    onUploadProgress: (event) => {
      if (event.total) onProgress(Math.round((event.loaded / event.total) * 100))
    },
  })
  return data
}
