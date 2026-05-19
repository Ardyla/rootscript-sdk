import type { RootscriptBlogCluster, RootscriptPostSummary } from './types'
import { joinUrl, normalizePath, slugify } from './utils'

export function getPostsByCluster(
  posts: RootscriptPostSummary[],
  clusterSlug: string,
): RootscriptPostSummary[] {
  const normalizedClusterSlug = slugify(clusterSlug)

  return posts.filter((post) => {
    const candidates = [
      post.primaryCluster,
      post.cluster?.slug,
      post.category,
    ].filter((value): value is string => Boolean(value))

    return candidates.some((value) => slugify(value) === normalizedClusterSlug)
  })
}

export function getClusterUrl(
  cluster: Pick<RootscriptBlogCluster, 'slug' | 'url'>,
  fallbackBasePath = '/blog',
): string {
  if (cluster.url) {
    return cluster.url
  }

  return `${normalizePath(fallbackBasePath).replace(/\/+$/, '')}/${cluster.slug}`
}

export function buildClusterJsonLd(
  cluster: RootscriptBlogCluster,
  posts: RootscriptPostSummary[],
  siteBaseUrl: string,
): Record<string, unknown> {
  const url = /^https?:\/\//i.test(getClusterUrl(cluster))
    ? getClusterUrl(cluster)
    : joinUrl(siteBaseUrl, getClusterUrl(cluster))

  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: cluster.label,
    description: cluster.description,
    url,
    mainEntity: {
      '@type': 'Blog',
      name: cluster.label,
      blogPost: posts.map((post) => ({
        '@type': 'BlogPosting',
        headline: post.title,
        url: post.canonicalUrl,
        datePublished: post.publishedAt,
      })),
    },
  }
}
