import React, { useEffect, useState } from 'react';
import { requestMedia } from '../lib/media-files';
export function useSecureMedia(src?: string) {
  const managed = !!src && (/^gs:\/\//.test(src) || /firebasestorage\.googleapis|127\.0\.0\.1:\d+\/v0\/b\//.test(src)) && !/publicMedia(?:%2F|\/)/.test(src);
  const [resolved, setResolved] = useState<string | undefined>(managed ? undefined : src);
  useEffect(() => {
    if (!managed) { setResolved(src); return; }
    setResolved(undefined); const controller = new AbortController(); let url = '';
    void requestMedia(src!, 'preview', '', controller.signal).then(r => r.blob()).then(blob => { if (!controller.signal.aborted) { url = URL.createObjectURL(blob); setResolved(url); } }).catch(() => {});
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [src, managed]);
  return resolved;
}
export function SecureImage({ src, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) { const resolved = useSecureMedia(src); return <img {...props} src={resolved} />; }
export function SecureVideo({ src, ...props }: React.VideoHTMLAttributes<HTMLVideoElement>) { const resolved = useSecureMedia(src); return <video {...props} src={resolved} />; }
