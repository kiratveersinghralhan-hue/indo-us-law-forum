import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useContentProvider } from '../data/provider-context';
import { useResource } from '../hooks/use-resource';
import { siteCopy } from '../config/site-copy';
import { categoryDisplay } from '../config/research-categories';
import { ArticleCard, CaseRow } from '../components/content';
import { useDemoEnvironment } from '../admin/context';
import {
  Button,
  EmptyState,
  ErrorState,
  Field,
  Input,
  LoadingState,
  PageIntro,
  PageShell,
  SampleNotice,
  Select,
} from '../components/ui';

export function ArticlesPage() {
  const live = !!useDemoEnvironment().backend;
  const provider = useContentProvider();
  const [params, setParams] = useSearchParams();
  const category = params.get('category') ?? '';
  const search = params.get('q') ?? '';
  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }
  const categoryLoad = useCallback(() => provider.listCategories(), [provider]);
  const categories = useResource(categoryLoad, 'categories');
  const load = useCallback(
    async () => ({
      articles: await provider.listArticles({ category, search }),
    }),
    [provider, category, search],
  );
  const { state, retry } = useResource(load, `articles:${category}:${search}`);
  return (
    <PageShell>
      <PageIntro
        eyebrow={live ? 'The reading room' : siteCopy.articles.eyebrow}
        title={siteCopy.articles.title}
      >
        <p>
          {live
            ? 'Research on India–US cross-border disputes and transactions. Published articles will appear here after editorial approval.'
            : siteCopy.articles.introduction}
        </p>
      </PageIntro>
      <div className="container bottom-space">
        <SampleNotice />
        <div className="article-filters">
          <Field
            id="article-search"
            label={live ? 'Search articles' : 'Search sample articles'}
            hint={
              live
                ? 'Search title, excerpt or author.'
                : 'Search title, excerpt, category or sample author.'
            }
          >
            <Input
              id="article-search"
              type="search"
              value={search}
              aria-describedby="article-search-hint"
              placeholder={
                live
                  ? 'Search published research'
                  : 'Try “library” or “records”'
              }
              onChange={(event) => update('q', event.target.value)}
            />
          </Field>
          <Field id="article-category" label="Filter by category">
            <Select
              id="article-category"
              value={category}
              onChange={(event) => update('category', event.target.value)}
            >
              <option value="">All categories</option>
              {category &&
                categories.state.status === 'ready' &&
                !categories.state.data.some(
                  (item) =>
                    (item.slug ?? item.id) === category || item.id === category,
                ) && <option value={category}>Unknown category</option>}
              {categories.state.status === 'ready' &&
                categories.state.data.map((item) => (
                  <option key={item.id} value={item.slug ?? item.id}>
                    {categoryDisplay(item)}
                  </option>
                ))}
            </Select>
          </Field>
        </div>
        <div className="results-toolbar">
          <p role="status">
            {state.status === 'ready'
              ? `${state.data.articles.length} ${live ? '' : 'sample '}${state.data.articles.length === 1 ? 'article' : 'articles'}`
              : 'Updating results…'}
          </p>
          {(category || search) && (
            <Button variant="secondary" onClick={() => setParams({})}>
              Reset filters
            </Button>
          )}
        </div>
        {state.status === 'loading' && <LoadingState />}
        {state.status === 'error' && <ErrorState onRetry={retry} />}
        {state.status === 'ready' && (
          <>
            {state.data.articles.length ? (
              <div className="article-grid collection-grid">
                {state.data.articles.map((article, index) => (
                  <ArticleCard
                    key={article.slug}
                    article={article}
                    index={index}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title={
                  live && !category && !search
                    ? 'Published articles are awaiting content.'
                    : undefined
                }
                onReset={category || search ? () => setParams({}) : undefined}
              />
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}

export function CasesPage() {
  const live = !!useDemoEnvironment().backend;
  const provider = useContentProvider();
  const [params, setParams] = useSearchParams();
  const search = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const kind = params.get('kind') ?? '';
  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }
  const load = useCallback(
    async () => ({
      cases: await provider.listCases({ search, category, kind }),
    }),
    [provider, search, category, kind],
  );
  const { state, retry } = useResource(
    load,
    `cases:${category}:${search}:${kind}`,
  );
  // Keep controls mounted while async results refresh, so typing retains focus.
  const categoryLoad = useCallback(() => provider.listCategories(), [provider]);
  const categories = useResource(categoryLoad, 'categories');
  return (
    <PageShell>
      <PageIntro
        eyebrow={live ? 'Knowledge repository' : siteCopy.cases.eyebrow}
        title={siteCopy.cases.title}
      >
        <p>
          {live
            ? 'Research records concerning disputes involving India–US companies. The collection grows as records and sources are approved.'
            : siteCopy.cases.introduction}
        </p>
      </PageIntro>
      <div className="container bottom-space">
        <SampleNotice />
        <div className="case-filters">
          <Field
            id="case-search"
            label={live ? 'Search cases' : 'Search sample cases'}
            hint="Search title, summary, reference, setting or tags."
          >
            <Input
              id="case-search"
              type="search"
              value={search}
              aria-describedby="case-search-hint"
              placeholder={
                live ? 'Search published records' : 'Try “library” or “shade”'
              }
              onChange={(event) => update('q', event.target.value)}
            />
          </Field>
          <Field id="case-category" label="Category">
            <Select
              id="case-category"
              value={category}
              onChange={(event) => update('category', event.target.value)}
            >
              <option value="">All categories</option>
              {category &&
                categories.state.status === 'ready' &&
                !categories.state.data.some(
                  (item) =>
                    (item.slug ?? item.id) === category || item.id === category,
                ) && <option value={category}>Unknown category</option>}
              {categories.state.status === 'ready' &&
                categories.state.data.map((item) => (
                  <option key={item.id} value={item.slug ?? item.id}>
                    {categoryDisplay(item)}
                  </option>
                ))}
            </Select>
          </Field>
          <Field id="case-kind" label="Record type">
            <Select
              id="case-kind"
              value={kind}
              onChange={(event) => update('kind', event.target.value)}
            >
              <option value="">All types</option>
              <option>Case study</option>
              <option>Research note</option>
              {kind && !['Case study', 'Research note'].includes(kind) && (
                <option value={kind}>Unknown type</option>
              )}
            </Select>
          </Field>
        </div>
        <div className="results-toolbar">
          <p role="status">
            {state.status === 'ready'
              ? `${state.data.cases.length} ${live ? '' : 'sample '}record${state.data.cases.length === 1 ? '' : 's'}`
              : 'Updating results…'}
          </p>
          {(search || category || kind) && (
            <Button variant="secondary" onClick={() => setParams({})}>
              Reset filters
            </Button>
          )}
        </div>
        {state.status === 'loading' && <LoadingState />}
        {state.status === 'error' && <ErrorState onRetry={retry} />}
        {state.status === 'ready' &&
          (state.data.cases.length ? (
            <div className="case-collection">
              {state.data.cases.map((item) => (
                <CaseRow key={item.slug} item={item} />
              ))}
            </div>
          ) : (
            <EmptyState
              title={
                live && !search && !category && !kind
                  ? 'Repository records are awaiting content.'
                  : undefined
              }
              onReset={search || category || kind ? () => setParams({}) : undefined}
            />
          ))}
      </div>
    </PageShell>
  );
}
