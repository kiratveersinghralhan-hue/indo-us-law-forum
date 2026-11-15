import { useDemoEnvironment } from '../admin/context';
import { useCallback } from 'react';
import { useContentProvider } from '../data/provider-context';
import { useResource } from '../hooks/use-resource';
import { TeamCard } from '../components/content';
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
            ? 'Meet the editorial team. Profiles appear after names, roles, biographies and portraits are approved.'
            : siteCopy.team.introduction}
        </p>
      </PageIntro>
      <div className="container bottom-space">
        <SampleNotice>
          {env.backend ? undefined : siteCopy.team.note}
        </SampleNotice>
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
            <EmptyState title="Team profiles are awaiting content." />
          ))}
      </div>
    </PageShell>
  );
}
