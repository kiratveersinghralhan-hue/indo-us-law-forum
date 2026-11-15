import { createContext, useContext } from 'react';
import type { ContentProvider } from './types';

export const ContentProviderContext = createContext<ContentProvider | null>(
  null,
);
export function useContentProvider() {
  const provider = useContext(ContentProviderContext);
  if (!provider) throw new Error('A content provider is required.');
  return provider;
}
