import { Fragment, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useContentProvider } from '../data/provider-context';
import { useResource } from '../hooks/use-resource';
import { paths } from '../config/navigation';
import {
  ArticleCard,
  CaseRow,
  EditorialArtwork,
  TeamCard,
} from '../components/content';
import { ResearchCarousel } from '../components/research-carousel';
import {
  Arrow,
  ButtonLink,
  EmptyState,
  ErrorState,
  LoadingState,
  PageShell,
  SampleNotice,
  TextLink,
} from '../components/ui';
import { setPageMetadata } from '../config/seo';
import { identifyCategory, researchCategories } from '../config/research-categories';
import { brand } from '../config/brand';
import { siteCopy } from '../config/site-copy';
import { HeroArtwork } from '../motion/hero-artwork';
import { useEditorialMotion } from '../motion/use-editorial-motion';
import { motionSettings } from '../config/motion';
import { usePublicSite } from '../data/site-context';
import { featuredArticles } from '../data/article-presentation';
import { useDemoEnvironment } from '../admin/context';

export function HomePage() {
  const live = !!useDemoEnvironment().backend;
  const provider = useContentProvider();
  const settings = usePublicSite();
  const load = useCallback(async () => {
    const [articles, categories, cases, team] = await Promise.all([
      provider.listArticles(),
      provider.listCategories(),
      provider.listCases(),
      provider.listTeam(),
    ]);
    return { articles, categories, cases, team };
  }, [provider]);
  const { state, retry } = useResource(load, 'home');
  const motionScope = useEditorialMotion(
    state.status === 'ready',
    JSON.stringify(settings.sections),
  );
  useEffect(() => {
    setPageMetadata('Student research on India–US law');
  }, []);
  const sections =
    state.status === 'ready'
      ? {
          focus: (
            <section
              className="section container focus-section"
              aria-labelledby="focus-heading"
            >
              <div className="section-heading" data-reveal>
                <div>
                  <p className="eyebrow">{siteCopy.focus.eyebrow}</p>
                  <h2 id="focus-heading" tabIndex={-1}>
                    {siteCopy.focus.title}
                    <br />
                    <em>{siteCopy.focus.italic}</em>
                  </h2>
                </div>
                <p>{siteCopy.focus.description}</p>
              </div>
              <div className="focus-rows" data-reveal>
                {state.data.categories
                  .filter((c) => !identifyCategory(c).mappingPending)
                  .sort((a, b) =>
                    researchCategories.findIndex((c) => c.label === a.label) -
                    researchCategories.findIndex((c) => c.label === b.label),
                  )
                  .map((category, index) => (
                    <Link
                      to={`${paths.articles}?category=${category.slug ?? category.id}`}
                      key={category.id}
                      className="focus-row"
                    >
                      <span className="focus-number" aria-hidden="true">
                        0{index + 1}
                      </span>
                      <span className="focus-rule" aria-hidden="true" />
                      <h3>{category.label}</h3>
                      <p>{category.description}</p>
                      <span className="sample-tag">Research area</span>
                      <Arrow diagonal />
                    </Link>
                  ))}
              </div>
            </section>
          ),
          featured: (
            <section
              className="featured-band"
              aria-labelledby="featured-heading"
            >
              <div className="container">
                <div className="section-heading" data-reveal>
                  <div>
                    <p className="eyebrow">{siteCopy.featured.eyebrow}</p>
                    <h2 id="featured-heading">{siteCopy.featured.title}</h2>
                  </div>
                  <p>
                    {live
                      ? 'Selected published research from Indo-US Law Forum. Articles appear after editorial approval.'
                      : siteCopy.featured.description}
                  </p>
                </div>
                <ResearchCarousel
                  articles={featuredArticles(state.data.articles)}
                />
                {!state.data.articles.some((article) => article.featured) && (
                  <EmptyState
                    title={state.data.articles.length ? 'Featured research is awaiting selection.' : 'Research is in preparation.'}
                    description={state.data.articles.length
                      ? 'Published articles are available in the reading room. Featured selections will appear here after editorial selection.'
                      : 'Approved articles will appear here after publication.'}
                  />
                )}
                <div className="supporting-heading" data-reveal>
                  <div>
                    <p className="eyebrow">{siteCopy.supporting.eyebrow}</p>
                    <h3>{siteCopy.supporting.title}</h3>
                  </div>
                  <TextLink to={paths.articles}>
                    {live ? 'All articles' : 'All sample articles'}
                  </TextLink>
                </div>
                <div className="supporting-stories" data-reveal>
                  {state.data.articles
                    .filter((article) => !article.featured)
                    .slice(0, 2)
                    .map((article, index) => (
                      <ArticleCard
                        key={article.slug}
                        article={article}
                        index={index}
                      />
                    ))}
                </div>
              </div>
            </section>
          ),
          repository: (
            <section
              className="repository-band"
              aria-labelledby="repository-heading"
            >
              <div className="container repository-story">
                <div className="repository-intro">
                  <div data-reveal>
                    <p className="eyebrow">{siteCopy.repository.eyebrow}</p>
                    <h2 id="repository-heading">
                      {siteCopy.repository.title}
                      <br />
                      <em>{siteCopy.repository.italic}</em>
                    </h2>
                    <p>
                      {live
                        ? 'A repository for research on disputes involving India–US companies. Approved records will appear here as the collection develops.'
                        : siteCopy.repository.description}
                    </p>
                    <TextLink to={paths.cases}>Browse the repository</TextLink>
                  </div>
                  <div className="archive-frame">
                    <EditorialArtwork
                      artwork="archive"
                      className="archive-plate"
                    />
                    <span className="archive-coordinate" aria-hidden="true">
                      Open questions / Recorded context
                    </span>
                  </div>
                </div>
                <div className="repository-chapters">
                  <div className="repository-chapter" data-story-step>
                    <div className="chapter-heading" data-reveal>
                      <p className="eyebrow">01 / Inquiry</p>
                      <h3>{siteCopy.repository.steps[0]}</h3>
                      <p>{siteCopy.repository.notes[0]}</p>
                    </div>
                    {state.data.cases
                      .filter((item) => item.featured !== false)
                      .slice(0, 1)
                      .map((item) => (
                        <CaseRow key={item.slug} item={item} />
                      ))}
                  </div>
                  <div className="repository-chapter" data-story-step>
                    <div className="chapter-heading" data-reveal>
                      <p className="eyebrow">02 / Context</p>
                      <h3>{siteCopy.repository.steps[1]}</h3>
                      <p>{siteCopy.repository.notes[1]}</p>
                    </div>
                    {state.data.cases
                      .filter((item) => item.featured !== false)
                      .slice(1, 3)
                      .map((item) => (
                        <CaseRow key={item.slug} item={item} />
                      ))}
                  </div>
                  {!state.data.cases.some(
                    (item) => item.featured !== false,
                  ) && (
                    <EmptyState
                      title="Repository records are awaiting content."
                      description="Approved case records will appear here after publication."
                    />
                  )}
                </div>
              </div>
            </section>
          ),
          team: (
            <section
              className="section container team-preview"
              aria-labelledby="team-preview-heading"
            >
              <div className="section-heading" data-reveal>
                <div>
                  <p className="eyebrow">{siteCopy.teamPreview.eyebrow}</p>
                  <h2 id="team-preview-heading">
                    {siteCopy.teamPreview.title}
                  </h2>
                </div>
                <p>
                  {live
                    ? 'Editorial team profiles appear here after approval.'
                    : siteCopy.teamPreview.description}
                </p>
              </div>
              <div className="team-preview-grid" data-reveal>
                {state.data.team.slice(0, 3).map((profile) => (
                  <TeamCard key={profile.id} profile={profile} compact />
                ))}
              </div>
              {!state.data.team.length && (
                <EmptyState
                  title="Team profiles are awaiting content."
                  description="Team profiles will appear here after approval."
                />
              )}
              <TextLink to={paths.team}>
                {live ? 'Explore the team' : 'Explore the sample team'}
              </TextLink>
            </section>
          ),
          contribution: (
            <section className="contribution-band">
              <div className="contribute container">
                <div data-reveal>
                  <p className="eyebrow">{siteCopy.contribution.eyebrow}</p>
                  <h2>
                    {siteCopy.contribution.title}
                    <br />
                    <em>{siteCopy.contribution.italic}</em>
                  </h2>
                  <p>{siteCopy.contribution.description}</p>
                  <ButtonLink to={paths.submit} variant="secondary">
                    Submit an article
                  </ButtonLink>
                </div>
                <EditorialArtwork
                  artwork="communities"
                  className="contribution-art"
                  reveal
                />
              </div>
            </section>
          ),
        }
      : null;
  return (
    <PageShell>
      <div
        ref={motionScope}
        className="public-home"
        data-empty-publication={live && state.status === 'ready' && !state.data.articles.length ? 'true' : undefined}
      >
        <section className="hero container" aria-labelledby="hero-heading">
          <div className="hero-rules" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="hero-copy" data-reveal>
            {motionSettings.entranceEnabled && (
              <p className="entrance-label">
                {brand.name} <span aria-hidden="true">/</span>{' '}
                {live ? 'Student research' : 'Sample edition'}
              </p>
            )}
            <p className="eyebrow accent-rule">{settings.hero.eyebrow}</p>
            <h1 id="hero-heading">
              <span className="hero-line">
                <span>{settings.hero.lines[0]}</span>
              </span>
              <br />
              <span className="hero-line">
                <span>{settings.hero.lines[1]}</span>
              </span>
              <br />
              <span className="hero-line">
                <em>{settings.hero.lines[2]}</em>
              </span>
            </h1>
            <p className="hero-description">{settings.hero.introduction}</p>
            <div className="hero-actions">
              <ButtonLink to={paths.articles}>Read articles</ButtonLink>
              <ButtonLink to={paths.submit} variant="secondary">
                Submit an article
              </ButtonLink>
            </div>
            {state.status === 'ready' && state.data.categories.some((category) =>
              !identifyCategory(category).mappingPending,
            ) && settings.sections.some((section) => section.id === 'focus' && section.visible) && (
              <a className="hero-research-link" href="#focus-heading">
                Explore research areas ↓
              </a>
            )}
          </div>
          <HeroArtwork
            articles={
              state.status === 'ready'
                ? featuredArticles(state.data.articles)
                : []
            }
          />
          <div className="hero-bottom">
            <span>
              Indo-US Law Forum / {live ? 'Student research' : 'Sample edition'}
            </span>
            <a
              href={
                settings.sections.some(
                  (section) => section.id === 'focus' && section.visible,
                )
                  ? '#focus-heading'
                  : '#hero-heading'
              }
            >
              A closer look <span aria-hidden="true">↓</span>
            </a>
          </div>
        </section>
        <div className="container">
          <SampleNotice />
        </div>
        {state.status === 'loading' && (
          <div className="container">
            <LoadingState />
          </div>
        )}
        {state.status === 'error' && (
          <div className="container">
            <ErrorState onRetry={retry} />
          </div>
        )}
        {sections &&
          settings.sections
            .filter((section) => section.visible)
            .map((section) => (
              <Fragment key={section.id}>{sections[section.id]}</Fragment>
            ))}
      </div>
    </PageShell>
  );
}
