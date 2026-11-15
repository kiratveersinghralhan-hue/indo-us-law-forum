import type { JSONContent } from '@tiptap/react';
import type { ContentBlock } from '../data/types';
const plain = (node: JSONContent): string =>
  node.type === 'hardBreak'
    ? '\n'
    : (node.text ??
      node.content
        ?.map(plain)
        .join(
          ['listItem', 'blockquote', 'bulletList'].includes(node.type ?? '')
            ? '\n\n'
            : '',
        ) ??
      '');
export function fromDocument(doc: JSONContent): ContentBlock[] {
  const nodes = [...(doc.content ?? [])];
  // Tiptap appends an empty paragraph after a list/note. Only trailing empty
  // paragraphs are editor scaffolding; empty bullets/interior blocks remain errors.
  while (nodes.at(-1)?.type === 'paragraph' && !plain(nodes.at(-1)!).trim())
    nodes.pop();
  return nodes.map((n) =>
    n.type === 'bulletList'
      ? { type: 'list', items: (n.content ?? []).map(plain) }
      : {
          type:
            n.type === 'heading'
              ? 'heading'
              : n.type === 'blockquote'
                ? 'note'
                : 'paragraph',
          text: plain(n),
        },
  );
}
