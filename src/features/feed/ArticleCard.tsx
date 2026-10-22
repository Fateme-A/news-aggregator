import { SOURCE_ICONS } from '@/components/icons'
import type { Article } from '@/domain/article'
import { formatRelativeDate } from '@/lib/dates'
import { useState } from 'react'

interface ArticleCardProps {
  article: Article
}

export function ArticleCard({ article }: ArticleCardProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = Boolean(article.imageUrl) && !imageFailed
  const SourceIcon = SOURCE_ICONS[article.source.id]

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-card bg-surface ring-1 ring-border ring-inset transition-all duration-300 hover:shadow-card hover:ring-border-strong motion-safe:hover:-translate-y-0.5">
      {showImage && (
        <div className="relative aspect-[16/9] shrink-0 overflow-hidden bg-surface-muted">
          <img
            src={article.imageUrl}
            alt=""
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="absolute inset-0 size-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.03]"
          />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-2.5 p-5">
        <div className="flex min-w-0 items-center gap-2 text-xs">
          <span className="inline-flex min-w-0 items-center gap-1 rounded-full bg-accent-soft px-2 py-1 font-semibold text-accent-ink">
            <SourceIcon size={13} stroke={1.75} className="shrink-0" aria-hidden />
            <span className="truncate">{article.source.name}</span>
          </span>
          <span className="shrink-0 text-border-strong" aria-hidden="true">
            ·
          </span>
          <time dateTime={article.publishedAt} className="shrink-0 text-subtle">
            {formatRelativeDate(article.publishedAt)}
          </time>
        </div>

        <h3 className="font-serif text-[17px] leading-[1.25] font-medium text-pretty text-ink sm:text-lg">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors group-hover:text-accent after:absolute after:inset-0 after:content-['']"
          >
            {article.title}
          </a>
        </h3>

        {article.description && (
          <p className="line-clamp-2 text-sm leading-relaxed text-pretty text-muted sm:line-clamp-3">
            {article.description}
          </p>
        )}

        {article.author && (
          <p className="mt-auto truncate pt-1 text-xs text-subtle">
            By <span className="font-medium text-muted">{article.author}</span>
          </p>
        )}
      </div>
    </article>
  )
}
