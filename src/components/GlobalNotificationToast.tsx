import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { NotificationPayload } from '../lib/sound-notifications';

export const GlobalNotificationToast: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);

  useEffect(() => {
    const handleNotification = (e: Event) => {
      const customEvent = e as CustomEvent<NotificationPayload>;
      if (!customEvent.detail) return;
      const item = customEvent.detail;
      setNotifications(prev => [item, ...prev].slice(0, 4));

      const timer = setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== item.id));
      }, item.duration || 4500);

      return () => clearTimeout(timer);
    };

    window.addEventListener('aram-notification', handleNotification);
    return () => window.removeEventListener('aram-notification', handleNotification);
  }, []);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  if (notifications.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-5 right-5 z-[99999] flex flex-col gap-3 max-w-sm w-full pointer-events-none"
    >
      {notifications.map(n => {
        const isSuccess = n.type === 'success';
        const isError = n.type === 'error';

        return (
          <div
            key={n.id}
            role="status"
            className="pointer-events-auto transform transition-all duration-300 ease-out animate-slide-in-down rounded-2xl bg-white border border-stone-200/90 shadow-2xl p-4 flex items-start gap-3 relative overflow-hidden"
            style={{
              boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0,0,0,0.05)'
            }}
          >
            {/* Left Accent Stripe */}
            <div
              className={`absolute top-0 left-0 bottom-0 w-1.5 ${
                isSuccess
                  ? 'bg-emerald-500'
                  : isError
                  ? 'bg-rose-500'
                  : 'bg-stone-900'
              }`}
            />

            {/* Icon */}
            <div className="shrink-0 mt-0.5">
              {isSuccess && (
                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                  <CheckCircle2 className="w-4 h-4 stroke-[2.2]" />
                </div>
              )}
              {isError && (
                <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-100">
                  <AlertCircle className="w-4 h-4 stroke-[2.2]" />
                </div>
              )}
              {!isSuccess && !isError && (
                <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-700 border border-stone-200">
                  <Info className="w-4 h-4 stroke-[2.2]" />
                </div>
              )}
            </div>

            {/* Text details */}
            <div className="flex-1 min-w-0 pr-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-stone-900 mb-0.5">
                {n.title}
              </h4>
              <p className="text-xs text-stone-600 leading-relaxed break-words font-medium">
                {n.message}
              </p>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => removeNotification(n.id)}
              className="shrink-0 p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
              aria-label="Κλείσιμο ειδοποίησης"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

