# @ardyla/rootscript-core

Rootscript Headless Blog API client for fetching published Rootscript content in custom frontends and integrations.

## Quick Start

```bash
npm install @ardyla/rootscript-core
```

```ts
import { createRootscriptClient } from '@ardyla/rootscript-core'

const client = createRootscriptClient({
  apiBaseUrl: 'https://rootscript.io/api/v1/blog',
  apiKey: process.env.ROOTSCRIPT_API_KEY!,
  siteBaseUrl: 'https://example.com',
})

const posts = await client.getPosts()
const post = await client.getPost('hello-world')
```

## API Basics

- Base URL: `https://rootscript.io/api/v1/blog`
- Auth: `Authorization: Bearer <api_key>`
- Access control: API keys are tied to allowed origins, with CORS enforced
- Caching: edge cached, `s-maxage=60`, `stale-while-revalidate=300`

The client also sends `x-api-key` for compatibility with the Rootscript API.

## Endpoints

### `GET /posts`

Returns a lightweight list of published posts.

Typical fields:

- `id`
- `slug`
- `title`
- `excerpt`
- `tags`
- `authors`
- `publishedAt`
- `updatedAt`
- `canonicalUrl`
- `coverImage`

Example response:

```json
[
  {
    "id": "post_123",
    "slug": "hello-world",
    "title": "Hello World",
    "excerpt": "A short summary of the post.",
    "tags": ["release", "updates"],
    "authors": [{ "name": "Rootscript" }],
    "publishedAt": "2026-04-14T00:00:00.000Z",
    "updatedAt": "2026-04-14T12:00:00.000Z",
    "canonicalUrl": "https://example.com/blog/hello-world",
    "coverImage": "https://cdn.example.com/hello-world.jpg"
  }
]
```

### `GET /posts/:slug`

Returns the full post payload for a single post.

Adds:

- `content`
- `contentFormat`
- `jsonLd`
- `relatedSlugs`

Example response:

```json
{
  "id": "post_123",
  "slug": "hello-world",
  "title": "Hello World",
  "excerpt": "A short summary of the post.",
  "tags": ["release", "updates"],
  "authors": [{ "name": "Rootscript" }],
  "publishedAt": "2026-04-14T00:00:00.000Z",
  "updatedAt": "2026-04-14T12:00:00.000Z",
  "canonicalUrl": "https://example.com/blog/hello-world",
  "coverImage": "https://cdn.example.com/hello-world.jpg",
  "content": "<p>Hello world</p>",
  "contentFormat": "html",
  "jsonLd": {
    "@context": "https://schema.org",
    "@type": "Article"
  },
  "relatedSlugs": ["second-post", "third-post"]
}
```

## Response Reference

| Field | Description |
| --- | --- |
| `id` | Stable post identifier. |
| `slug` | URL slug for the post. |
| `title` | Post title. |
| `excerpt` | Short summary used in listing views. |
| `tags` | String tags associated with the post. |
| `authors` | Array of author summaries. |
| `publishedAt` | Publication timestamp. |
| `updatedAt` | Last updated timestamp, when available. |
| `canonicalUrl` | Public URL for the post. |
| `coverImage` | Optional cover image URL. |
| `content` | Full content for single post responses. |
| `contentFormat` | Either `markdown` or `html`. |
| `jsonLd` | Structured data payload for SEO. |
| `relatedSlugs` | Related post slug suggestions. |

## Client Options

```ts
createRootscriptClient({
  apiBaseUrl: 'https://rootscript.io/api/v1/blog',
  apiKey: '...',
  siteBaseUrl: 'https://example.com',
  cache: {
    strategy: 'revalidate',
    revalidateSeconds: 60,
  },
  linking: {
    publicPostBasePath: '/blog',
    internalSlugPrefix: '/@',
  },
  endpoints: {
    postsPath: '/posts',
    postPath: (slug) => `/posts/${slug}`,
  },
})
```

Supported client methods:

- `getPosts()`
- `getPost(slug)`
- `getRelatedPosts(post, allPosts?)`
- `rewriteContentLinks(content, contentFormat)`
- `buildJsonLd(post)`
- `generateSitemapXml(posts)`

## Framework Examples

### Next.js

```ts
import { createRootscriptClient } from '@ardyla/rootscript-core'

export const rootscript = createRootscriptClient({
  apiBaseUrl: process.env.ROOTSCRIPT_API_BASE_URL!,
  apiKey: process.env.ROOTSCRIPT_API_KEY!,
  siteBaseUrl: process.env.NEXT_PUBLIC_SITE_URL!,
  cache: {
    strategy: 'revalidate',
    revalidateSeconds: 60,
  },
})

const posts = await rootscript.getPosts()
```

### React

Use the client in your data layer or server-side loader, then pass the normalized posts into components.

```ts
import { createRootscriptClient } from '@ardyla/rootscript-core'

const rootscript = createRootscriptClient({
  apiBaseUrl: 'https://rootscript.io/api/v1/blog',
  apiKey: process.env.ROOTSCRIPT_API_KEY!,
  siteBaseUrl: 'https://example.com',
})

const post = await rootscript.getPost('hello-world')
```

### Angular

Inject the client in a service and keep API access behind your app boundary.

```ts
import { createRootscriptClient } from '@ardyla/rootscript-core'

const rootscript = createRootscriptClient({
  apiBaseUrl: 'https://rootscript.io/api/v1/blog',
  apiKey: environment.rootscriptApiKey,
  siteBaseUrl: environment.siteUrl,
})
```

## Notes

- `apiBaseUrl` should point at your Rootscript API root, not an example placeholder URL.
- The client normalizes legacy response shapes into a stable public contract.
- `getPost(slug)` returns `null` for a missing post.
- The package is framework-agnostic and can be used from SSR, server actions, API routes, jobs, or custom services.
