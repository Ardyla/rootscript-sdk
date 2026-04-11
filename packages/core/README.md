# @rootscript/core

Framework-agnostic Rootscript blog client and helper utilities.

## Features

- normalized Rootscript blog types
- API client with API-key handling
- markdown and HTML content support
- configurable `/@slug` link rewriting
- deterministic related-post resolution
- JSON-LD generation
- sitemap XML generation

## Example

```ts
import { createRootscriptClient } from '@rootscript/core'

const client = createRootscriptClient({
  apiBaseUrl: 'https://api.example.com/public/blog',
  apiKey: process.env.ROOTSCRIPT_API_KEY!,
  siteBaseUrl: 'https://example.com',
  linking: {
    publicPostBasePath: '/blog',
  },
})

const posts = await client.getPosts()
const post = await client.getPost('hello-world')
```

