import { describe, expect, it } from 'vitest'
import { buildStorageKey } from '../src/modules/documents/service'
import { s3Store, sanitizeFilenameForDisposition } from '../src/storage/s3Store'

describe('buildStorageKey', () => {
  it('membersihkan nama berkas dan menyisipkan uuid', () => {
    const key = buildStorageKey('Surat Tugas (draf).pdf')
    expect(key).toMatch(/^submissions\/\d{4}\/\d{2}\/[0-9a-f-]{36}\/surat-tugas-draf\.pdf$/)
  })

  it('tidak pernah menghasilkan traversal', () => {
    const key = buildStorageKey('../../etc/passwd')
    expect(key).not.toContain('..')
  })

  it('dua berkas bernama sama menghasilkan kunci berbeda', () => {
    expect(buildStorageKey('a.pdf')).not.toBe(buildStorageKey('a.pdf'))
  })
})

describe('sanitizeFilenameForDisposition', () => {
  it('membuang CR, LF, kutip, dan backslash agar tak bisa menyuntik header', () => {
    // This is exactly what the old `.replace(/"/g, '')`-only implementation
    // failed to catch: the quote is stripped but \r\n survive untouched,
    // which is enough to inject an extra header/query value into the signed
    // response-content-disposition. This test must fail against that old
    // implementation.
    const injected = 'nota\r\nX-Injected: 1".pdf'
    const result = sanitizeFilenameForDisposition(injected)

    expect(result).not.toMatch(/[\r\n"\\]/)
    expect(result).toBe('notaX-Injected: 1.pdf')
  })
})

describe('s3Store terhadap MinIO', () => {
  it('bisa menulis lewat presigned PUT lalu membacanya kembali', async () => {
    const key = buildStorageKey('uji.pdf')
    const { url } = await s3Store.presignUpload(key, 'application/pdf')

    const body = Buffer.from('%PDF-1.4 halo')
    const put = await fetch(url, { method: 'PUT', body, headers: { 'Content-Type': 'application/pdf' } })
    expect(put.ok).toBe(true)

    const meta = await s3Store.head(key)
    expect(meta?.sizeBytes).toBe(body.byteLength)

    const download = await s3Store.presignDownload(key, 'uji.pdf', 60)
    const got = await fetch(download)
    expect(await got.text()).toBe('%PDF-1.4 halo')

    await s3Store.delete(key)
    expect(await s3Store.head(key)).toBeNull()
  })

  it('head mengembalikan null untuk kunci yang tidak ada', async () => {
    expect(await s3Store.head('submissions/2026/01/tidak/ada.pdf')).toBeNull()
  })
})
