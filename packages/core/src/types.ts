export type RootscriptContentFormat = 'markdown' | 'html'

export type RootscriptAuthorSummary = {
  id?: string
  name: string
  avatarUrl?: string
  bio?: string
}

export type RootscriptPostSummary = {
  id: string
  slug: string
  title: string
  excerpt: string
  tags: string[]
  authors: RootscriptAuthorSummary[]
  publishedAt: string
  updatedAt?: string
  canonicalUrl: string
  coverImage?: string
}

export type RootscriptPost = RootscriptPostSummary & {
  content: string
  contentFormat: RootscriptContentFormat
  relatedSlugs?: string[]
  jsonLd?: Record<string, unknown>
}

export type RootscriptCacheStrategy = 'no-store' | 'force-cache' | 'revalidate'

export type RootscriptCacheOptions = {
  strategy?: RootscriptCacheStrategy
  revalidateSeconds?: number
}

export type RootscriptLinkingOptions = {
  internalSlugPrefix?: string
  publicPostBasePath?: string
  resolveHref?: (slug: string) => string
}

export type RootscriptRelatedPostsOptions = {
  maxCount?: number
}

export type RootscriptEndpointOptions = {
  postsPath?: string
  postPath?: (slug: string) => string
}

export type RootscriptClientOptions = {
  apiBaseUrl: string
  apiKey: string
  siteBaseUrl?: string
  fetch?: typeof globalThis.fetch
  cache?: RootscriptCacheOptions
  linking?: RootscriptLinkingOptions
  relatedPosts?: RootscriptRelatedPostsOptions
  endpoints?: RootscriptEndpointOptions
}

export type RootscriptNormalizationOptions = {
  siteBaseUrl?: string | undefined
  linking?: RootscriptLinkingOptions | undefined
}

export type RootscriptClient = {
  getPosts(): Promise<RootscriptPostSummary[]>
  getPost(slug: string): Promise<RootscriptPost | null>
  getRelatedPosts(
    post: RootscriptPost,
    allPosts?: RootscriptPostSummary[],
  ): Promise<RootscriptPostSummary[]>
  rewriteContentLinks(
    content: string,
    contentFormat: RootscriptContentFormat,
  ): string
  buildJsonLd(post: RootscriptPost): Record<string, unknown>
  generateSitemapXml(posts: RootscriptPostSummary[]): string
}
