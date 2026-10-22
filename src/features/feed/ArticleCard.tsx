import { CATEGORY_ICONS, SOURCE_ICONS } from '@/components/icons'
import type { Article } from '@/domain/article'
import { CATEGORY_LABELS } from '@/domain/article'
import { cn } from '@/lib/cn'
import { formatRelativeDate } from '@/lib/dates'
import { useState } from 'react'

interface ArticleCardProps {
  article: Article
  featured?: boolean
}

export function ArticleCard({ article, featured = false }: ArticleCardProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = Boolean(article.imageUrl) && !imageFailed
  const SourceIcon = SOURCE_ICONS[article.source.id]
  const CategoryIcon = article.category ? CATEGORY_ICONS[article.category] : null

  return (
    <article
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-card bg-surface',
        'ring-1 ring-border transition-all duration-300 ring-inset',
        'hover:shadow-card hover:ring-border-strong motion-safe:hover:-translate-y-0.5',
        featured && 'sm:flex-row',
      )}
    >
      {showImage && (
        <div
          className={cn(
            'relative shrink-0 overflow-hidden bg-surface-muted',
            featured ? 'aspect-[16/10] sm:aspect-auto sm:w-[44%]' : 'aspect-[16/9]',
          )}
        >
          <img
            src={article.imageUrl}
            alt=""
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="absolute inset-0 size-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.03]"
          />
        </div>
      )}

      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col',
          featured ? 'gap-3 p-5 sm:justify-center sm:p-7' : 'gap-2.5 p-5',
        )}
      >
        <div className="flex min-w-0 items-center gap-2 text-xs">
          <span className="inline-flex min-w-0 items-center gap-1 rounded-full bg-accent-soft px-2 py-1 font-semibold text-accent-ink">
            <SourceIcon size={13} stroke={1.75} className="shrink-0" aria-hidden />
            <span className="truncate">{article.source.name}</span>
          </span>
          {featured && article.category && CategoryIcon && (
            <span className="inline-flex shrink-0 items-center gap-1 text-muted">
              <CategoryIcon size={14} stroke={1.75} aria-hidden />
              {CATEGORY_LABELS[article.category]}
            </span>
          )}
          <span className="shrink-0 text-border-strong" aria-hidden="true">
            ·
          </span>
          <time dateTime={article.publishedAt} className="shrink-0 text-subtle">
            {formatRelativeDate(article.publishedAt)}
          </time>
        </div>

        <h3
          className={cn(
            'font-serif font-medium text-ink',
            featured
              ? 'text-xl leading-[1.2] text-pretty min-[380px]:text-[22px] sm:text-2xl sm:text-balance lg:text-3xl'
              : 'text-[17px] leading-[1.25] text-pretty sm:text-lg',
          )}
        >
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
          <p
            className={cn(
              'leading-relaxed text-pretty text-muted',
              featured ? 'line-clamp-3 text-[15px]' : 'line-clamp-2 text-sm sm:line-clamp-3',
            )}
          >
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
