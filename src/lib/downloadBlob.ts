/**
 * Triggers a browser download for an in-memory file and releases its temporary URL.
 *
 * @param blob - File contents to download.
 * @param fileName - File name suggested to the browser.
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}
