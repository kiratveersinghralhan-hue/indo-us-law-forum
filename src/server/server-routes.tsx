import { useRoutes } from 'react-router-dom';
import { Layout } from '../components/layout';
import { NotFound } from '../components/ui';
import { publicRoutes } from '../public-routes';

export function ServerRoutes() {
  return useRoutes([
    {
      element: <Layout />,
      children: [...publicRoutes, { path: '*', element: <NotFound /> }],
    },
  ]);
}
