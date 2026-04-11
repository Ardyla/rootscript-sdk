# rootscript-sdk

Rootscript SDK is a pnpm-workspace monorepo for a public blog SDK that targets:

- `@rootscript/core`
- `@rootscript/react`
- `@rootscript/next`
- `@rootscript/angular`

This first phase scaffolds the monorepo and fully implements `@rootscript/core`.

## Current Structure

```text
rootscript-sdk/
  packages/
    angular/
    core/
    next/
    react/
  examples/
    angular-blog/
    next-blog/
    react-blog/
```

## Core Scope

`@rootscript/core` provides:

- public TypeScript types
- a framework-agnostic API client
- normalization that hides legacy API inconsistencies
- configurable internal link rewriting
- related-post resolution
- JSON-LD helpers
- sitemap generation

## Install

```bash
pnpm install
pnpm --filter @rootscript/core test
```

If `pnpm` is not already available locally, enable it with Corepack first.

## Contract Notes

The core package normalizes legacy API responses into a clean public shape:

- `slug` is always present in normalized output
- `content` and `contentFormat` replace legacy `html_content`
- `publishedAt` prefers a real publish date and falls back to legacy creation fields
- `canonicalUrl` is always populated, using API data first and SDK config as fallback
- internal `/@slug` links are rewritten through configurable linking rules
