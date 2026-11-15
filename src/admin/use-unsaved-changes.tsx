import { useEffect, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import { ConfirmDialog } from './ui';
export function useUnsavedChanges(dirty: boolean) {
  const blocker = useBlocker(dirty);
  const [pending, setPending] = useState<null | (() => void)>(null);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const blocked = blocker.state === 'blocked';
  return {
    requestLeave(action: () => void) {
      if (dirty) setPending(() => action);
      else action();
    },
    dialog: (blocked || pending) && (
      <ConfirmDialog
        title="Discard unsaved changes?"
        confirmLabel="Discard changes"
        onCancel={() => {
          setPending(null);
          if (blocked) blocker.reset();
        }}
        onConfirm={() => {
          const action = pending;
          setPending(null);
          if (blocked) blocker.proceed();
          else action?.();
        }}
      >
        <p>
          Unsaved changes will be lost. Saved records will remain.
        </p>
      </ConfirmDialog>
    ),
  };
}
