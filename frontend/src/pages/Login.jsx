import AuthAside from "../components/auth/AuthAside";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import {
  IoMailOutline,
  IoLockClosedOutline,
  IoEyeOutline,
  IoEyeOffOutline,
  IoArrowForward,
  IoLogoGoogle,
  IoSparkles,
  IoAlertCircle,
} from "react-icons/io5";
import { useAuth } from "../hooks/useAuth";

const Login = () => {
  const navigate = useNavigate();
  const { login, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get("error");
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }
  }, []);

  const validateForm = () => {
    const errors = {};

    if (!email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email address";
    }

    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        navigate("/dashboard");
      }
    } catch {
      setError("Invalid email or password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = () => {
    const apiBase = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace(/\/+$/, "")
      : "http://localhost:5000/api";
    window.location.href = `${apiBase}/auth/login`;
  };

  const isLoading = isSubmitting || authLoading;

  return (
    <div className="min-h-screen flex bg-background">
      <AuthAside />

      {/* Right Side - Form */}
      <div className="auth-form-panel flex-1 flex items-center justify-center px-6 sm:px-12 lg:px-16 py-12">
        <Motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <Motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-12"
          >
            <Link to="/" className="inline-flex items-center gap-3 group">
              <div className="relative">
                <Motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="absolute -inset-1 bg-gradient-to-r from-primary-500 via-accent-500 to-primary-500 rounded-xl opacity-30 group-hover:opacity-50 transition-opacity"
                />
                <div className="relative w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center">
                  <svg
                    width="26"
                    height="26"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-white"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      className="opacity-90"
                    />
                    <path
                      d="M8 14V12M12 14V9M16 14V11"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>
              <div>
                <span className="text-2xl font-bold text-text-primary">
                  Only<span className="text-primary-600">Creators</span>
                </span>
              </div>
            </Link>
          </Motion.div>

          {/* Header */}
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-10"
          >
            <h1 className="text-4xl font-bold text-text-primary mb-3">
              Sign in
            </h1>
            <p className="text-text-muted text-lg">
              Continue to your workspace.
            </p>
          </Motion.div>

          {/* Error Message */}
          {error && (
            <Motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-error-50 border border-error-200 rounded-xl flex items-center gap-3 text-error-700"
            >
              <IoAlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">{error}</span>
            </Motion.div>
          )}

          {/* Google Login */}
          <Motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            whileHover={{ scale: 1.01, y: -2 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleGoogleLogin}
            type="button"
            className="w-full flex items-center justify-center gap-3 py-4 bg-white border-2 border-secondary-200 rounded-2xl text-text-primary font-medium hover:border-secondary-300 hover:shadow-lg transition-all mb-8"
          >
            <IoLogoGoogle className="w-5 h-5 text-red-800" />
            <span>Continue with Google</span>
          </Motion.button>

          {/* Divider */}
          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-2 border-secondary-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-6 text-text-muted bg-background font-medium">
                or
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <Motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <label className="block text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wider">
                Email
              </label>
              <div
                className={`relative rounded-2xl transition-all duration-300 ${
                  focusedField === "email"
                    ? "ring-2 ring-primary-500 ring-offset-2"
                    : validationErrors.email
                      ? "ring-2 ring-error-500 ring-offset-2"
                      : ""
                }`}
              >
                <IoMailOutline
                  className={`absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                    focusedField === "email"
                      ? "text-primary-900"
                      : validationErrors.email
                        ? "text-error-500"
                        : "text-secondary-400"
                  }`}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (validationErrors.email) {
                      setValidationErrors((prev) => ({ ...prev, email: "" }));
                    }
                  }}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="your@email.com"
                  autoComplete="email"
                  className="w-full pl-14 pr-5 py-4 bg-surface-100 border-2 border-transparent rounded-2xl text-text-primary placeholder:text-secondary-400 focus:outline-none focus:bg-white focus:border-primary-500 transition-all text-lg"
                />
              </div>
              {validationErrors.email && (
                <Motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 text-sm text-error-600 flex items-center gap-1"
                >
                  <IoAlertCircle className="w-4 h-4" />
                  {validationErrors.email}
                </Motion.p>
              )}
            </Motion.div>

            {/* Password */}
            <Motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary-900 hover:text-primary-700 font-medium transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>
              <div
                className={`relative rounded-2xl transition-all duration-300 ${
                  focusedField === "password"
                    ? "ring-2 ring-primary-500 ring-offset-2"
                    : validationErrors.password
                      ? "ring-2 ring-error-500 ring-offset-2"
                      : ""
                }`}
              >
                <IoLockClosedOutline
                  className={`absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                    focusedField === "password"
                      ? "text-primary-900"
                      : validationErrors.password
                        ? "text-error-500"
                        : "text-secondary-400"
                  }`}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (validationErrors.password) {
                      setValidationErrors((prev) => ({
                        ...prev,
                        password: "",
                      }));
                    }
                  }}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-14 pr-14 py-4 bg-surface-100 border-2 border-transparent rounded-2xl text-text-primary placeholder:text-secondary-400 focus:outline-none focus:bg-white focus:border-primary-500 transition-all text-lg"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-text-secondary transition-colors"
                >
                  {showPassword ? (
                    <IoEyeOffOutline className="w-5 h-5" />
                  ) : (
                    <IoEyeOutline className="w-5 h-5" />
                  )}
                </button>
              </div>
              {validationErrors.password && (
                <Motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 text-sm text-error-600 flex items-center gap-1"
                >
                  <IoAlertCircle className="w-4 h-4" />
                  {validationErrors.password}
                </Motion.p>
              )}
            </Motion.div>

            {/* Submit */}
            <Motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="pt-2"
            >
              <Motion.button
                whileHover={{ scale: isLoading ? 1 : 1.01 }}
                whileTap={{ scale: isLoading ? 1 : 0.99 }}
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-primary-700 hover:bg-primary-800 disabled:bg-primary-400 disabled:cursor-not-allowed text-white rounded-2xl font-semibold text-lg shadow-lg shadow-primary-900/30 hover:shadow-xl hover:shadow-primary-900/40 transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full"
                  />
                ) : (
                  <>
                    Sign in
                    <IoArrowForward className="w-5 h-5" />
                  </>
                )}
              </Motion.button>
            </Motion.div>
          </form>

          {/* Sign Up */}
          <Motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-10 text-center text-text-muted text-lg"
          >
            New to OnlyCreators?{" "}
            <Link
              to="/signup"
              className="text-primary-900 hover:text-primary-700 font-semibold transition-colors"
            >
              Create an account
            </Link>
          </Motion.p>
        </Motion.div>
      </div>
    </div>
  );
};

export default Login;
