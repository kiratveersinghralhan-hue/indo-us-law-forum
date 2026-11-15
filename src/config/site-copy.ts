// Client-replaceable public copy. UI validation/actions stay with their components.
export const siteCopy = {
  welcome: {
    title: 'How would you like to explore?',
    description:
      'Explore with cinematic motion and interactive 3D, or enjoy a calmer reading experience.',
    full: 'Experience full motion',
    calm: 'Plain website',
    systemReduced:
      'Your system requests reduced motion. Full is an explicit override for this website; a calm reading experience remains available.',
    websiteOnly:
      'This is a preference for this website, not a browser permission request.',
    changeLater: 'Change your choice at any time using Experience settings in the footer.',
  },
  hero: {
    eyebrow: 'India–US · Disputes · Transactions',
    lines: ['Research across', 'borders.', 'Ideas in dialogue.'],
    introduction:
      'A research wing of student researchers exploring India–US cross-border disputes and transactions. Read our work and contribute to the conversation.',
    caption: 'Indo-US Law Forum / Sample edition',
  },
  focus: {
    eyebrow: '01 / Fields of inquiry',
    title: 'Cross-border questions.',
    italic: 'Four research areas.',
    description:
      'Our research spans four areas of India–US cross-border disputes and transactions.',
  },
  featured: {
    eyebrow: '02 / Selected research',
    title: 'Ideas worth a closer look.',
    description:
      'A curated sample edition. Fictional articles, composed for the reading experience.',
  },
  supporting: {
    eyebrow: 'Further reading',
    title: 'Continue the conversation.',
  },
  repository: {
    eyebrow: '03 / The research archive',
    title: 'India–US disputes,',
    italic: 'in context.',
    description:
      'A repository for disputes involving India–US companies. The initial collection and case metadata are pending; the records below are fictional layout samples.',
    steps: ['Begin with a question.', 'Look closer at the record.'],
    notes: [
      'A starting point, with its context in view.',
      'Keep sources, limitations and interpretation together.',
    ],
  },
  teamPreview: {
    eyebrow: '04 / People & perspectives',
    title: 'The people behind the questions.',
    description:
      'A place for the future editorial team. These neutral studies stand in for approved names, biographies and portraits.',
  },
  contribution: {
    eyebrow: 'An invitation, in preparation',
    title: 'Bring another',
    italic: 'perspective.',
    description:
      'We publish work by in-house student researchers and welcome contributions from other students. Guidelines and the private review workflow are being prepared.',
  },
  articles: {
    eyebrow: 'The reading room / Sample edition',
    title: 'Articles',
    introduction:
      'Student research on India–US cross-border disputes and transactions. Explore the four research areas; all current articles are clearly labelled layout samples.',
  },
  team: {
    eyebrow: 'People & perspectives',
    title: 'The team',
    introduction:
      'A space for the people who will shape the work. Names, roles, biographies and portraits remain provisional.',
    note: 'No real team identities are represented here. Neutral avatar artwork is a placeholder.',
  },
  cases: {
    eyebrow: 'Knowledge repository / Sample records',
    title: 'Cases & research notes',
    introduction:
      'Cases concerning disputes involving India–US companies. The initial collection, metadata, filters and documents await a real case example. Current records are fictional layout samples, not legal authorities.',
  },
  submit: {
    eyebrow: 'Contribute / Form preview',
    title: 'Submit an article',
    introduction:
      'Contributions from students are welcome. PDF and Word versions are requested; submission guidelines and the double-blind review workflow await confirmation. Live intake remains disabled.',
    notice: 'Prototype — submissions are not sent',
    instructions:
      'Use fictional sample text only. Do not enter names, emails, contact details or other personal information.',
    privacy:
      'This form only checks required fields. Uploads and delivery are disabled, and it has no personal-data fields. Your text stays in this page and is discarded when you leave.',
    steps: [
      'Frame a clear question.',
      'Outline the context and approach.',
      'Identify the sources a full article would need.',
    ],
  },
  footer: {
    eyebrow: 'An edition in preparation',
    lineOne: 'Space for research.',
    lineTwo: 'Room for perspective.',
    description:
      'Indo-US Law Forum brings student research to India–US cross-border disputes and transactions. Approved articles, team profiles and contact information are pending.',
  },
  sampleNotice:
    'Demonstration content. Articles, profiles and repository records are fictional; the organization and four research areas are confirmed. Approved publication content is pending.',
} as const;
