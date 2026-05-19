import type { RootscriptPost } from '@ardyla/rootscript-core'

export type RootscriptMetadata = {
  title: string
  description?: string
  alternates?: {
    canonical?: string
  }
  openGraph?: Record<string, unknown>
  twitter?: Record<string, unknown>
}

export type RootscriptPostMetadataOptions = {
  siteName?: string
  titleSuffix?: string
  siteBaseUrl?: string
  fallbackDescription?: string
}

export function buildRootscriptPostMetadata(
  post: RootscriptPost,
  options: RootscriptPostMetadataOptions = {},
): RootscriptMetadata {
  const siteName = options.siteName ?? 'Rootscript'
  const titleSuffix = options.titleSuffix ?? ` | ${siteName}`
  const title = post.title.endsWith(titleSuffix)
    ? post.title
    : `${post.title}${titleSuffix}`
  const description = truncateDescription(
    toPlainText(post.excerpt) ||
      options.fallbackDescription ||
      `Read ${post.title}.`,
  )
  const canonical = resolveCanonical(post, options.siteBaseUrl)
  const imageUrl = resolveImageUrl(post, options.siteBaseUrl)
  const images = imageUrl
    ? [
        {
          url: imageUrl,
          alt: post.title,
        },
      ]
    : undefined

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName,
      type: 'article',
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt ?? post.publishedAt,
      tags: post.tags,
      images,
    },
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
  }
}

export function buildRootscriptBreadcrumbJsonLd(
  post: RootscriptPost,
  options: {
    siteBaseUrl: string
    blogPath?: string
    blogLabel?: string
  },
): Record<string, unknown> {
  const blogPath = options.blogPath ?? '/blog'
  const blogUrl = joinUrl(options.siteBaseUrl, blogPath)
  const items = [
    {
      '@type': 'ListItem',
      position: 1,
      name: options.blogLabel ?? 'Blog',
      item: blogUrl,
    },
  ]
  const clusterSlug = post.cluster?.slug ?? post.primaryCluster
  const clusterLabel = post.cluster?.label ?? post.category ?? clusterSlug

  if (clusterSlug && clusterLabel) {
    items.push({
      '@type': 'ListItem',
      position: items.length + 1,
      name: clusterLabel,
      item: post.primaryClusterUrl ?? post.cluster?.url ?? joinUrl(blogUrl, clusterSlug),
    })
  }

  items.push({
    '@type': 'ListItem',
    position: items.length + 1,
    name: post.title,
    item: resolveCanonical(post, options.siteBaseUrl),
  })

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  }
}

export function buildRootscriptPostJsonLd(
  post: RootscriptPost,
  options: {
    siteBaseUrl?: string
  } = {},
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: toPlainText(post.excerpt),
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': resolveCanonical(post, options.siteBaseUrl),
    },
    url: resolveCanonical(post, options.siteBaseUrl),
    ...(post.coverImage ? { image: resolveMaybeAbsolute(post.coverImage, options.siteBaseUrl) } : {}),
    ...(post.tags.length > 0 ? { keywords: post.tags.join(', ') } : {}),
    ...(post.jsonLd ?? {}),
  }
}

function resolveCanonical(post: RootscriptPost, siteBaseUrl?: string): string {
  return resolveMaybeAbsolute(post.canonicalUrl, siteBaseUrl)
}

function resolveImageUrl(post: RootscriptPost, siteBaseUrl?: string): string | undefined {
  const image = post.thumbnailUrl ?? post.coverImage
  return image ? resolveMaybeAbsolute(image, siteBaseUrl) : undefined
}

function resolveMaybeAbsolute(value: string, siteBaseUrl?: string): string {
  if (/^https?:\/\//i.test(value) || !siteBaseUrl) {
    return value
  }

  return joinUrl(siteBaseUrl, value)
}

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
}

function toPlainText(value?: string): string {
  return (value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function truncateDescription(value: string, maxLength = 160): string {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}...`
}
