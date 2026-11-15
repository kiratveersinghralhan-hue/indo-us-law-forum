import { describe, expect, it, vi } from 'vitest';
import {
  researchCategories,
  identifyCategory,
} from '../src/config/research-categories';
import {
  createDemoEnvironment,
  demoStoreKey,
} from '../src/admin/mock-admin-provider';
import { createDemoSeed } from '../src/admin/seed';
import {
  submissionPolicyReady,
  notificationPolicyReady,
} from '../supabase/functions/_shared/submission-policy';
import {
  sendSubmissionNotification,
  type NotificationConfig,
} from '../supabase/functions/_shared/submission-notification';

function environment(saved: string | null = null) {
  let value = saved;
  return {
    env: createDemoEnvironment({
      getItem: (key) => (key === demoStoreKey ? value : null),
      setItem: (_, next) => {
        value = next;
      },
    }),
    stored: () => value,
  };
}
describe('confirmed taxonomy and preserved records', () => {
  it('exposes all four exact stable categories and filterable labelled templates', async () => {
    const { env } = environment();
    const categories = (await env.publicProvider.listCategories()).filter(
      (c) => !identifyCategory(c).mappingPending,
    );
    expect(categories).toEqual(researchCategories);
    for (const c of categories) {
      const articles = await env.publicProvider.listArticles({
        category: c.id,
      });
      expect(articles).toHaveLength(1);
      expect(articles[0].categoryLabel).toBe(c.label);
      expect(articles[0].fictional).toBe(true);
    }
    expect(
      (await env.publicProvider.getArticle('a-library-as-a-shared-space'))
        ?.categoryId,
    ).toBe('communities');
    expect(
      (await env.publicProvider.getArticle('a-library-as-a-shared-space'))
        ?.categoryLabel,
    ).toContain('mapping pending');
  });
  it('upgrades old taxonomy in memory without overwriting custom copy, drafts, IDs or storage', async () => {
    const snapshot = createDemoSeed();
    snapshot.settings.categories = snapshot.settings.categories.slice(4);
    snapshot.settings.hero.lines[0] = 'Keep this editorial choice';
    snapshot.settings.hero.introduction =
      'An editorial and research platform taking shape. Explore new questions, considered perspectives and a sample archive of ideas.';
    snapshot.settings.hero.eyebrow = 'Research · Writing · Perspective';
    snapshot.settings.categories[0].label = 'Custom legacy label';
    snapshot.articles = snapshot.articles.filter((a) =>
      ['institutions', 'communities', 'environment'].includes(a.categoryId),
    );
    const original = JSON.stringify(snapshot);
    const { env, stored } = environment(original);
    const upgraded = await env.admin.readSnapshot();
    expect(upgraded.articles).toEqual(snapshot.articles);
    expect(upgraded.settings.hero).toEqual(snapshot.settings.hero);
    expect(upgraded.settings.categories).toHaveLength(7);
    expect(upgraded.settings.categories[4].label).toBe('Custom legacy label');
    expect(stored()).toBe(original);
    await env.admin.saveSettings(upgraded.settings);
    expect(JSON.parse(stored()!).articles).toEqual(snapshot.articles);
  });
  it('rejects changes to exact category names and never resets a corrupt store', async () => {
    const { env } = environment();
    const { settings } = await env.admin.readSnapshot();
    settings.categories[0].label = 'Invented category';
    await expect(env.admin.saveSettings(settings)).rejects.toThrow('exact');
    const broken = environment('{broken');
    await expect(broken.env.admin.readSnapshot()).rejects.toThrow('invalid');
    expect(broken.stored()).toBe('{broken');
  });
});

const reference = '11111111-1111-4111-8111-111111111111';
const config: NotificationConfig = {
  enabled: true,
  provider: 'resend',
  sender: 'sender@example.test',
  recipient: 'editor@example.test',
  apiKey: 'test-key',
  adminOrigin: 'https://forum.example.test',
};
describe('disabled private notification preparation', () => {
  it('keeps source policy gates off and performs no requests for disabled/placeholder settings', async () => {
    expect(submissionPolicyReady).toBe(false);
    expect(notificationPolicyReady).toBe(false);
    const transport = vi.fn();
    for (const c of [
      { ...config, enabled: false },
      { ...config, provider: 'disabled' },
      { ...config, apiKey: 'PLACEHOLDER' },
      { ...config, adminOrigin: 'https://user:password@example.test/' },
    ])
      expect(await sendSubmissionNotification(reference, c, transport)).toEqual(
        { status: 'disabled' },
      );
    expect(transport).not.toHaveBeenCalled();
  });
  it('sends only a reference/admin link with a stable retry key through mocked transport', async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ id: 'mock-provider-reference' })),
      );
    expect(
      await sendSubmissionNotification(reference, config, transport),
    ).toEqual({ status: 'sent', providerReference: 'mock-provider-reference' });
    const [url, options] = transport.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(options?.headers).toHaveProperty(
      'Idempotency-Key',
      `submission/${reference}`,
    );
    const body = JSON.parse(String(options?.body));
    expect(Object.keys(body).sort()).toEqual(['from', 'subject', 'text', 'to']);
    expect(body.text).toContain('https://forum.example.test/admin/submissions');
    expect(body.text).toContain(reference);
  });
  it('separates retryable failures from permanent rejection without throwing away acceptance', async () => {
    for (const status of [429, 503])
      expect(
        await sendSubmissionNotification(
          reference,
          config,
          vi.fn().mockResolvedValue(new Response('', { status })),
        ),
      ).toEqual({
        status: 'failed',
        code: 'provider_temporary',
        retryable: true,
      });
    expect(
      await sendSubmissionNotification(
        reference,
        config,
        vi.fn().mockResolvedValue(new Response('', { status: 403 })),
      ),
    ).toEqual({
      status: 'failed',
      code: 'provider_rejected',
      retryable: false,
    });
    expect(
      await sendSubmissionNotification(
        reference,
        config,
        vi.fn().mockRejectedValue(Error('private provider details')),
      ),
    ).toEqual({ status: 'failed', code: 'transport', retryable: true });
  });
});
