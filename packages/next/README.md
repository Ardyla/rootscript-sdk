# @rootscript/next

Next.js helpers for Rootscript blog pages.

## Metadata

```ts
import { buildRootscriptPostMetadata } from '@rootscript/next'

export async function generateMetadata({ params }) {
  const post = await rootscript.getPost(params.slug)

  if (!post) {
    return { title: 'Blog post not found' }
  }

  return buildRootscriptPostMetadata(post, {
    siteName: 'Example',
    siteBaseUrl: 'https://example.com',
  })
}
```

## Structured Data

```tsx
import {
  buildRootscriptBreadcrumbJsonLd,
  buildRootscriptPostJsonLd,
} from '@rootscript/next'

const articleJsonLd = buildRootscriptPostJsonLd(post, {
  siteBaseUrl: 'https://example.com',
})
const breadcrumbJsonLd = buildRootscriptBreadcrumbJsonLd(post, {
  siteBaseUrl: 'https://example.com',
})
```

Use these helpers with `RootscriptBlogPost` from `@rootscript/react` for the full page render flow.
