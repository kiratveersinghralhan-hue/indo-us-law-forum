import { createContext, useContext } from 'react';
import { defaultSiteSettings } from './site-settings';
export const PublicSiteContext = createContext(defaultSiteSettings);
export const usePublicSite = () => useContext(PublicSiteContext);
