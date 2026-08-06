import { useEffect } from 'react';

export default function Toast({
  title,
  message,
  onClose,
}: {
  title: string;
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <button
      onClick={onClose}
      className="fixed top-4 right-4 z-[60] max-w-xs rounded-xl border border-line bg-surface px-4 py-3 text-left shadow-2xl animate-fade-in"
    >
      <p className="text-xs font-semibold text-amber">{title}</p>
      <p className="mt-0.5 text-sm text-ink line-clamp-2">{message}</p>
    </button>
  );
}
