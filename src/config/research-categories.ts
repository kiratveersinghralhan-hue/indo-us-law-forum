import type { Category } from '../data/types';

// Stable public slugs. Database UUIDs and existing record relationships stay intact.
export const researchCategories: Category[] = [
  {
    id: 'cross-border-insolvency-and-restructuring',
    label: 'Cross Border Insolvency and Restructuring',
    description:
      'Research on insolvency and restructuring across India–US borders.',
  },
  {
    id: 'ma-and-foreign-investment-regulation',
    label: 'M&A and Foreign Investment Regulation',
    description:
      'Research on cross-border transactions and foreign investment regulation.',
  },
  {
    id: 'cross-border-dispute-resolution-and-enforcement',
    label: 'Cross Border Dispute Resolution and Enforcement',
    description:
      'Research on resolving cross-border disputes and enforcing outcomes.',
  },
  {
    id: 'regulatory-exposure-and-enforcement',
    label: 'Regulatory Exposure and Enforcement',
    description:
      'Research on regulatory exposure and enforcement in an India–US context.',
  },
];

export function identifyCategory<T extends Category>(
  category: T,
): T & { slug?: string; mappingPending: boolean } {
  const confirmed = ['institutions', 'communities', 'environment'].includes(
    category.id,
  )
    ? undefined
    : researchCategories.find((c) => c.label === category.label);
  return { ...category, slug: confirmed?.id, mappingPending: !confirmed };
}
export function categoryDisplay(category?: Category): string {
  if (!category) return 'Category review pending';
  return `${category.label}${identifyCategory(category).mappingPending ? ' (mapping pending)' : ''}`;
}
