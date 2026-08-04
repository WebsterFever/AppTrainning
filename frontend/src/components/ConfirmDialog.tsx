export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  danger,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <div
        className="bg-chalk rounded-sm max-w-sm w-full p-6 border border-line animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-xl text-ink">{title}</h3>
        <p className="text-ink/70 text-sm mt-2">{message}</p>
        <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <button onClick={onCancel} className="btn-outline text-sm">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`btn text-sm px-4 py-2 ${danger ? 'bg-coral hover:bg-coral/90 text-white' : 'bg-ink hover:bg-ink/90 text-chalk'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
