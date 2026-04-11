import type { RootscriptContentFormat, RootscriptLinkingOptions } from './types'
import {
  escapeRegExp,
  parseTargetWithSuffix,
  resolvePublicPostHref,
} from './utils'

const DEFAULT_INTERNAL_SLUG_PREFIX = '/@'

export function rewriteContentLinks(
  content: string,
  contentFormat: RootscriptContentFormat,
  linking?: RootscriptLinkingOptions,
): string {
  if (!content) {
    return content
  }

  const internalSlugPrefix =
    linking?.internalSlugPrefix ?? DEFAULT_INTERNAL_SLUG_PREFIX

  const rewriteTarget = (target: string): string => {
    const parsed = parseTargetWithSuffix(target, internalSlugPrefix)
    if (!parsed) {
      return target
    }

    return `${resolvePublicPostHref(parsed.slug, linking)}${parsed.suffix}`
  }

  let rewritten = rewriteHtmlAttributes(content, rewriteTarget)

  if (contentFormat === 'markdown') {
    rewritten = rewriteMarkdownInlineLinks(rewritten, rewriteTarget)
    rewritten = rewriteMarkdownReferenceLinks(rewritten, rewriteTarget)
    rewritten = rewriteAngleAutolinks(rewritten, internalSlugPrefix, rewriteTarget)
  }

  return rewritten
}

function rewriteHtmlAttributes(
  content: string,
  rewriteTarget: (target: string) => string,
): string {
  return content.replace(
    /(\b(?:href|src)\s*=\s*)(["'])(.*?)\2/gi,
    (match, prefix: string, quote: string, target: string) => {
      const rewrittenTarget = rewriteTarget(target)
      return rewrittenTarget === target
        ? match
        : `${prefix}${quote}${rewrittenTarget}${quote}`
    },
  )
}

function rewriteMarkdownInlineLinks(
  content: string,
  rewriteTarget: (target: string) => string,
): string {
  return content.replace(
    /(!?\[[^\]]*]\()([^)]+)(\))/g,
    (match, open: string, rawTarget: string, close: string) => {
      const targetMatch = rawTarget.match(/^(\S+)([\s\S]*)$/)
      const target = targetMatch?.[1]

      if (!target) {
        return match
      }

      const suffix = targetMatch?.[2] ?? ''
      const rewrittenTarget = rewriteTarget(target)
      return rewrittenTarget === target
        ? match
        : `${open}${rewrittenTarget}${suffix}${close}`
    },
  )
}

function rewriteMarkdownReferenceLinks(
  content: string,
  rewriteTarget: (target: string) => string,
): string {
  return content.replace(
    /^(\[[^\]]+]:\s*)(\S+)(.*)$/gm,
    (match, prefix: string, target: string, suffix: string) => {
      const rewrittenTarget = rewriteTarget(target)
      return rewrittenTarget === target
        ? match
        : `${prefix}${rewrittenTarget}${suffix}`
    },
  )
}

function rewriteAngleAutolinks(
  content: string,
  internalSlugPrefix: string,
  rewriteTarget: (target: string) => string,
): string {
  const pattern = new RegExp(
    `<(${escapeRegExp(internalSlugPrefix)}[^>]+)>`,
    'g',
  )

  return content.replace(pattern, (match, target: string) => {
    const rewrittenTarget = rewriteTarget(target)
    return rewrittenTarget === target ? match : `<${rewrittenTarget}>`
  })
}
