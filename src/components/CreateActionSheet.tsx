interface CreateActionSheetProps {
  open: boolean;
  onClose: () => void;
  onCreateSong: () => void;
  onPromptFlow: () => void;
}

export function CreateActionSheet({
  open,
  onClose,
  onCreateSong,
  onPromptFlow,
}: CreateActionSheetProps) {
  if (!open) return null;

  return (
    <div className="sheet-overlay" onClick={onClose} role="presentation">
      <div
        className="sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Create options"
      >
        <div className="sheet-handle" aria-hidden="true" />
        <h2 className="sheet-title">Create something new</h2>
        <p className="sheet-subtitle">Choose how you want to start</p>

        <div className="sheet-options">
          <button
            type="button"
            className="sheet-option"
            onClick={() => {
              onCreateSong();
              onClose();
            }}
          >
            <span className="sheet-option-icon" aria-hidden="true">✦</span>
            <div>
              <strong>Create a song</strong>
              <span>Go straight to the song generator</span>
            </div>
          </button>

          <button
            type="button"
            className="sheet-option sheet-option--alt"
            onClick={() => {
              onPromptFlow();
              onClose();
            }}
          >
            <span className="sheet-option-icon" aria-hidden="true">✎</span>
            <div>
              <strong>Get a prompt &amp; create</strong>
              <span>Build a lyrics prompt for your AI, then generate</span>
            </div>
          </button>
        </div>

        <button type="button" className="btn btn-ghost btn-full" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
