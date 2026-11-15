export const paths = {
  home: '/',
  team: '/team',
  articles: '/articles',
  cases: '/cases',
  submit: '/submit',
  admin: '/admin',
  article: (slug: string) => `/articles/${encodeURIComponent(slug)}`,
  case: (slug: string) => `/cases/${encodeURIComponent(slug)}`,
} as const;
export const navigation = [
  { label: 'Home', to: paths.home },
  { label: 'Team', to: paths.team },
  { label: 'Articles', to: paths.articles },
  { label: 'Cases', to: paths.cases },
] as const;

export const adminPath = (section = '', id?: string) =>
  `${paths.admin}${section ? `/${section}` : ''}${id ? `/${encodeURIComponent(id)}` : ''}`;
