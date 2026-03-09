/**
 * Flare CMS CollectionSchema to Astro Zod Schema Converter
 *
 * Converts Flare CMS collection schemas into Zod object schemas
 * compatible with Astro's Content Layer API.
 */
import { z } from 'astro/zod'
import type { CollectionSchema, FieldConfig } from '@flare-cms/core'

/**
 * Map of Flare CMS field types to Zod schema constructors.
 * Each entry returns a fresh Zod type instance.
 */
const FIELD_TYPE_MAP: Record<string, () => z.ZodTypeAny> = {
  string: () => z.string(),
  number: () => z.number(),
  boolean: () => z.boolean(),
  date: () => z.coerce.date(),
  datetime: () => z.coerce.date(),
  email: () => z.string().email(),
  url: () => z.string().url(),
  richtext: () => z.string(),
  markdown: () => z.string(),
  quill: () => z.string(),
  tinymce: () => z.string(),
  mdxeditor: () => z.string(),
  textarea: () => z.string(),
  json: () => z.unknown(),
  select: () => z.string(),
  multiselect: () => z.array(z.string()),
  checkbox: () => z.boolean(),
  radio: () => z.string(),
  slug: () => z.string(),
  color: () => z.string(),
  media: () => z.string(),
  file: () => z.string(),
  reference: () => z.string(),
  array: () => z.array(z.unknown()),
  object: () => z.record(z.unknown()),
}

/**
 * Convert a Flare CMS field config to a Zod schema type.
 * Handles select enum refinement.
 */
function fieldToZod(field: FieldConfig): z.ZodTypeAny {
  // Select with enum values gets z.enum() instead of z.string()
  if (field.type === 'select' && field.enum && field.enum.length > 0) {
    return z.enum(field.enum as [string, ...string[]])
  }

  return FIELD_TYPE_MAP[field.type]?.() ?? z.string()
}

/**
 * Convert a Flare CMS CollectionSchema into a Zod object schema
 * compatible with Astro's Content Layer defineCollection().
 *
 * - Maps all Flare field types to appropriate Zod types
 * - Respects the `required` array for optional/required marking
 * - Adds system fields (_status, _createdAt, _updatedAt)
 *
 * @param schema - A Flare CMS CollectionSchema
 * @returns A Zod object schema
 */
export function flareSchemaToZod(schema: CollectionSchema): z.ZodObject<any> {
  const shape: Record<string, z.ZodTypeAny> = {}
  const requiredFields = new Set(schema.required ?? [])

  for (const [key, field] of Object.entries(schema.properties)) {
    const zodField = fieldToZod(field)

    if (requiredFields.has(key)) {
      shape[key] = zodField
    } else {
      shape[key] = zodField.optional().nullable()
    }
  }

  // System fields (always optional — CMS manages these)
  shape._status = z.string().optional()
  shape._createdAt = z.coerce.date().optional()
  shape._updatedAt = z.coerce.date().optional()

  return z.object(shape)
}
