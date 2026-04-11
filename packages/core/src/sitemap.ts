import type { RootscriptPostSummary } from './types'
import { escapeXml } from './utils'

export function generateSitemapXml(posts: RootscriptPostSummary[]): string {
  const urls = posts
    .map((post) => {
      const lastModified = post.updatedAt ?? post.publishedAt
      const lastmod = lastModified
        ? `<lastmod>${escapeXml(lastModified)}</lastmod>`
        : ''

      return [
        '  <url>',
        `    <loc>${escapeXml(post.canonicalUrl)}</loc>`,
        lastmod ? `    ${lastmod}` : '',
        '  </url>',
      ]
        .filter(Boolean)
        .join('\n')
    })
    .join('\n')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    '</urlset>',
  ].join('\n')
}

