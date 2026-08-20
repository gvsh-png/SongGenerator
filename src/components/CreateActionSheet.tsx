interface CreateActionSheetProps {
  open: boolean;
  onClose: () => void;
  onCreateSong: () => void;
  onWriteLyrics: () => void;
  onPromptFlow: () => void;
}

export function CreateActionSheet({
  open,
  onClose,
  onCreateSong,
  onWriteLyrics,
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
              <span>Describe your track and generate</span>
            </div>
          </button>

          <button
            type="button"
            className="sheet-option sheet-option--alt"
            onClick={() => {
              onWriteLyrics();
              onClose();
            }}
          >
            <span className="sheet-option-icon" aria-hidden="true">📝</span>
            <div>
              <strong>Write your lyrics</strong>
              <span>Pick length, write lyrics, generate song</span>
            </div>
          </button>

          <button
            type="button"
            className="sheet-option"
            onClick={() => {
              onPromptFlow();
              onClose();
            }}
          >
            <span className="sheet-option-icon" aria-hidden="true">✎</span>
            <div>
              <strong>Get a prompt &amp; create</strong>
              <span>Use an AI prompt template, then generate</span>
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
