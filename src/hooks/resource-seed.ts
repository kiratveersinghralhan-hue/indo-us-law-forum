import { createContext } from 'react';
// Request-scoped, public read results only; never Auth/session/admin state.
export const ResourceSeedContext = createContext<Record<string, unknown>>({});
