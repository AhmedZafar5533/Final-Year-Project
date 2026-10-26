import { useState } from "react";

export default function UserAvatar({ src, name = "Creator", className = "w-10 h-10" }) {
  const [failedSrc, setFailedSrc] = useState(null);
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  return src && src !== failedSrc ? <img src={src} alt={name} onError={() => setFailedSrc(src)} className={`rounded-xl object-cover shrink-0 ${className}`} />
    : <span role="img" aria-label={name} className={`rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-200 inline-flex items-center justify-center font-medium shrink-0 ${className}`}>{initials || "C"}</span>;
}
