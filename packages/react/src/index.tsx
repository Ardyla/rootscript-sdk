import type { ComponentType, ReactNode } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import type { RootscriptPost } from '@ardyla/rootscript-core'

type LinkProps = {
  href: string
  className?: string
  children: ReactNode
}

export type RootscriptBreadcrumbItem = {
  label: string
  href?: string
}

export type RootscriptArticleProps = {
  post: Pick<RootscriptPost, 'content' | 'contentFormat' | 'title' | 'jsonLd'>
  className?: string
  markdownComponents?: Components
  includeJsonLd?: boolean
  stripLeadingTitle?: boolean
}

export type RootscriptBreadcrumbsProps = {
  items: RootscriptBreadcrumbItem[]
  className?: string
  linkClassName?: string
  currentClassName?: string
  separator?: ReactNode
  LinkComponent?: ComponentType<LinkProps>
}

export type RootscriptPostHeaderProps = {
  post: RootscriptPost
  blogHref?: string
  blogLabel?: string
  clusterBasePath?: string
  className?: string
  LinkComponent?: ComponentType<LinkProps>
}

export type RootscriptBlogPostProps = RootscriptPostHeaderProps & {
  articleClassName?: string
  markdownComponents?: Components
  includeJsonLd?: boolean
}

type DisplayAuthor = {
  name: string
  avatarUrl?: string
  imageUrl?: string
}

const DEFAULT_PROSE_CLASS = 'prose prose-lg max-w-none'

export function stripRootscriptLeadingTitle(content: string): string {
  return content
    .replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>\s*/i, '')
    .replace(/^\s*#\s+[^\n]+\n*/, '')
}

export function stripRootscriptJsonLdScripts(content: string): string {
  return content
    .replace(
      /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi,
      '',
    )
    .trim()
}

export function prepareRootscriptArticleContent(
  post: Pick<RootscriptPost, 'content'>,
  options: { stripLeadingTitle?: boolean } = {},
): string {
  const content = stripRootscriptJsonLdScripts(post.content || '')

  if (options.stripLeadingTitle === false) {
    return content
  }

  return stripRootscriptLeadingTitle(content)
}

export function RootscriptJsonLd({
  jsonLd,
}: {
  jsonLd?: Record<string, unknown>
}) {
  if (!jsonLd) {
    return null
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

export function RootscriptArticle({
  post,
  className = DEFAULT_PROSE_CLASS,
  markdownComponents,
  includeJsonLd = true,
  stripLeadingTitle = true,
}: RootscriptArticleProps) {
  const content = prepareRootscriptArticleContent(post, { stripLeadingTitle })

  return (
    <>
      {includeJsonLd && post.jsonLd ? <RootscriptJsonLd jsonLd={post.jsonLd} /> : null}
      {post.contentFormat === 'html' ? (
        <article
          className={className}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      ) : (
        <article className={className}>
          <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
        </article>
      )}
    </>
  )
}

export function buildRootscriptPostBreadcrumbs(
  post: RootscriptPost,
  options: {
    blogHref?: string
    blogLabel?: string
    clusterBasePath?: string
  } = {},
): RootscriptBreadcrumbItem[] {
  const blogHref = options.blogHref ?? '/blog'
  const clusterBasePath = (options.clusterBasePath ?? blogHref).replace(/\/+$/, '')
  const items: RootscriptBreadcrumbItem[] = [
    {
      label: options.blogLabel ?? 'Blog',
      href: blogHref,
    },
  ]

  const clusterSlug = post.cluster?.slug ?? post.primaryCluster
  const clusterLabel = post.cluster?.label ?? post.category ?? clusterSlug

  if (clusterSlug && clusterLabel) {
    items.push({
      label: clusterLabel,
      href: post.primaryClusterUrl ?? post.cluster?.url ?? `${clusterBasePath}/${clusterSlug}`,
    })
  }

  items.push({ label: post.title })

  return items
}

export function RootscriptBreadcrumbs({
  items,
  className = 'mb-8 flex flex-wrap items-center gap-2 text-xs text-muted-foreground',
  linkClassName = 'hover:text-primary',
  currentClassName = 'line-clamp-1',
  separator = '/',
  LinkComponent,
}: RootscriptBreadcrumbsProps) {
  const Link = LinkComponent ?? DefaultLink

  return (
    <nav aria-label="Breadcrumb" className={className}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1

        return (
          <span key={`${item.label}-${index}`} className="contents">
            {index > 0 ? (
              <span aria-hidden="true" className="text-muted-foreground/50">
                {separator}
              </span>
            ) : null}
            {item.href && !isLast ? (
              <Link href={item.href} className={linkClassName}>
                {item.label}
              </Link>
            ) : (
              <span aria-current={isLast ? 'page' : undefined} className={currentClassName}>
                {item.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}

export function RootscriptPostHeader({
  post,
  blogHref,
  blogLabel,
  clusterBasePath,
  className = 'mb-12',
  LinkComponent,
}: RootscriptPostHeaderProps) {
  const Link = LinkComponent ?? DefaultLink
  const authors = post.authors as DisplayAuthor[]

  return (
    <header className={className}>
      <RootscriptBreadcrumbs
        items={buildRootscriptPostBreadcrumbs(post, compactOptions({
          blogHref,
          blogLabel,
          clusterBasePath,
        }))}
        {...(LinkComponent ? { LinkComponent } : {})}
      />
      <h1 className="mb-6 text-4xl font-black leading-tight tracking-tight md:text-5xl">
        {post.title}
      </h1>
      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <span>Published {formatDate(post.publishedAt)}</span>
        <span aria-hidden="true">·</span>
        <span>Last updated {formatDate(post.updatedAt ?? post.publishedAt)}</span>
        {authors.length > 0 ? (
          <>
            <span aria-hidden="true">·</span>
            <span className="inline-flex flex-wrap items-center gap-2">
              <span>By</span>
              {authors.map((author) => {
                const image = author.avatarUrl ?? author.imageUrl

                return (
                  <span key={author.name} className="inline-flex items-center gap-1.5">
                    {image ? (
                      <img
                        src={image}
                        alt={author.name}
                        className="h-5 w-5 rounded-full object-cover"
                      />
                    ) : null}
                    <span>{author.name}</span>
                  </span>
                )
              })}
            </span>
          </>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {post.cluster?.slug || post.primaryCluster ? (
          <Link
            href={
              post.primaryClusterUrl ??
              post.cluster?.url ??
              `${(clusterBasePath ?? blogHref ?? '/blog').replace(/\/+$/, '')}/${
                post.cluster?.slug ?? post.primaryCluster
              }`
            }
            className="rounded-full border px-2.5 py-1 text-xs"
          >
            {post.cluster?.label ?? post.category ?? post.primaryCluster}
          </Link>
        ) : null}
        {post.tags.map((tag) => (
          <span key={tag} className="rounded-full border px-2.5 py-1 text-xs">
            {tag}
          </span>
        ))}
      </div>
    </header>
  )
}

export function RootscriptBlogPost({
  post,
  articleClassName = DEFAULT_PROSE_CLASS,
  markdownComponents,
  includeJsonLd = true,
  ...headerProps
}: RootscriptBlogPostProps) {
  return (
    <>
      <RootscriptPostHeader post={post} {...headerProps} />
      <RootscriptArticle
        post={post}
        className={articleClassName}
        includeJsonLd={includeJsonLd}
        {...(markdownComponents ? { markdownComponents } : {})}
      />
    </>
  )
}

function DefaultLink({ href, className, children }: LinkProps) {
  return (
    <a href={href} className={className}>
      {children}
    </a>
  )
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function compactOptions<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as Partial<T>
}
