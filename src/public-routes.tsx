import { HomePage } from './pages/home';
import { TeamPage } from './pages/team';
import { ArticlesPage, CasesPage } from './pages/collections';
import { ArticleDetailPage, CaseDetailPage } from './pages/details';
import { SubmitPage } from './pages/submit';
import { paths } from './config/navigation';

// Shared by browser navigation and the local HTTP renderer.
export const publicRoutes = [
  { path: paths.home, element: <HomePage /> },
  { path: paths.team, element: <TeamPage /> },
  { path: paths.articles, element: <ArticlesPage /> },
  { path: `${paths.articles}/:slug`, element: <ArticleDetailPage /> },
  { path: paths.cases, element: <CasesPage /> },
  { path: `${paths.cases}/:slug`, element: <CaseDetailPage /> },
  { path: paths.submit, element: <SubmitPage /> },
];
