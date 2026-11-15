import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import type { JSONContent } from '@tiptap/react';
import type { ContentBlock } from '../data/types';
import { Button } from '../components/ui';
import { useEffect } from 'react';
const textNode = (text: string) => (text ? [{ type: 'text', text }] : []);
function toDocument(blocks: ContentBlock[]): JSONContent {
  return {
    type: 'doc',
    content: blocks.map((b) =>
      b.type === 'list'
        ? {
            type: 'bulletList',
            content: b.items.map((text) => ({
              type: 'listItem',
              content: [{ type: 'paragraph', content: textNode(text) }],
            })),
          }
        : b.type === 'note'
          ? {
              type: 'blockquote',
              content: [{ type: 'paragraph', content: textNode(b.text) }],
            }
          : {
              type: b.type === 'heading' ? 'heading' : 'paragraph',
              attrs: b.type === 'heading' ? { level: 2 } : undefined,
              content: textNode(b.text),
            },
    ),
  };
}
import { fromDocument } from './editor-format';
export function RichEditor({
  blocks,
  onChange,
  errors = {},
}: {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
  errors?: Record<string, string>;
}) {
  const editor = useEditor({
    // The rendered server authorizes only this response's injected stylesheet.
    // Ordinary Vite development has no nonce/CSP and retains existing behavior.
    injectNonce:
      typeof document === 'undefined'
        ? undefined
        : document.querySelector<HTMLScriptElement>(
            'script[type="module"][nonce]',
          )?.nonce,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2] },
        bold: false,
        italic: false,
        strike: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        orderedList: false,
        link: false,
        underline: false,
        dropcursor: false,
        gapcursor: false,
      }),
    ],
    content: toDocument(blocks),
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-label': 'Article or case content',
        'aria-multiline': 'true',
        class: 'structured-rich-editor',
        id: 'body',
        'aria-describedby': 'body-hint body-errors',
      },
    },
    onUpdate: ({ editor }) => onChange(fromDocument(editor.getJSON())),
  });
  useEffect(() => {
    if (!editor) return;
    editor.view.dom.setAttribute(
      'aria-invalid',
      String(Object.keys(errors).length > 0),
    );
    editor.view.dom
      .querySelectorAll('[data-content-invalid]')
      .forEach((element) => element.removeAttribute('data-content-invalid'));
    Object.keys(errors).forEach((key) => {
      const [, block, , bullet] = key.split('.');
      const element = editor.view.dom.children[Number(block)];
      const item =
        bullet === undefined
          ? element
          : element?.querySelectorAll(':scope > li')[Number(bullet)];
      item?.setAttribute('data-content-invalid', 'true');
    });
  }, [editor, errors, blocks]);
  function locate(key: string) {
    if (!editor) return;
    const [, block, , bullet] = key.split('.');
    let position = 0;
    const blockIndex = Number(block) || 0;
    for (
      let index = 0;
      index < blockIndex && index < editor.state.doc.childCount;
      index++
    )
      position += editor.state.doc.child(index).nodeSize;
    const node = editor.state.doc.child(
      Math.min(blockIndex, editor.state.doc.childCount - 1),
    );
    if (bullet !== undefined && node.type.name === 'bulletList') {
      position++;
      for (
        let index = 0;
        index < Number(bullet) && index < node.childCount;
        index++
      )
        position += node.child(index).nodeSize;
      position += 2;
    } else position++;
    editor
      .chain()
      .focus()
      .setTextSelection(Math.min(position, editor.state.doc.content.size))
      .scrollIntoView()
      .run();
  }
  return (
    <fieldset className="admin-fieldset">
      <legend>Structured content</legend>
      <p className="field-hint" id="body-hint">
        Paragraphs, section headings, bullet lists and editorial notes. Pasted
        formatting is limited; stored content is structured text, never HTML.
      </p>
      <div
        className="admin-actions"
        role="toolbar"
        aria-label="Content formatting"
      >
        <Button
          type="button"
          variant="secondary"
          onClick={() => editor?.chain().focus().setParagraph().run()}
        >
          Paragraph
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          Heading
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          Bullet list
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        >
          Note
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => editor?.chain().focus().undo().run()}
        >
          Undo
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => editor?.chain().focus().redo().run()}
        >
          Redo
        </Button>
      </div>
      <EditorContent editor={editor} />
      <div id="body-errors" className="editor-content-errors">
        {Object.entries(errors).map(([key, message]) => (
          <p key={key} className="field-error">
            <button
              type="button"
              data-content-error={key}
              onClick={() => locate(key)}
            >
              {message} <span>Go to item</span>
            </button>
          </p>
        ))}
      </div>
    </fieldset>
  );
}
