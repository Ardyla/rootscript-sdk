import type { RootscriptPost } from './types'

export function buildArticleJsonLd(post: RootscriptPost): Record<string, unknown> {
  const authors = post.authors.map((author) => ({
    '@type': 'Person',
    name: author.name,
    ...(author.id ? { identifier: author.id } : {}),
  }))

  const base: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': post.canonicalUrl,
    },
    url: post.canonicalUrl,
    ...(authors.length > 0 ? { author: authors.length === 1 ? authors[0] : authors } : {}),
    ...(post.coverImage ? { image: post.coverImage } : {}),
    ...(post.tags.length > 0 ? { keywords: post.tags.join(', ') } : {}),
  }

  return {
    ...base,
    ...(post.jsonLd ?? {}),
  }
}

