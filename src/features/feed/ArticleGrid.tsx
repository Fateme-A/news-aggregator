import type { Article } from '@/domain/article'
import { ArticleCard } from './ArticleCard'

interface ArticleGridProps {
  articles: Article[]
}

export function ArticleGrid({ articles }: ArticleGridProps) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
      {articles.map((article, index) => (
        <li
          key={article.id}
          className={index === 0 ? 'min-w-0 sm:col-span-2 xl:col-span-3' : 'min-w-0'}
        >
          <ArticleCard article={article} featured={index === 0} />
        </li>
      ))}
    </ul>
  )
}
