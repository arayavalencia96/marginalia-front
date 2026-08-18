import { apiClient } from '../lib/apiClient'
import type { AttachmentResponse, ContentBlockRequest, ContentBlockResponse } from '../types/contentBlock'

/**
 * Retrieves the ordered content blocks of a chapter.
 *
 * @param chapterId - The identifier of the owning chapter.
 * @returns The chapter's content blocks.
 */
export async function getChapterBlocks(chapterId: string): Promise<ContentBlockResponse[]> {
  const { data } = await apiClient.get<ContentBlockResponse[]>(`/api/chapters/${chapterId}/blocks`)
  return data
}

/**
 * Creates a content block in a chapter.
 *
 * @param chapterId - The identifier of the owning chapter.
 * @param request - The block type and data to persist.
 * @returns The created content block.
 */
export async function createContentBlock(chapterId: string, request: ContentBlockRequest): Promise<ContentBlockResponse> {
  const { data } = await apiClient.post<ContentBlockResponse>(`/api/chapters/${chapterId}/blocks`, request)
  return data
}

/**
 * Replaces the editable data of a content block.
 *
 * @param blockId - The identifier of the content block to update.
 * @param request - The replacement block data.
 * @returns The updated content block.
 */
export async function updateContentBlock(blockId: string, request: ContentBlockRequest): Promise<ContentBlockResponse> {
  const { data } = await apiClient.put<ContentBlockResponse>(`/api/blocks/${blockId}`, request)
  return data
}

/**
 * Deletes a content block.
 *
 * @param blockId - The identifier of the block to delete.
 * @returns A promise that resolves when deletion completes.
 */
export async function deleteContentBlock(blockId: string): Promise<void> {
  await apiClient.delete(`/api/blocks/${blockId}`)
}

/**
 * Toggles an exercise block's resolved state.
 *
 * @param blockId - The identifier of the exercise block.
 * @returns The block with its updated resolved state.
 */
export async function toggleContentBlockResolved(blockId: string): Promise<ContentBlockResponse> {
  const { data } = await apiClient.patch<ContentBlockResponse>(`/api/blocks/${blockId}/resolve`)
  return data
}

/**
 * Uploads a file attachment for an image content block.
 *
 * @param blockId - The identifier of the owning content block.
 * @param file - The image file to upload.
 * @param onProgress - Receives the upload completion percentage from 0 to 100.
 * @returns The persisted attachment metadata.
 */
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
