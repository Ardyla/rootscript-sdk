import type {
  RootscriptPost,
  RootscriptPostSummary,
  RootscriptRelatedPostsOptions,
} from './types'
import { tokenize, uniqueBySlug } from './utils'

const DEFAULT_MAX_COUNT = 3

export function resolveRelatedPosts(
  post: RootscriptPost,
  allPosts: RootscriptPostSummary[],
  options?: RootscriptRelatedPostsOptions,
): RootscriptPostSummary[] {
  const maxCount = options?.maxCount ?? DEFAULT_MAX_COUNT
  const candidates = uniqueBySlug(
    allPosts.filter((candidate) => candidate.slug !== post.slug),
  )
  const bySlug = new Map(candidates.map((candidate) => [candidate.slug, candidate]))
  const selected: RootscriptPostSummary[] = []
  const seen = new Set<string>()

  for (const slug of post.relatedSlugs ?? []) {
    const candidate = bySlug.get(slug)
    if (!candidate || seen.has(candidate.slug)) {
      continue
    }

    seen.add(candidate.slug)
    selected.push(candidate)
    if (selected.length >= maxCount) {
      return selected
    }
  }

  const ranked = candidates
    .filter((candidate) => !seen.has(candidate.slug))
    .map((candidate) => ({
      candidate,
      score: scoreCandidate(post, candidate),
      publishedAt: Date.parse(candidate.publishedAt),
    }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score
      }

      if (right.publishedAt !== left.publishedAt) {
        return right.publishedAt - left.publishedAt
      }

      return left.candidate.slug.localeCompare(right.candidate.slug)
    })

  for (const entry of ranked) {
    if (selected.length >= maxCount) {
      break
    }

    selected.push(entry.candidate)
  }

  return selected
}

function scoreCandidate(
  source: RootscriptPost,
  candidate: RootscriptPostSummary,
): number {
  const sourceTags = new Set(source.tags.map((tag) => tag.toLowerCase()))
  const candidateTags = new Set(candidate.tags.map((tag) => tag.toLowerCase()))
  const sharedTags = intersectSize(sourceTags, candidateTags)

  const sourceTitleTokens = new Set(tokenize(source.title))
  const candidateTitleTokens = new Set(tokenize(candidate.title))
  const sharedTitleTokens = intersectSize(sourceTitleTokens, candidateTitleTokens)

  const sourceExcerptTokens = new Set(tokenize(source.excerpt))
  const candidateExcerptTokens = new Set(tokenize(candidate.excerpt))
  const sharedExcerptTokens = intersectSize(
    sourceExcerptTokens,
    candidateExcerptTokens,
  )

  return sharedTags * 10 + sharedTitleTokens * 4 + sharedExcerptTokens * 2
}

function intersectSize(left: Set<string>, right: Set<string>): number {
  let size = 0
  for (const value of left) {
    if (right.has(value)) {
      size += 1
    }
  }

  return size
}

