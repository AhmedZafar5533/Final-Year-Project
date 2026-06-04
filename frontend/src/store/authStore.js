import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,
  checkAuth: async () => {
    // Prevent double calls if already checking
    if (useAuthStore.getState().isChecking) return;
    set({ isChecking: true });

    try {
      const res = await fetch('http://localhost:5000/api/auth/me', {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        set({ user: data.user, loading: false, isChecking: false });
      } else {
        set({ user: null, loading: false, isChecking: false });
      }
    } catch (err) {
      console.error('Auth check error:', err);
      set({ user: null, loading: false, isChecking: false });
    }
  },
  login: async (email, password) => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) {
        set({ user: data.user });
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
  signup: async (email, password, fullName) => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName }),
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) {
        if (data.requiresVerification) {
          return { success: true, message: data.message };
        }
        set({ user: data.user });
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
  logout: async () => {
    try {
      await fetch('http://localhost:5000/api/auth/logout', { 
        method: 'POST',
        credentials: 'include'
      });
      set({ user: null });
    } catch (err) {
      console.error('Logout error:', err);
    }
  },
  getYoutubeAuthUrl: async () => {
    try {
      const res = await fetch('http://localhost:5000/api/youtube/auth-url', {
        credentials: 'include'
      });
      const data = await res.json();
      return data.url;
    } catch (err) {
      console.error('Error fetching YouTube auth URL:', err);
      return null;
    }
  }
}));
