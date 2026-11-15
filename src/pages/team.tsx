import { useDemoEnvironment } from '../admin/context';
import { useCallback } from 'react';
import { useContentProvider } from '../data/provider-context';
import { useResource } from '../hooks/use-resource';
import { TeamCard } from '../components/content';
import { sampleTeam } from '../data/mock-data';
import { brand } from '../config/brand';
import { siteCopy } from '../config/site-copy';
import {
  ErrorState,
  EmptyState,
  LoadingState,
  PageIntro,
  PageShell,
  SampleNotice,
} from '../components/ui';

export function TeamPage() {
  const env = useDemoEnvironment();
  const provider = useContentProvider();
  const load = useCallback(() => provider.listTeam(), [provider]);
  const { state, retry } = useResource(load, 'team');
  return (
    <PageShell>
      <PageIntro eyebrow={siteCopy.team.eyebrow} title={siteCopy.team.title}>
        <p>
          {env.backend
            ? 'Meet the editorial board and researchers of The Corridor. Profiles appear after names, roles, biographies and portraits are approved.'
            : siteCopy.team.introduction}
        </p>
      </PageIntro>
      <div className="container bottom-space">
        <SampleNotice>
          {env.backend ? undefined : siteCopy.team.note}
        </SampleNotice>

        <section
          className="about-mandate-band"
          aria-labelledby="about-mandate-heading"
          data-reveal
        >
          <div className="about-mandate-grid">
            <div className="about-mandate-identity">
              <img
                src={brand.logo}
                alt={`${brand.name} — ${brand.descriptor}`}
                className="about-mandate-logo"
                width={88}
                height={88}
              />
              <div>
                <p className="eyebrow">{siteCopy.about.eyebrow}</p>
                <h2 id="about-mandate-heading">
                  {siteCopy.about.title}
                  <br />
                  <em>{siteCopy.about.italic}</em>
                </h2>
              </div>
            </div>
            <div className="about-mandate-copy">
              <p className="about-mandate-lead">{siteCopy.about.lead}</p>
              <p>{siteCopy.about.body}</p>
            </div>
          </div>
          <div className="about-pillars">
            {siteCopy.about.pillars.map((pillar) => (
              <div key={pillar.index} className="about-pillar">
                <span className="about-pillar-index">{pillar.index}</span>
                <strong>{pillar.title}</strong>
                <p>{pillar.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="team-board-header" data-reveal>
          <div>
            <p className="eyebrow">Editorial Board & Researchers</p>
            <h2>People & biographies</h2>
          </div>
          <p>
            {env.backend
              ? 'Approved portraits and biographical writeups published via the editorial workspace.'
              : 'Structured portrait and biography cards ready for direct replacement with final member photographs and writeups.'}
          </p>
        </div>

        {state.status === 'loading' && <LoadingState />}
        {state.status === 'error' && <ErrorState onRetry={retry} />}
        {state.status === 'ready' &&
          (state.data.length ? (
            <div className="team-grid" data-reveal>
              {state.data.map((profile) => (
                <TeamCard key={profile.id} profile={profile} />
              ))}
            </div>
          ) : (
            <>
              <EmptyState
                title="Team profiles are awaiting content."
                description="Temporary placeholder cards are shown below for layout review only. No real client staff identities are represented until approved photographs and writeups are published."
              />
              <div className="team-grid" data-reveal>
                {sampleTeam.map((profile) => (
                  <TeamCard
                    key={profile.id}
                    profile={{ ...profile, fictional: true }}
                  />
                ))}
              </div>
            </>
          ))}
      </div>
    </PageShell>
  );
}
