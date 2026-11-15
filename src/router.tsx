import {
  createBrowserRouter,
  createHashRouter,
  RouterProvider,
} from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Layout } from './components/layout';
import { LoadingState, NotFound } from './components/ui';
import { publicRoutes } from './public-routes';
import { paths } from './config/navigation';
import { StaffGate, StaffLogin } from './backend/auth-ui';
const CatalogPage = lazy(() =>
  import('./backend/admin-tools').then((m) => ({ default: m.CatalogPage })),
);

// Admin UI loads only on admin routes. Public layouts and the 3D bundle retain
// independent loading, and the write provider remains separate from readers.
const AdminLayout = lazy(() =>
  import('./admin/pages').then((module) => ({ default: module.AdminLayout })),
);
const AdminDashboard = lazy(() =>
  import('./admin/pages').then((module) => ({
    default: module.AdminDashboard,
  })),
);
const AdminRecords = lazy(() =>
  import('./admin/pages').then((module) => ({ default: module.AdminRecords })),
);
const AdminRecordEditor = lazy(() =>
  import('./admin/pages').then((module) => ({
    default: module.AdminRecordEditor,
  })),
);
const AdminSubmissions = lazy(() =>
  import('./admin/pages').then((module) => ({
    default: module.AdminSubmissions,
  })),
);
const AdminSettingsPage = lazy(() =>
  import('./admin/pages').then((module) => ({
    default: module.AdminSettingsPage,
  })),
);

// All routing and deployment mode decisions live here. Local history mode only.
const routing: { mode: 'history' | 'hash'; basename: string } = {
  mode: 'history',
  basename: '/',
};
const routes = [
  ...publicRoutes,
  { path: '/admin/login', element: <StaffLogin /> },
  { path: '/admin/recovery', element: <StaffLogin recovery /> },
  {
    path: paths.admin,
    element: (
      <Suspense fallback={<LoadingState />}>
        <StaffGate>
          <AdminLayout />
        </StaffGate>
      </Suspense>
    ),
    children: [
      { index: true, element: <AdminDashboard /> },
      ...(['articles', 'cases', 'team'] as const).flatMap((kind) => [
        { path: kind, element: <AdminRecords kind={kind} /> },
        { path: `${kind}/:id`, element: <AdminRecordEditor kind={kind} /> },
      ]),
      { path: 'submissions', element: <AdminSubmissions /> },
      { path: 'settings', element: <AdminSettingsPage /> },
      { path: 'categories', element: <CatalogPage kind="categories" /> },
      { path: 'authors', element: <CatalogPage kind="authors" /> },
    ],
  },
];
// Data-router navigation enables React Router's maintained unsaved-change
// blocker. It does not provide authentication or authorization.
const router = (
  routing.mode === 'hash' ? createHashRouter : createBrowserRouter
)(
  [
    {
      element: <Layout />,
      children: [...routes, { path: '*', element: <NotFound /> }],
    },
  ],
  { basename: routing.basename },
);
export function AppRouter() {
  return <RouterProvider router={router} />;
}
