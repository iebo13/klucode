import type { Lang } from '@/lib/routes';

import de from './de';
import en from './en';
import type { Content } from './types';

export const content: Record<Lang, Content> = { de, en };

export function getContent(lang: Lang): Content {
  return content[lang];
}

export type { Content } from './types';
