import { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useContentProvider } from '../data/provider-context';
import { useResource } from '../hooks/use-resource';
import { paths } from '../config/navigation';
import {
  ArticleCard,
  EditorialArtwork,
  StructuredContent,
} from '../components/content';
import {
  ErrorState,
  LoadingState,
  NotFound,
  PageIntro,
  PageShell,
  SampleNotice,
  TextLink,
} from '../components/ui';

export function ArticleDetailPage() {
  const { slug = '' } = useParams();
  const provider = useContentProvider();
  const load = useCallback(async () => {
    const [article, articles] = await Promise.all([
      provider.getArticle(slug),
      provider.listArticles(),
    ]);
    return { article, articles };
  }, [provider, slug]);
  const { state, retry } = useResource(load, `article:${slug}`);
  if (state.status === 'loading')
    return (
      <div className="container">
        <LoadingState />
      </div>
    );
  if (state.status === 'error')
    return (
      <div className="container">
        <ErrorState onRetry={retry} />
      </div>
    );
  if (!state.data.article)
    return (
      <NotFound
        type="Article"
        to={paths.articles}
        backLabel="Back to articles"
      />
    );
  const article = state.data.article;
  const related = state.data.articles
    .filter((item) => item.slug !== article.slug)
    .sort(
      (a, b) =>
        Number(b.categoryId === article.categoryId) -
        Number(a.categoryId === article.categoryId),
    )
    .slice(0, 2);
  return (
    <PageShell>
      <div className="container breadcrumb">
        <TextLink to={paths.articles}>All articles</TextLink>
      </div>
      <PageIntro
        eyebrow={`${article.categoryLabel} / ${article.fictional !== false ? 'Sample editorial' : 'Editorial'}`}
        title={article.title}
        description={article.summary}
        pageType="article"
        imagePath={
          article.coverAssetId
            ? `/media/${encodeURIComponent(article.coverAssetId)}`
            : undefined
        }
      >
        <p>{article.summary}</p>
      </PageIntro>
      <div className="container">
        <div className="detail-meta">
          <span>{article.sampleAuthor}</span>
          <span>
            {article.readingMinutes} min
            {article.fictional !== false ? ' sample' : ''} read
          </span>
          <span>{article.publicationLabel}</span>
        </div>
        {article.fictional !== false && (
          <SampleNotice>
            Fictional article. Author and reading time are sample values. Legacy
            category mappings require editorial review.
          </SampleNotice>
        )}
        <EditorialArtwork
          artwork={article.artwork}
          asset={article}
          className="detail-art"
          eager
        />
      </div>
      <div className="reading-width bottom-space">
        <StructuredContent blocks={article.body} />
        <TextLink to={paths.articles}>Return to the reading room</TextLink>
      </div>
      {!!related.length && (
        <section
          className="container related-section"
          aria-labelledby="related-heading"
        >
          <div className="section-heading aligned" data-reveal>
            <div>
              <p className="eyebrow">
                {article.fictional !== false
                  ? 'Continue reading / Sample edition'
                  : 'Continue reading'}
              </p>
              <h2 id="related-heading">Related perspectives</h2>
            </div>
            <TextLink to={paths.articles}>
              {article.fictional !== false
                ? 'All sample articles'
                : 'All articles'}
            </TextLink>
          </div>
          <div className="supporting-stories">
            {related.map((item, index) => (
              <ArticleCard key={item.slug} article={item} index={index} />
            ))}
          </div>
        </section>
      )}
    </PageShell>
  );
}
export function CaseDetailPage() {
  const { slug = '' } = useParams();
  const provider = useContentProvider();
  const load = useCallback(() => provider.getCase(slug), [provider, slug]);
  const { state, retry } = useResource(load, `case:${slug}`);
  if (state.status === 'loading')
    return (
      <div className="container">
        <LoadingState />
      </div>
    );
  if (state.status === 'error')
    return (
      <div className="container">
        <ErrorState onRetry={retry} />
      </div>
    );
  if (!state.data)
    return <NotFound type="Case" to={paths.cases} backLabel="Back to cases" />;
  const item = state.data;
  return (
    <PageShell>
      <div className="container breadcrumb">
        <TextLink to={paths.cases}>All cases</TextLink>
      </div>
      <PageIntro
        eyebrow={`${item.reference} / ${item.kind}`}
        title={item.title}
        description={item.summary}
      >
        <p>{item.summary}</p>
      </PageIntro>
      <div className="container">
        {item.fictional !== false && (
          <SampleNotice>
            Fictional case. Metadata fields are provisional and are not verified
            research.
          </SampleNotice>
        )}
        <dl className="case-metadata">
          <div>
            <dt>Provisional category</dt>
            <dd>{item.categoryLabel}</dd>
          </div>
          <div>
            <dt>{item.fictional !== false ? 'Sample setting' : 'Setting'}</dt>
            <dd>{item.setting}</dd>
          </div>
          <div>
            <dt>Record type</dt>
            <dd>{item.kind}</dd>
          </div>
          <div>
            <dt>Publication date</dt>
            <dd>{item.dateLabel}</dd>
          </div>
        </dl>
        <ul
          className="case-tags"
          aria-label={item.fictional !== false ? 'Sample tags' : 'Case tags'}
        >
          {item.tags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
        <EditorialArtwork artwork="archive" className="detail-art" />
      </div>
      <div className="reading-width bottom-space">
        <StructuredContent blocks={item.body} />
        <aside className="source-note">
          <p className="eyebrow">
            {item.fictional !== false
              ? 'Sample supporting-document information'
              : 'Supporting-document information'}
          </p>
          <h2>Sources & supporting material</h2>
          <p>{item.sourceNote}</p>
          {!!item.documents?.length && (
            <section>
              <h2>Supporting documents</h2>
              <ul>
                {item.documents.map((d) => (
                  <li key={d.id}>
                    <a href={d.url} target="_blank" rel="noopener noreferrer">
                      {d.label}
                    </a>
                  </li>
                ))}
              </ul>
              <p className="field-hint">
                Download links are temporary. Reload this page to renew an
                expired link.
              </p>
            </section>
          )}
          {!!item.supportingDocuments?.length && (
            <>
              <p>Document placeholders — not uploaded.</p>
              <ul>
                {item.supportingDocuments.map((label, index) => (
                  <li key={index}>{label} — not uploaded</li>
                ))}
              </ul>
            </>
          )}
        </aside>
        <TextLink to={paths.cases}>Return to the repository</TextLink>
      </div>
    </PageShell>
  );
}
