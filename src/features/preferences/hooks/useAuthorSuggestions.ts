import type { ArticlePage } from '@/domain/query'
import { collectAuthors } from '@/lib/authors'
import { useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'

/**
 * Contributors from pages already in the query cache. Nothing is fetched:
 * NewsAPI allows 100 requests a day, and an autocomplete that spent them would
 * be a poor trade. Reads the cache rather than the rendered feed, which in My
 * Feed is already narrowed to the chosen authors.
 *
 * Snapshotted when `enabled` turns true, so the list cannot reshuffle under a
 * tapping thumb.
 */
export function useAuthorSuggestions(enabled: boolean, limit = 12): string[] {
  const queryClient = useQueryClient()

  return useMemo(() => {
    if (!enabled) return []
    const articles = queryClient
      .getQueriesData<ArticlePage>({ queryKey: ['articles'] })
      .flatMap(([, page]) => page?.articles ?? [])
    return collectAuthors(articles, limit)
  }, [enabled, limit, queryClient])
}
