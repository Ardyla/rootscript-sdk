import { describe, expect, it, vi } from 'vitest'

import {
  buildArticleJsonLd,
  createRootscriptClient,
  generateSitemapXml,
  normalizePost,
  normalizePostSummary,
  resolveRelatedPosts,
  rewriteContentLinks,
} from '../src'

describe('@rootscript/core normalization', () => {
  it('normalizes legacy post payloads into the public contract', () => {
    const normalized = normalizePost(
      {
        _id: 123,
        title: 'Launch Day',
        topic: 'launch-day',
        summary: 'Launch summary',
        tags: 'Product, Launch',
        authors: [
          {
            full_name: 'Jane Doe',
            avatar_url: 'https://cdn.example.com/jane.png',
          },
        ],
        createdAt: '2024-01-15T10:00:00Z',
        canonical_url: 'https://example.com/blog/launch-day',
        html_content: '# Launch Day\n\nRead the [follow-up](/@launch-follow-up).',
        related_slugs: ['launch-follow-up'],
      },
      {
        siteBaseUrl: 'https://example.com',
        linking: { publicPostBasePath: '/blog' },
      },
    )

    expect(normalized).toMatchObject({
      id: '123',
      slug: 'launch-day',
      title: 'Launch Day',
      excerpt: 'Launch summary',
      tags: ['Product', 'Launch'],
      publishedAt: '2024-01-15T10:00:00.000Z',
      canonicalUrl: 'https://example.com/blog/launch-day',
      content: '# Launch Day\n\nRead the [follow-up](/@launch-follow-up).',
      contentFormat: 'markdown',
      relatedSlugs: ['launch-follow-up'],
    })

    expect(normalized.authors).toEqual([
      {
        name: 'Jane Doe',
        avatarUrl: 'https://cdn.example.com/jane.png',
      },
    ])
  })

  it('derives canonical URLs and slugs from config when legacy fields are missing', () => {
    const normalized = normalizePostSummary(
      {
        id: 'post-1',
        title: 'Edge Runtime Patterns',
        excerpt: 'Patterns for server rendering',
        tags: ['Next.js'],
        published_at: '2024-02-02T09:00:00Z',
      },
      {
        siteBaseUrl: 'https://blog.example.com',
        linking: {
          publicPostBasePath: '/articles',
        },
      },
    )

    expect(normalized.slug).toBe('edge-runtime-patterns')
    expect(normalized.canonicalUrl).toBe(
      'https://blog.example.com/articles/edge-runtime-patterns',
    )
  })
})

describe('@rootscript/core link rewriting', () => {
  it('rewrites markdown and html internal slug links', () => {
    const markdown = rewriteContentLinks(
      '[Read more](/@deep-dive#section)\n\n<a href="/@launch-day?ref=nav">Launch</a>',
      'markdown',
      {
        publicPostBasePath: '/blog',
      },
    )

    expect(markdown).toContain('[Read more](/blog/deep-dive#section)')
    expect(markdown).toContain('<a href="/blog/launch-day?ref=nav">Launch</a>')
  })

  it('honors a custom href resolver', () => {
    const html = rewriteContentLinks('<a href="/@sdk-post">SDK</a>', 'html', {
      resolveHref: (slug) => `/writing/${slug}`,
    })

    expect(html).toBe('<a href="/writing/sdk-post">SDK</a>')
  })
})

describe('@rootscript/core related posts', () => {
  it('prioritizes explicit related slugs before heuristic matches', () => {
    const source = normalizePost({
      id: '1',
      slug: 'react-sdk',
      title: 'Build a React SDK',
      excerpt: 'Patterns for reusable UI kits',
      tags: ['React', 'SDK'],
      publishedAt: '2024-03-01T10:00:00Z',
      canonicalUrl: 'https://example.com/blog/react-sdk',
      content: 'Body',
      contentFormat: 'markdown',
      relatedSlugs: ['angular-sdk'],
    })

    const related = resolveRelatedPosts(
      source,
      [
        normalizePostSummary({
          id: '2',
          slug: 'angular-sdk',
          title: 'Build an Angular SDK',
          excerpt: 'Angular services and components',
          tags: ['Angular', 'SDK'],
          publishedAt: '2024-03-05T10:00:00Z',
          canonicalUrl: 'https://example.com/blog/angular-sdk',
        }),
        normalizePostSummary({
          id: '3',
          slug: 'react-rendering',
          title: 'React Rendering Patterns',
          excerpt: 'Rendering patterns for React component libraries',
          tags: ['React'],
          publishedAt: '2024-03-04T10:00:00Z',
          canonicalUrl: 'https://example.com/blog/react-rendering',
        }),
      ],
      { maxCount: 2 },
    )

    expect(related.map((post) => post.slug)).toEqual([
      'angular-sdk',
      'react-rendering',
    ])
  })
})

describe('@rootscript/core structured output helpers', () => {
  it('builds article json-ld from normalized posts', () => {
    const post = normalizePost({
      id: '1',
      slug: 'sdk-launch',
      title: 'SDK Launch',
      excerpt: 'How the SDK launched',
      tags: ['Launch', 'SDK'],
      authors: [{ name: 'Jane Doe', id: 'author-1' }],
      publishedAt: '2024-04-01T08:00:00Z',
      updatedAt: '2024-04-02T08:00:00Z',
      canonicalUrl: 'https://example.com/blog/sdk-launch',
      content: 'Hello',
      contentFormat: 'markdown',
    })

    const jsonLd = buildArticleJsonLd(post)

    expect(jsonLd).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'SDK Launch',
      datePublished: '2024-04-01T08:00:00.000Z',
      dateModified: '2024-04-02T08:00:00.000Z',
      url: 'https://example.com/blog/sdk-launch',
    })
  })

  it('generates sitemap xml from canonical URLs', () => {
    const xml = generateSitemapXml([
      normalizePostSummary({
        id: '1',
        slug: 'sdk-launch',
        title: 'SDK Launch',
        excerpt: 'How the SDK launched',
        tags: [],
        publishedAt: '2024-04-01T08:00:00Z',
        canonicalUrl: 'https://example.com/blog/sdk-launch',
      }),
    ])

    expect(xml).toContain('<loc>https://example.com/blog/sdk-launch</loc>')
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
  })
})

describe('@rootscript/core client', () => {
  it('fetches, unwraps, and rewrites API responses', async () => {
    const fetchMock = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              posts: [
                {
                  id: '1',
                  title: 'Launch Day',
                  slug: 'launch-day',
                  excerpt: 'Launch summary',
                  tags: ['Launch'],
                  publishedAt: '2024-01-15T10:00:00Z',
                  canonicalUrl: 'https://example.com/blog/launch-day',
                },
              ],
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            post: {
              id: '1',
              title: 'Launch Day',
              slug: 'launch-day',
              excerpt: 'Launch summary',
              tags: ['Launch'],
              publishedAt: '2024-01-15T10:00:00Z',
              canonicalUrl: 'https://example.com/blog/launch-day',
              html_content: 'Read [follow-up](/@next-post).',
            },
          }),
          { status: 200 },
        ),
      )

    const client = createRootscriptClient({
      apiBaseUrl: 'https://api.example.com/public/blog',
      apiKey: 'secret',
      fetch: fetchMock,
      linking: {
        publicPostBasePath: '/blog',
      },
      cache: {
        strategy: 'revalidate',
        revalidateSeconds: 120,
      },
    })

    const posts = await client.getPosts()
    const post = await client.getPost('launch-day')

    expect(posts).toHaveLength(1)
    expect(post?.content).toBe('Read [follow-up](/blog/next-post).')

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://api.example.com/public/blog/posts',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer secret',
          'x-api-key': 'secret',
        }),
        cache: 'force-cache',
        next: {
          revalidate: 120,
        },
      }),
    )
  })

  it('returns null on 404 detail responses', async () => {
    const fetchMock = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response('Not found', { status: 404 }),
    )

    const client = createRootscriptClient({
      apiBaseUrl: 'https://api.example.com/public/blog',
      apiKey: 'secret',
      fetch: fetchMock,
    })

    await expect(client.getPost('missing-post')).resolves.toBeNull()
  })
})
