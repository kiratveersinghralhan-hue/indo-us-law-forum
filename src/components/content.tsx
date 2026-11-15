import { safeLink } from '../data/safe-link';
import { Link } from 'react-router-dom';
import type { Article, ContentBlock, ResearchCase } from '../data/types';
import { paths } from '../config/navigation';
import { Arrow } from './ui';
import { editorialMedia } from '../config/media';
import type { ArtworkId } from '../config/media';
import { neutralCover } from '../data/article-presentation';
import { AssetImage } from '../backend/asset-image';

export function EditorialArtwork({
  artwork,
  className = '',
  eager = false,
  reveal = false,
  asset,
}: {
  artwork: ArtworkId;
  className?: string;
  eager?: boolean;
  reveal?: boolean;
  asset?: {
    coverAssetId?: string;
    coverUrl?: string;
    coverAlt?: string;
    fictional?: boolean;
  };
}) {
  // A valid backend asset can arrive before its provisional fallback-artwork key
  // is assigned. Its image/alt remain authoritative; the frame stays stable.
  const media = editorialMedia[artwork] ?? editorialMedia.institutions;
  return (
    <figure
      className={`editorial-art ${className}`}
      data-reveal={reveal ? 'image' : undefined}
    >
      <AssetImage
        assetId={asset?.coverAssetId}
        src={
          asset?.coverUrl ||
          (asset?.fictional === false ? neutralCover : media.src)
        }
        alt={
          asset?.coverAlt ||
          (asset?.fictional === false
            ? 'The Corridor — cover artwork pending'
            : media.alt)
        }
        width={artwork === 'avatar' ? 800 : 1000}
        height={artwork === 'avatar' ? 1000 : 800}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
      />
      <figcaption>
        {asset?.coverUrl
          ? asset.coverAlt
          : asset?.fictional === false
            ? 'Cover artwork pending'
            : media.caption}
      </figcaption>
    </figure>
  );
}
export function TeamCard({
  profile,
  compact = false,
}: {
  profile: import('../data/types').TeamProfile;
  compact?: boolean;
}) {
  return (
    <article className={`team-card ${compact ? 'is-compact' : ''}`}>
      <EditorialArtwork
        artwork={profile.artwork}
        asset={profile}
        className="profile-art"
      />
      <div className="team-card-copy">
        <p className="eyebrow">{profile.role}</p>
        <h2>{profile.label}</h2>
        <p>{profile.description}</p>
        {profile.fictional !== false && (
          <span className="sample-tag">Sample profile / Identity pending</span>
        )}
        {profile.links
          ?.filter((link) => safeLink(link.url))
          .map((link) => (
            <p key={link.url}>
              <a href={safeLink(link.url)} rel="noopener noreferrer">
                {link.label}
              </a>
            </p>
          ))}
      </div>
    </article>
  );
}

export function StructuredContent({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="reading-content">
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'heading':
            return <h2 key={index}>{block.text}</h2>;
          case 'paragraph':
            return <p key={index}>{block.text}</p>;
          case 'note':
            return (
              <aside key={index} className="reading-note">
                {block.text}
              </aside>
            );
          case 'list':
            return (
              <ul key={index}>
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            );
        }
      })}
    </div>
  );
}
export function ArticleCard({
  article,
  index,
}: {
  article: Article;
  index: number;
}) {
  return (
    <article className="article-card">
      <Link
        to={paths.article(article.slug)}
        tabIndex={-1}
        aria-hidden="true"
        className="article-art-link"
      >
        <EditorialArtwork artwork={article.artwork} asset={article} />
      </Link>
      <span className="article-index" aria-hidden="true">
        {String(index + 1).padStart(2, '0')}
      </span>
      <p className="eyebrow">
        {article.categoryLabel} <span className="meta-divider">/</span>{' '}
        {article.readingMinutes} min
        {article.fictional !== false ? ' sample' : ''}
      </p>
      <h2>
        <Link to={paths.article(article.slug)}>
          {article.title}
          <Arrow diagonal />
        </Link>
      </h2>
      <p>{article.summary}</p>
      <div className="article-card-foot">
        <span>{article.sampleAuthor}</span>
        {article.fictional !== false && (
          <span className="sample-tag">Sample</span>
        )}
      </div>
    </article>
  );
}
export function CaseRow({ item }: { item: ResearchCase }) {
  return (
    <article className="case-row">
      <span className="case-reference">
        {item.reference}
        <small>{item.kind}</small>
      </span>
      <div>
        <h2>
          <Link to={paths.case(item.slug)}>
            {item.title}
            <Arrow diagonal />
          </Link>
        </h2>
        <p>{item.summary}</p>
        <span className="case-meta">
          {item.categoryLabel} <span aria-hidden="true">·</span> {item.setting}
        </span>
      </div>
      {item.fictional !== false && <span className="sample-tag">Sample</span>}
    </article>
  );
}
