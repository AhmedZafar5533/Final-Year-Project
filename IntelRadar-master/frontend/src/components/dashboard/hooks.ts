"use client";

import { useEffect, useState } from "react";

import { API_BASE, apiFetch } from "@/lib/dashboard";

export type BackendStatus = "checking" | "online" | "offline";

/**
 * Polls the FastAPI health endpoint so the shell reflects the real state of the
 * intelligence engine instead of a hard-coded label.
 */
export function useBackendHealth(intervalMs = 30000): BackendStatus {
  const [status, setStatus] = useState<BackendStatus>("checking");

  useEffect(() => {
    let cancelled = false;

    const check = () => {
      apiFetch(`${API_BASE}/api/health`)
        .then((res) => {
          if (!cancelled) setStatus(res.ok ? "online" : "offline");
        })
        .catch(() => {
          if (!cancelled) setStatus("offline");
        });
    };

    check();
    const timer = window.setInterval(check, intervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [intervalMs]);

  return status;
}

/** True once the window has scrolled past `threshold` pixels. */
export function useScrolled(threshold = 8) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    const raf = requestAnimationFrame(onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, [threshold]);

  return scrolled;
}
