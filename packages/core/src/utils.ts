import type { RootscriptLinkingOptions } from './types'

export type UnknownRecord = Record<string, unknown>

const DEFAULT_PUBLIC_POST_BASE_PATH = '/blog'

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function asString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
  }

  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value)
  }

  return undefined
}

export function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((entry) => {
        if (typeof entry === 'string') {
          return splitCommaList(entry)
        }

        if (isRecord(entry)) {
          return [
            asString(entry.name) ??
              asString(entry.slug) ??
              asString(entry.label) ??
              '',
          ]
        }

        return []
      })
      .map((entry) => entry.trim())
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    return splitCommaList(value)
  }

  return []
}

function splitCommaList(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

export function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

export function uniqueBySlug<T extends { slug: string }>(values: T[]): T[] {
  const seen = new Set<string>()
  const result: T[] = []

  for (const value of values) {
    if (seen.has(value.slug)) {
      continue
    }

    seen.add(value.slug)
    result.push(value)
  }

  return result
}

export function pickFirstString(
  record: UnknownRecord,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = asString(record[key])
    if (value) {
      return value
    }
  }

  return undefined
}

export function pickFirstValue(
  record: UnknownRecord,
  keys: string[],
): unknown | undefined {
  for (const key of keys) {
    const value = record[key]
    if (value !== undefined && value !== null) {
      return value
    }
  }

  return undefined
}

export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function stripHtml(value: string): string {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function createExcerpt(value: string, maxLength = 180): string {
  const collapsed = stripHtml(value)

  if (collapsed.length <= maxLength) {
    return collapsed
  }

  return `${collapsed.slice(0, maxLength).trimEnd()}…`
}

export function normalizeDateString(value: unknown): string | undefined {
  const raw = asString(value)
  if (!raw) {
    return undefined
  }

  const timestamp = Date.parse(raw)
  if (Number.isNaN(timestamp)) {
    return undefined
  }

  return new Date(timestamp).toISOString()
}

export function isLikelyHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value)
}

export function joinUrl(base: string, path: string): string {
  const normalizedBase = base.replace(/\/+$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${normalizedBase}${normalizedPath}`
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function normalizePath(value: string): string {
  if (!value.startsWith('/')) {
    return `/${value}`
  }

  return value
}

export function resolvePublicPostHref(
  slug: string,
  linking?: RootscriptLinkingOptions,
): string {
  if (linking?.resolveHref) {
    return linking.resolveHref(slug)
  }

  const basePath = normalizePath(
    linking?.publicPostBasePath ?? DEFAULT_PUBLIC_POST_BASE_PATH,
  ).replace(/\/+$/, '')

  return `${basePath}/${slug}`
}

export function resolveCanonicalUrl(
  slug: string,
  siteBaseUrl: string | undefined,
  linking?: RootscriptLinkingOptions,
): string {
  const href = resolvePublicPostHref(slug, linking)

  if (/^https?:\/\//i.test(href)) {
    return href
  }

  if (!siteBaseUrl) {
    return href
  }

  return joinUrl(siteBaseUrl, href)
}

export function readSlugFromUrl(value: string): string | undefined {
  try {
    const url = new URL(value)
    const parts = url.pathname.split('/').filter(Boolean)
    return parts.at(-1)
  } catch {
    const parts = value.split('/').filter(Boolean)
    return parts.at(-1)
  }
}

export function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3)
}

export function parseTargetWithSuffix(
  target: string,
  internalSlugPrefix: string,
): { slug: string; suffix: string } | null {
  if (!target.startsWith(internalSlugPrefix)) {
    return null
  }

  const remainder = target.slice(internalSlugPrefix.length)
  const match = remainder.match(/^([a-z0-9][a-z0-9/_-]*)(.*)$/i)
  if (!match?.[1]) {
    return null
  }

  return {
    slug: match[1].replace(/^\/+/, ''),
    suffix: match[2] ?? '',
  }
}

