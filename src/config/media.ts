// Original local SVG studies: no third-party photos, models, fonts or licensing dependency.
const asset = (file: string) =>
  `${import.meta.env.BASE_URL}artwork/${file}.svg`;
export const editorialMedia = {
  institutions: {
    src: asset('institutions'),
    alt: 'Navy and white architectural illustration of two civic structures in perspective.',
    caption: 'Study 01 / Structures & decisions',
  },
  communities: {
    src: asset('communities'),
    alt: 'Navy and white civic arches arranged across a shared public square.',
    caption: 'Study 02 / Shared spaces',
  },
  environment: {
    src: asset('environment'),
    alt: 'Pale topographic contours across a navy landscape beneath an abstract blue sun.',
    caption: 'Study 03 / Landscape & observation',
  },
  archive: {
    src: asset('archive'),
    alt: 'White archival pages and navy coordinate marks on a blue field.',
    caption: 'Study 04 / Records & context',
  },
  avatar: {
    src: asset('avatar'),
    alt: 'Neutral abstract avatar; no real person is depicted.',
    caption: 'Neutral profile study / Identity pending',
  },
} as const;
export type ArtworkId = keyof typeof editorialMedia;
