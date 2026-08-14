import { NextRequest } from 'next/server'
import { z } from 'zod'
import { BadRequestError } from './errors'

/**
 * Reads and validates a JSON body.
 *
 * Zod replaces the `class-validator` DTOs the NestJS build used. The schemas are
 * plain values rather than decorated classes, which means they work in route
 * handlers without `reflect-metadata` and can be shared with client-side forms.
 *
 * A ZodError thrown from here is caught by the route wrapper and rendered as a
 * 400 with the same message array Nest's ValidationPipe produced.
 */
export async function parseBody<S extends z.ZodTypeAny>(
  req: NextRequest,
  schema: S,
): Promise<z.infer<S>> {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    throw new BadRequestError('Request body must be valid JSON')
  }
  return schema.parse(raw)
}

/** Validates the query string. Every value arrives as a string — coerce in the schema. */
export function parseQuery<S extends z.ZodTypeAny>(req: NextRequest, schema: S): z.infer<S> {
  const params: Record<string, string> = {}
  req.nextUrl.searchParams.forEach((value, key) => {
    params[key] = value
  })
  return schema.parse(params)
}

export interface ParsedForm<S extends z.ZodTypeAny> {
  fields: z.infer<S>
  file: File | null
}

/**
 * Reads a multipart form: scalar fields validated by `schema`, plus one upload.
 *
 * This is what replaces multer and `FileInterceptor`. The platform gives us
 * `File` objects directly, so there is no disk staging and no temp directory to
 * clean up — the bytes go straight to Cloudinary.
 *
 * Empty strings are dropped before validation. A browser submits an untouched
 * text input as `""`, and treating that as "clear this field" would wipe values
 * the user never edited.
 */
export async function parseForm<S extends z.ZodTypeAny>(
  req: NextRequest,
  schema: S,
  fileField: string,
): Promise<ParsedForm<S>> {
  let form: FormData
  try {
    form = await req.formData()
  } catch {
    throw new BadRequestError('Expected a multipart form body')
  }

  const fields: Record<string, string> = {}
  let file: File | null = null

  for (const [key, value] of form.entries()) {
    if (value instanceof File) {
      if (key === fileField && value.size > 0) file = value
      continue
    }
    if (value !== '') fields[key] = value
  }

  return { fields: schema.parse(fields), file }
}

/**
 * Shared coercions. Multipart and query strings deliver everything as text, so
 * numbers and booleans need converting before they are validated.
 */
export const numeric = z.coerce.number()
export const optionalNumeric = z.coerce.number().optional()
export const boolish = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .transform((v) => v === true || v === 'true' || v === '1')
