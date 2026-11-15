export function ErrorToast({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <aside className="editor-error-toast" role="alert" aria-atomic="true">
      <div>
        <strong>Action needs attention</strong>
        <p>{message}</p>
      </div>
      <button type="button" aria-label="Dismiss error" onClick={onDismiss}>
        ×
      </button>
    </aside>
  );
}
