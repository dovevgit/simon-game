import { useEffect, useRef, type KeyboardEvent } from 'react';
import './ConfirmDialog.css';

type ConfirmDialogProps = {
  onCancel: () => void;
  onConfirm: () => void;
};

// Confirmation before deleting the history (DESIGN.md §1.3).
export default function ConfirmDialog({ onCancel, onConfirm }: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus starts on the safe action.
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') onCancel();
  }

  return (
    <div className="confirm-scrim" onKeyDown={handleKeyDown}>
      <div
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-detail"
      >
        <h2 id="confirm-title" className="confirm-dialog__title">
          למחוק את ההיסטוריה?
        </h2>
        <p id="confirm-detail" className="confirm-dialog__detail">
          כל תוצאות המשחקים יימחקו.
        </p>
        {/* RTL: "ביטול" on the right, "מחק" on the left, as in the wireframes */}
        <div className="confirm-dialog__actions">
          <button
            ref={cancelRef}
            type="button"
            className="confirm-dialog__btn confirm-dialog__btn--cancel"
            onClick={onCancel}
          >
            ביטול
          </button>
          <button
            type="button"
            className="confirm-dialog__btn confirm-dialog__btn--delete"
            onClick={onConfirm}
          >
            מחק
          </button>
        </div>
      </div>
    </div>
  );
}
