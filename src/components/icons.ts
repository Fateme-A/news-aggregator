import {
  IconApi,
  IconAtom,
  IconBriefcase,
  IconBrandGuardian,
  IconBrandNytimes,
  IconCpu,
  IconHeartbeat,
  IconMovie,
  IconNews,
  IconTrophy,
} from '@tabler/icons-react'
import type { Category, SourceId } from '@/domain/article'

export type AppIcon = typeof IconNews

export const CATEGORY_ICONS: Record<Category, AppIcon> = {
  business: IconBriefcase,
  entertainment: IconMovie,
  general: IconNews,
  health: IconHeartbeat,
  science: IconAtom,
  sports: IconTrophy,
  technology: IconCpu,
}

export const SOURCE_ICONS: Record<SourceId, AppIcon> = {
  guardian: IconBrandGuardian,
  nytimes: IconBrandNytimes,
  newsapi: IconApi,
}
