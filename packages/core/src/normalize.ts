import type {
  RootscriptAuthorSummary,
  RootscriptContentFormat,
  RootscriptNormalizationOptions,
  RootscriptPost,
  RootscriptPostSummary,
} from './types'
import {
  asString,
  asStringArray,
  createExcerpt,
  isLikelyHtml,
  isRecord,
  normalizeDateString,
  pickFirstString,
  pickFirstValue,
  readSlugFromUrl,
  resolveCanonicalUrl,
  slugify,
  uniqueStrings,
  type UnknownRecord,
} from './utils'

const CONTENT_FORMAT_KEYS = ['contentFormat', 'content_format', 'format']
const TITLE_KEYS = ['title', 'headline', 'name', 'topic']
const EXCERPT_KEYS = ['excerpt', 'summary', 'description', 'meta_description']
const COVER_IMAGE_KEYS = [
  'coverImage',
  'cover_image',
  'cover',
  'image',
  'image_url',
  'heroImage',
]
const CANONICAL_URL_KEYS = ['canonicalUrl', 'canonical_url', 'url', 'permalink']
const PUBLISHED_AT_KEYS = [
  'publishedAt',
  'published_at',
  'publishDate',
  'publish_date',
  'published_on',
  'datePublished',
  'createdAt',
  'created_at',
]
const UPDATED_AT_KEYS = [
  'updatedAt',
  'updated_at',
  'modifiedAt',
  'modified_at',
  'lastModified',
]
const CONTENT_KEYS = [
  'content',
  'markdown',
  'markdown_content',
  'html',
  'html_content',
  'body',
]

export function normalizePostSummary(
  input: unknown,
  options: RootscriptNormalizationOptions = {},
): RootscriptPostSummary {
  const record = ensureRecord(input)
  const title = pickFirstString(record, TITLE_KEYS) ?? 'Untitled post'
  const explicitSlug = pickFirstString(record, ['slug', 'canonicalSlug'])
  const rawCanonicalUrl = pickFirstString(record, CANONICAL_URL_KEYS)
  const fallbackSlugSource =
    readSlugFromUrl(rawCanonicalUrl ?? '') ??
    pickFirstString(record, ['topic', 'title', 'headline'])
  const slug = slugify(explicitSlug ?? fallbackSlugSource ?? title)

  const excerpt =
    pickFirstString(record, EXCERPT_KEYS) ??
    createExcerpt(extractContentValue(record) ?? title)

  const publishedAt =
    normalizeDateString(pickFirstValue(record, PUBLISHED_AT_KEYS)) ??
    new Date(0).toISOString()
  const updatedAt = normalizeDateString(pickFirstValue(record, UPDATED_AT_KEYS))
  const coverImage = pickFirstString(record, COVER_IMAGE_KEYS)
  const canonicalUrl =
    rawCanonicalUrl ??
    resolveCanonicalUrl(slug, options.siteBaseUrl, options.linking)
  const tags = normalizeTags(record)
  const authors = normalizeAuthors(record)
  const id =
    pickFirstString(record, ['id', '_id', 'uuid']) ??
    pickFirstString(record, ['postId', 'post_id']) ??
    slug

  return {
    id,
    slug,
    title,
    excerpt,
    tags,
    authors,
    publishedAt,
    ...(updatedAt ? { updatedAt } : {}),
    canonicalUrl,
    ...(coverImage ? { coverImage } : {}),
  }
}

export function normalizePost(
  input: unknown,
  options: RootscriptNormalizationOptions = {},
): RootscriptPost {
  const record = ensureRecord(input)
  const summary = normalizePostSummary(record, options)
  const rawContent = extractContentValue(record) ?? ''
  const contentFormat = detectContentFormat(record, rawContent)
  const relatedSlugs = normalizeRelatedSlugs(record)
  const jsonLd = isRecord(record.jsonLd)
    ? (record.jsonLd as Record<string, unknown>)
    : isRecord(record.json_ld)
      ? (record.json_ld as Record<string, unknown>)
      : undefined

  return {
    ...summary,
    content: rawContent,
    contentFormat,
    ...(relatedSlugs.length > 0 ? { relatedSlugs } : {}),
    ...(jsonLd ? { jsonLd } : {}),
  }
}

export function detectContentFormat(
  input: unknown,
  content: string,
): RootscriptContentFormat {
  const record = ensureRecord(input)
  const explicitFormat = pickFirstString(record, CONTENT_FORMAT_KEYS)?.toLowerCase()

  if (explicitFormat === 'markdown' || explicitFormat === 'md') {
    return 'markdown'
  }

  if (explicitFormat === 'html') {
    return 'html'
  }

  if (asString(record.markdown) || asString(record.markdown_content)) {
    return 'markdown'
  }

  if (asString(record.html) || asString(record.html_content)) {
    return isLikelyHtml(content) ? 'html' : 'markdown'
  }

  return isLikelyHtml(content) ? 'html' : 'markdown'
}

export function extractContentValue(record: UnknownRecord): string | undefined {
  return pickFirstString(record, CONTENT_KEYS)
}

function normalizeTags(record: UnknownRecord): string[] {
  const tags = uniqueStrings(
    asStringArray(
      pickFirstValue(record, ['tags', 'tag_list', 'categories', 'category_names']),
    ),
  )

  if (tags.length > 0) {
    return tags
  }

  const topic = asString(record.topic)
  return topic ? [topic] : []
}

function normalizeAuthors(record: UnknownRecord): RootscriptAuthorSummary[] {
  const rawAuthors = pickFirstValue(record, ['authors', 'author_list'])

  if (Array.isArray(rawAuthors)) {
    return rawAuthors
      .map((entry) => normalizeAuthor(entry))
      .filter((entry): entry is RootscriptAuthorSummary => Boolean(entry))
  }

  const singleAuthor = pickFirstValue(record, ['author', 'creator'])
  const normalizedSingle = normalizeAuthor(singleAuthor)
  if (normalizedSingle) {
    return [normalizedSingle]
  }

  const authorName = pickFirstString(record, [
    'authorName',
    'author_name',
    'creatorName',
  ])

  return authorName ? [{ name: authorName }] : []
}

function normalizeAuthor(value: unknown): RootscriptAuthorSummary | null {
  if (typeof value === 'string') {
    return { name: value }
  }

  if (!isRecord(value)) {
    return null
  }

  const name =
    pickFirstString(value, ['name', 'fullName', 'full_name', 'displayName']) ??
    pickFirstString(value, ['slug', 'username'])

  if (!name) {
    return null
  }

  const id = pickFirstString(value, ['id', '_id', 'uuid'])
  const avatarUrl = pickFirstString(value, [
    'avatarUrl',
    'avatar_url',
    'avatar',
    'image',
  ])
  const bio = pickFirstString(value, ['bio', 'description'])

  return {
    ...(id ? { id } : {}),
    name,
    ...(avatarUrl ? { avatarUrl } : {}),
    ...(bio ? { bio } : {}),
  }
}

function normalizeRelatedSlugs(record: UnknownRecord): string[] {
  const related = asStringArray(
    pickFirstValue(record, ['relatedSlugs', 'related_slugs', 'relatedPosts']),
  )
  return uniqueStrings(related.map((entry) => slugify(entry)))
}

function ensureRecord(input: unknown): UnknownRecord {
  if (isRecord(input)) {
    return input
  }

  return {}
}

