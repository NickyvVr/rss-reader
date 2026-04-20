import { useState, useEffect, useCallback } from 'react';

let _addToast = null;

export function useToast() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    _addToast = (message, type = 'success') => {
      const id = Date.now();
      setToasts(prev => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 3000);
    };
    return () => { _addToast = null; };
  }, []);

  return { toasts };
}

export function toast(message, type = 'success') {
  _addToast?.(message, type);
}

export function ToastContainer({ toasts }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-lg text-sm font-medium shadow-xl transition-all
            ${t.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
