import { describe, expect, it, vi } from 'vitest'

import {
  buildArticleJsonLd,
  createRootscriptClient,
  generateSitemapXml,
  getPostsByCluster,
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
            imageUrl: 'https://cdn.example.com/jane.png',
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
        imageUrl: 'https://cdn.example.com/jane.png',
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

  it('normalizes cluster metadata on post summaries', () => {
    const normalized = normalizePostSummary({
      id: 'post-1',
      slug: 'ai-search',
      title: 'AI Search',
      excerpt: 'AI search summary',
      tags: [],
      publishedAt: '2026-03-10T14:30:00Z',
      canonicalUrl: 'https://example.com/blog/ai-search',
      thumbnailUrl: 'https://cdn.example.com/ai-search.jpg',
      thumbnailAlt: 'AI search cover',
      cluster: {
        slug: 'ai-seo',
        label: 'AI SEO',
        url: 'https://example.com/blog/ai-seo',
      },
    })

    expect(normalized).toMatchObject({
      primaryCluster: 'ai-seo',
      primaryClusterUrl: 'https://example.com/blog/ai-seo',
      thumbnailUrl: 'https://cdn.example.com/ai-search.jpg',
      thumbnailAlt: 'AI search cover',
      cluster: {
        slug: 'ai-seo',
        label: 'AI SEO',
        url: 'https://example.com/blog/ai-seo',
      },
    })
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

describe('@rootscript/core cluster helpers', () => {
  it('filters posts by cluster metadata', () => {
    const posts = [
      normalizePostSummary({
        id: '1',
        slug: 'ai-seo-guide',
        title: 'AI SEO Guide',
        excerpt: 'Guide',
        tags: [],
        publishedAt: '2026-03-10T14:30:00Z',
        canonicalUrl: 'https://example.com/blog/ai-seo-guide',
        primaryCluster: 'ai-seo',
      }),
      normalizePostSummary({
        id: '2',
        slug: 'content-guide',
        title: 'Content Guide',
        excerpt: 'Guide',
        tags: [],
        publishedAt: '2026-03-11T14:30:00Z',
        canonicalUrl: 'https://example.com/blog/content-guide',
        cluster: {
          slug: 'content-marketing',
          label: 'Content Marketing',
        },
      }),
    ]

    expect(getPostsByCluster(posts, 'ai-seo').map((post) => post.slug)).toEqual([
      'ai-seo-guide',
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

  it('fetches and unwraps cluster list responses', async () => {
    const fetchMock = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          clusters: [
            {
              slug: 'ai-seo',
              label: 'AI SEO',
              description: 'Articles and guides about AI SEO.',
              url: 'https://example.com/blog/ai-seo',
              postCount: 8,
              latestPublishedAt: '2026-03-10T14:30:00Z',
            },
          ],
        }),
        { status: 200 },
      ),
    )

    const client = createRootscriptClient({
      apiBaseUrl: 'https://api.example.com/public/blog',
      apiKey: 'secret',
      fetch: fetchMock,
    })

    await expect(client.getClusters()).resolves.toEqual([
      {
        slug: 'ai-seo',
        label: 'AI SEO',
        description: 'Articles and guides about AI SEO.',
        url: 'https://example.com/blog/ai-seo',
        postCount: 8,
        latestPublishedAt: '2026-03-10T14:30:00.000Z',
      },
    ])

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/public/blog/clusters',
      expect.objectContaining({
        method: 'GET',
      }),
    )
  })

  it('fetches cluster detail responses with normalized posts', async () => {
    const fetchMock = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          cluster: {
            slug: 'ai-seo',
            label: 'AI SEO',
            description: 'Articles and guides about AI SEO.',
          },
          posts: [
            {
              id: '1',
              slug: 'ai-search',
              title: 'AI Search',
              excerpt: 'AI search summary',
              tags: [],
              publishedAt: '2026-03-10T14:30:00Z',
              canonicalUrl: 'https://example.com/blog/ai-search',
              primaryCluster: 'ai-seo',
            },
          ],
        }),
        { status: 200 },
      ),
    )

    const client = createRootscriptClient({
      apiBaseUrl: 'https://api.example.com/public/blog',
      apiKey: 'secret',
      fetch: fetchMock,
    })

    const response = await client.getCluster('ai-seo')

    expect(response?.cluster).toMatchObject({
      slug: 'ai-seo',
      label: 'AI SEO',
    })
    expect(response?.posts).toHaveLength(1)
    expect(response?.posts[0]?.primaryCluster).toBe('ai-seo')
  })

  it('returns null on 404 cluster detail responses', async () => {
    const fetchMock = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response('Not found', { status: 404 }),
    )

    const client = createRootscriptClient({
      apiBaseUrl: 'https://api.example.com/public/blog',
      apiKey: 'secret',
      fetch: fetchMock,
    })

    await expect(client.getCluster('missing-cluster')).resolves.toBeNull()
  })

  it('preserves unwrapped cluster arrays and custom endpoint options', async () => {
    const fetchMock = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            slug: 'ai-seo',
            label: 'AI SEO',
            description: 'Articles and guides about AI SEO.',
          },
        ]),
        { status: 200 },
      ),
    )

    const client = createRootscriptClient({
      apiBaseUrl: 'https://api.example.com/public/blog',
      apiKey: 'secret',
      fetch: fetchMock,
      endpoints: {
        clustersPath: '/topics',
      },
    })

    await expect(client.getClusters()).resolves.toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/public/blog/topics',
      expect.any(Object),
    )
  })

  it('normalizes nested cluster detail response shapes', async () => {
    const fetchMock = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            cluster: {
              slug: 'ai-seo',
              label: 'AI SEO',
              description: 'Articles and guides about AI SEO.',
            },
            posts: [
              {
                id: '1',
                slug: 'ai-seo-guide',
                title: 'AI SEO Guide',
                excerpt: 'Guide',
                tags: [],
                publishedAt: '2026-03-10T14:30:00Z',
                canonicalUrl: 'https://example.com/blog/ai-seo-guide',
              },
            ],
          },
        }),
        { status: 200 },
      ),
    )

    const client = createRootscriptClient({
      apiBaseUrl: 'https://api.example.com/public/blog',
      apiKey: 'secret',
      fetch: fetchMock,
    })

    await expect(client.getCluster('ai-seo')).resolves.toMatchObject({
      cluster: {
        slug: 'ai-seo',
      },
      posts: [
        {
          slug: 'ai-seo-guide',
        },
      ],
    })
  })
})
