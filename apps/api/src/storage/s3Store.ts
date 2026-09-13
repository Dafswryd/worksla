import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { env } from '../env'
import type { FileStore } from './FileStore'

const UPLOAD_TTL = 300

/**
 * Strips control characters (CR, LF, and the rest of the C0/C1 ranges), double
 * quotes, and backslashes before a filename is interpolated into the
 * Content-Disposition header value we sign into the download URL.
 *
 * Callers should already reject these characters at the API boundary (see
 * uploadInput in modules/documents/routes.ts), but a Document row written
 * before that validation existed — or reached by any other path — must not be
 * able to smuggle a header/query injection through here. This layer stands on
 * its own and never trusts that the caller validated.
 */
export function sanitizeFilenameForDisposition(filename: string): string {
  return filename.replace(/[\x00-\x1f\x7f"\\]/g, '')
}

const client = new S3Client({
  region: env.S3_REGION,
  forcePathStyle: env.S3_FORCE_PATH_STYLE,
  ...(env.S3_ENDPOINT === undefined ? {} : { endpoint: env.S3_ENDPOINT }),
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
})

export const s3Store: FileStore = {
  async presignUpload(key, contentType) {
    const command = new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: key, ContentType: contentType })
    const url = await getSignedUrl(client, command, { expiresIn: UPLOAD_TTL })
    return { url, expiresIn: UPLOAD_TTL }
  },

  async presignDownload(key, filename, ttlSeconds) {
    const command = new GetObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${sanitizeFilenameForDisposition(filename)}"`,
    })
    return getSignedUrl(client, command, { expiresIn: ttlSeconds })
  },

  async head(key) {
    try {
      const out = await client.send(new HeadObjectCommand({ Bucket: env.S3_BUCKET, Key: key }))
      return { sizeBytes: out.ContentLength ?? 0, contentType: out.ContentType ?? 'application/octet-stream' }
    } catch {
      return null
    }
  },

  async delete(key) {
    await client.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }))
  },
}
