import { v2 as cloudinary } from 'cloudinary'
import { BadRequestError, HttpError } from '../http/errors'

/**
 * Image storage for uploads (org logos, product images, avatars).
 *
 * Configuration comes from `CLOUDINARY_URL`
 * (cloudinary://<api_key>:<api_secret>@<cloud_name>), which the SDK reads from
 * the environment on its own. Uploads return a `secure_url` that is stored
 * verbatim on the record.
 *
 * Remote storage rather than local disk, because a Next.js deployment has no
 * filesystem that survives past a single request.
 */

const ROOT_FOLDER = 'molla-enterprise'
const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5 MB

const IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/svg+xml',
])

cloudinary.config({ secure: true })

/**
 * Validates an upload and stores it under `molla-enterprise/<folder>`, returning
 * its public https URL.
 *
 * The file arrives as a web `File` from `request.formData()`, so the bytes are
 * read here rather than staged on disk by middleware first.
 */
export async function uploadImage(file: File, folder: string): Promise<string> {
  if (!file || file.size === 0) {
    throw new BadRequestError('File is empty')
  }
  if (!IMAGE_TYPES.has(file.type)) {
    throw new BadRequestError('Unsupported file type. Allowed: JPG, PNG, WebP, GIF, AVIF, SVG.')
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new HttpError(413, 'File too large. Max 5 MB.')
  }
  if (!process.env.CLOUDINARY_URL) {
    throw new HttpError(500, 'CLOUDINARY_URL is not configured')
  }

  // Cloudinary's uploader accepts a base64 data URI.
  const bytes = Buffer.from(await file.arrayBuffer())
  const dataUri = `data:${file.type};base64,${bytes.toString('base64')}`

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: `${ROOT_FOLDER}/${folder}`,
    resource_type: 'image',
  })

  return result.secure_url
}

/** Deletes a previously uploaded image by URL. No-op for anything not ours. */
export async function removeImage(url?: string | null): Promise<void> {
  if (!url) return
  const publicId = publicIdFromUrl(url)
  if (!publicId) return
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' })
  } catch {
    // Clearing the old asset is best-effort — never fail the request over it.
  }
}

/**
 * Extracts the public id from a Cloudinary URL, e.g.
 * https://res.cloudinary.com/<cloud>/image/upload/v123/molla-enterprise/products/x.jpg
 *   → molla-enterprise/products/x
 * Returns null for anything else, including the legacy `/uploads/...` paths.
 */
function publicIdFromUrl(url: string): string | null {
  const match = url.match(
    /res\.cloudinary\.com\/[^/]+\/image\/upload\/(?:v\d+\/)?(.+?)(?:\.[^./]+)?$/,
  )
  return match ? match[1] : null
}
