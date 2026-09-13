export interface FileStore {
  presignUpload(key: string, contentType: string): Promise<{ url: string; expiresIn: number }>
  presignDownload(key: string, filename: string, ttlSeconds: number): Promise<string>
  head(key: string): Promise<{ sizeBytes: number; contentType: string } | null>
  delete(key: string): Promise<void>
}

export const ALLOWED_CONTENT_TYPES: readonly string[] = [
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
]
