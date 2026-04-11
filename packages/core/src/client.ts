import { buildArticleJsonLd } from './json-ld'
import { rewriteContentLinks } from './links'
import { normalizePost, normalizePostSummary } from './normalize'
import { resolveRelatedPosts } from './related'
import { generateSitemapXml } from './sitemap'
import type {
  RootscriptClient,
  RootscriptClientOptions,
  RootscriptPost,
  RootscriptPostSummary,
} from './types'
import { isRecord, joinUrl, uniqueBySlug, type UnknownRecord } from './utils'

const DEFAULT_POSTS_PATH = '/posts'

type ExtendedRequestInit = RequestInit & {
  next?: {
    revalidate: number
  }
}

export function createRootscriptClient(
  options: RootscriptClientOptions,
): RootscriptClient {
  const fetchImpl = options.fetch ?? globalThis.fetch

  if (!fetchImpl) {
    throw new Error(
      'Rootscript client requires a fetch implementation. Pass options.fetch when fetch is not globally available.',
    )
  }

  const getPosts = async (): Promise<RootscriptPostSummary[]> => {
    const payload = await getJson(fetchImpl, options, resolvePostsPath(options))
    const records = unwrapCollection(payload)

    return uniqueBySlug(
      records.map((record) =>
        normalizePostSummary(record, {
          siteBaseUrl: options.siteBaseUrl,
          linking: options.linking,
        }),
      ),
    )
  }

  const getPost = async (slug: string): Promise<RootscriptPost | null> => {
    const path = resolvePostPath(options, slug)
    const payload = await getJson(fetchImpl, options, path, true)

    if (payload === null) {
      return null
    }

    const rawPost = unwrapSingle(payload)
    if (!rawPost) {
      return null
    }

    const normalizedPost = normalizePost(rawPost, {
      siteBaseUrl: options.siteBaseUrl,
      linking: options.linking,
    })

    return {
      ...normalizedPost,
      content: rewriteContentLinks(
        normalizedPost.content,
        normalizedPost.contentFormat,
        options.linking,
      ),
    }
  }

  return {
    getPosts,
    getPost,

    async getRelatedPosts(post: RootscriptPost, allPosts?: RootscriptPostSummary[]) {
      const posts = allPosts ?? (await getPosts())
      return resolveRelatedPosts(post, posts, options.relatedPosts)
    },

    rewriteContentLinks(content, contentFormat) {
      return rewriteContentLinks(content, contentFormat, options.linking)
    },

    buildJsonLd(post) {
      return buildArticleJsonLd(post)
    },

    generateSitemapXml(posts) {
      return generateSitemapXml(posts)
    },
  }
}

async function getJson(
  fetchImpl: typeof globalThis.fetch,
  options: RootscriptClientOptions,
  path: string,
  allowNotFound = false,
): Promise<unknown | null> {
  const response = await fetchImpl(joinUrl(options.apiBaseUrl, path), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${options.apiKey}`,
      'x-api-key': options.apiKey,
    },
    ...buildRequestInit(options),
  } satisfies ExtendedRequestInit)

  if (allowNotFound && response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(`Rootscript API request failed with ${response.status}`)
  }

  return response.json()
}

function buildRequestInit(options: RootscriptClientOptions): ExtendedRequestInit {
  const strategy = options.cache?.strategy

  if (strategy === 'revalidate') {
    return {
      cache: 'force-cache',
      next: {
        revalidate: options.cache?.revalidateSeconds ?? 60,
      },
    }
  }

  if (strategy === 'no-store' || strategy === 'force-cache') {
    return {
      cache: strategy,
    }
  }

  return {}
}

function resolvePostsPath(options: RootscriptClientOptions): string {
  return options.endpoints?.postsPath ?? DEFAULT_POSTS_PATH
}

function resolvePostPath(options: RootscriptClientOptions, slug: string): string {
  if (options.endpoints?.postPath) {
    return options.endpoints.postPath(slug)
  }

  return `${resolvePostsPath(options).replace(/\/+$/, '')}/${encodeURIComponent(slug)}`
}

function unwrapCollection(payload: unknown): UnknownRecord[] {
  if (Array.isArray(payload)) {
    return payload.filter(isRecord)
  }

  if (!isRecord(payload)) {
    return []
  }

  const directArrayKeys = ['posts', 'items', 'results', 'data']

  for (const key of directArrayKeys) {
    const value = payload[key]
    if (Array.isArray(value)) {
      return value.filter(isRecord)
    }

    if (isRecord(value)) {
      const nested = unwrapCollection(value)
      if (nested.length > 0) {
        return nested
      }
    }
  }

  return []
}

function unwrapSingle(payload: unknown): UnknownRecord | null {
  if (isRecord(payload)) {
    const directObjectKeys = ['post', 'item', 'data']

    for (const key of directObjectKeys) {
      const value = payload[key]
      if (isRecord(value)) {
        return value
      }
    }

    return payload
  }

  return null
}
