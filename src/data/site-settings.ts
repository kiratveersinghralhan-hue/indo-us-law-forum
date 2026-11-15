import { siteCopy } from '../config/site-copy';

export const homepageSections = [
  { id: 'focus', label: 'Focus areas', visible: true },
  { id: 'featured', label: 'Featured research', visible: true },
  { id: 'repository', label: 'Cases repository', visible: true },
  { id: 'team', label: 'Team preview', visible: true },
  { id: 'contribution', label: 'Contribution invitation', visible: true },
] as const;
export type SectionId = (typeof homepageSections)[number]['id'];
export type SocialLink = { label: string; url: string };
export type PublicSiteSettings = {
  hero: {
    eyebrow: string;
    lines: [string, string, string];
    introduction: string;
  };
  sections: { id: SectionId; label: string; visible: boolean }[];
  contact: { email: string; address: string };
  socialLinks: SocialLink[];
};
export const defaultSiteSettings: PublicSiteSettings = {
  hero: {
    ...siteCopy.hero,
    lines: [...siteCopy.hero.lines] as [string, string, string],
  },
  sections: homepageSections.map((item) => ({ ...item })),
  contact: { email: '', address: '' },
  socialLinks: [],
};
