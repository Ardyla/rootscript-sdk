# @rootscript/react

React components for rendering full Rootscript blog posts.

## Install

```bash
npm install @rootscript/react @ardyla/rootscript-core react-markdown
```

For Tailwind typography styles, install and enable `@tailwindcss/typography`.

## Article Rendering

```tsx
import { RootscriptBlogPost } from '@rootscript/react'

export function BlogPostPage({ post }) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <RootscriptBlogPost
        post={post}
        articleClassName="prose prose-lg max-w-none"
      />
    </main>
  )
}
```

`RootscriptBlogPost`:

- uses `post.contentFormat` to render markdown with `react-markdown` or HTML with `dangerouslySetInnerHTML`
- strips a duplicate leading `<h1>` or markdown `# Title`
- removes JSON-LD script blocks from content
- renders `post.jsonLd` as `application/ld+json`
- renders breadcrumbs, title, publish/update metadata, authors, cluster, and tags

## Composable Exports

- `RootscriptArticle`
- `RootscriptJsonLd`
- `RootscriptBreadcrumbs`
- `RootscriptPostHeader`
- `RootscriptBlogPost`
- `prepareRootscriptArticleContent`
- `stripRootscriptLeadingTitle`
- `stripRootscriptJsonLdScripts`
- `buildRootscriptPostBreadcrumbs`
