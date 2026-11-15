import type { Article } from './types';
import { editorialMedia } from '../config/media';

export const heroCoverLimit = 3;
export const neutralCover = '/artwork/publication-neutral.svg';
// Bundled studies belong only to explicitly fictional records. Real articles
// without an uploaded cover receive a neutral organization wordmark.
export function articleCover(
  article: Pick<Article, 'coverUrl' | 'fictional' | 'artwork'>,
) {
  return (
    article.coverUrl ||
    (article.fictional !== false
      ? editorialMedia[article.artwork]?.src
      : undefined) ||
    neutralCover
  );
}
export function featuredArticles(articles: Article[]) {
  return articles.filter(
    (article, index) =>
      article.featured &&
      articles.findIndex((other) => other.id === article.id) === index,
  );
}
