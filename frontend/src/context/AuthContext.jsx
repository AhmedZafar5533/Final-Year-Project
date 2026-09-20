import { useState, useCallback, useEffect, useRef } from "react";
import api from "../services/api";
import { AuthContext } from "./authContextValue";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  // Track whether the initial auth check is in progress to prevent
  // the api interceptor from redirecting to /login during verification
  const isVerifying = useRef(false);

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      // 1. Check if token or user arrived in URL query (e.g., from Google OAuth callback)
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get("auth_token") || urlParams.get("token");
      const urlUser = urlParams.get("user");

      if (urlToken) {
        localStorage.setItem("token", urlToken);
        if (urlUser) {
          try {
            const parsed = JSON.parse(decodeURIComponent(urlUser));
            const normalized = {
              ...parsed,
              id: parsed.id || parsed._id,
              name: parsed.fullName || parsed.name || parsed.email?.split("@")[0],
              avatar: parsed.avatarUrl || parsed.avatar,
            };
            localStorage.setItem("user", JSON.stringify(normalized));
            setUser(normalized);
            setIsAuthenticated(true);
          } catch {
            // ignore JSON parse error
          }
        }
        // Clean URL parameters without reloading
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }

      const token = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");

      if (storedUser) {
        // Optimistically set the cached user so the UI doesn't flash
        try {
          const cached = JSON.parse(storedUser);
          setUser(cached);
          setIsAuthenticated(true);
        } catch {
          // Invalid JSON in storage, ignore
        }
      }

      isVerifying.current = true;
      try {
        // Verify session with backend (sends Authorization header if token exists, and cookies)
        const response = await api.get("/auth/me");
        const resData = response.data;
        const rawUser = resData?.user || resData?.data;

        if (rawUser) {
          const normalized = {
            ...rawUser,
            id: rawUser.id || rawUser._id,
            name: rawUser.fullName || rawUser.name || rawUser.email?.split("@")[0],
            avatar: rawUser.avatarUrl || rawUser.avatar,
          };
          setUser(normalized);
          setIsAuthenticated(true);
          localStorage.setItem("user", JSON.stringify(normalized));
          if (resData.token) {
            localStorage.setItem("token", resData.token);
          }
        } else if (!token && !storedUser) {
          setUser(null);
          setIsAuthenticated(false);
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }
      } catch (error) {
        // If verify fails with 401, clear credentials
        if (error.response && error.response.status === 401) {
          setUser(null);
          setIsAuthenticated(false);
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }
        // For network errors / 5xx, preserve cached user so user isn't logged out accidentally
      } finally {
        isVerifying.current = false;
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = useCallback(async (email, password) => {
    setIsLoading(true);
    try {
      const response = await api.post("/auth/login", { email, password });
      const resData = response.data;

      if (resData.success || resData.user || resData.token) {
        const token = resData.token || (resData.user ? "authenticated" : "");
        const rawUser = resData.user || resData.data || {};
        const userData = {
          ...rawUser,
          id: rawUser.id || rawUser._id,
          name: rawUser.fullName || rawUser.name || rawUser.email?.split("@")[0],
          avatar: rawUser.avatarUrl || rawUser.avatar,
        };

        if (token) localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(userData));

        setUser(userData);
        setIsAuthenticated(true);
        setIsLoading(false);
        return { success: true };
      } else {
        setIsLoading(false);
        throw new Error(resData.message || resData.error || "Login failed");
      }
    } catch (error) {
      setIsLoading(false);
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Invalid email or password. Please try again.";
      throw new Error(message);
    }
  }, []);

  const signup = useCallback(async (name, email, password) => {
    setIsLoading(true);
    try {
      const response = await api.post("/auth/signup", {
        fullName: name,
        name,
        email,
        password,
      });
      const resData = response.data;

      if (resData.success || resData.user || resData.token) {
        const token = resData.token || (resData.user ? "authenticated" : "");
        const rawUser = resData.user || resData.data || {};
        const userData = {
          ...rawUser,
          id: rawUser.id || rawUser._id,
          name: rawUser.fullName || rawUser.name || rawUser.email?.split("@")[0],
          avatar: rawUser.avatarUrl || rawUser.avatar,
        };

        if (token) localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(userData));

        setUser(userData);
        setIsAuthenticated(true);
        setIsLoading(false);
        return { success: true };
      } else {
        setIsLoading(false);
        throw new Error(resData.message || resData.error || "Signup failed");
      }
    } catch (error) {
      setIsLoading(false);
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Failed to create account. Please try again.";
      throw new Error(message);
    }
  }, []);

  const logout = useCallback(async () => {
    // Immediately clear local state so the UI updates right away
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    try {
      // Call backend logout endpoint to clear the httpOnly cookie
      await api.post("/auth/logout");
    } catch (error) {
      // Even if the API call fails, local state is already cleared
      console.warn("Logout API call failed:", error.message);
    }
  }, []);

  const updateUser = useCallback(async (updates) => {
    try {
      const response = await api.put("/auth/update-profile", updates);

      if (response.data.success) {
        const updatedUser = response.data.data;
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
        return { success: true, data: updatedUser };
      }
    } catch (error) {
      // Fall back to local update if API fails
      console.warn(
        "Profile update API call failed, updating locally:",
        error.message,
      );
      setUser((prev) => {
        const updated = { ...prev, ...updates };
        localStorage.setItem("user", JSON.stringify(updated));
        return updated;
      });
    }
  }, []);

  const value = {
    user,
    isAuthenticated,
    isLoading,
    isVerifying,
    login,
    signup,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
