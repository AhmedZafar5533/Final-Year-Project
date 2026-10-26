import AuthAside from "../components/auth/AuthAside";
import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion as Motion, AnimatePresence } from "framer-motion";
import {
  IoLockClosedOutline,
  IoEyeOutline,
  IoEyeOffOutline,
  IoArrowForward,
  IoSparkles,
  IoCheckmarkCircle,
  IoCloseCircle,
  IoShieldCheckmark,
  IoAlertCircle,
} from "react-icons/io5";

// Password requirements
const passwordRequirements = [
  { id: "length", label: "8+ characters", test: (p) => p.length >= 8 },
  { id: "uppercase", label: "Uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { id: "lowercase", label: "Lowercase letter", test: (p) => /[a-z]/.test(p) },
  { id: "number", label: "Number", test: (p) => /\d/.test(p) },
  {
    id: "special",
    label: "Special character",
    test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p),
  },
];

// Steps
const STEPS = {
  RESET: "reset",
  SUCCESS: "success",
  EXPIRED: "expired",
  INVALID: "invalid",
};

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [currentStep, setCurrentStep] = useState(STEPS.RESET);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState(null);

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setCurrentStep(STEPS.INVALID);
        setIsValidating(false);
        return;
      }

      try {
        // Simulate token validation API call
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // For demo: Check if token looks valid (in real app, validate with backend)
        // Simulate expired token if it contains "expired"
        if (token.includes("expired")) {
          setCurrentStep(STEPS.EXPIRED);
        } else if (token.length < 10) {
          setCurrentStep(STEPS.INVALID);
        } else {
          setCurrentStep(STEPS.RESET);
        }
      } catch {
        setCurrentStep(STEPS.INVALID);
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    return passwordRequirements.filter((req) => req.test(password)).length;
  }, [password]);

  const getStrengthColor = () => {
    if (passwordStrength <= 1) return "bg-error-500";
    if (passwordStrength <= 2) return "bg-warning-500";
    if (passwordStrength <= 3) return "bg-warning-400";
    if (passwordStrength <= 4) return "bg-success-400";
    return "bg-success-500";
  };

  const getStrengthText = () => {
    if (passwordStrength <= 1) return "Weak";
    if (passwordStrength <= 2) return "Fair";
    if (passwordStrength <= 3) return "Good";
    if (passwordStrength <= 4) return "Strong";
    return "Excellent";
  };

  const getStrengthTextColor = () => {
    if (passwordStrength <= 2) return "text-error-600";
    if (passwordStrength <= 3) return "text-warning-600";
    return "text-success-600";
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!password) {
      setError("Please enter a new password");
      return;
    }

    if (passwordStrength < 3) {
      setError("Please create a stronger password");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Success
      setCurrentStep(STEPS.SUCCESS);
    } catch (err) {
      setError(err.message || "Failed to reset password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state while validating token
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <Motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-3 border-primary-200 border-t-primary-700 rounded-full mx-auto mb-4"
          />
          <p className="text-text-muted">Validating reset link...</p>
        </Motion.div>
      </div>
    );
  }

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

          <AnimatePresence mode="wait">
            {/* Reset Form */}
            {currentStep === STEPS.RESET && (
              <Motion.div
                key="reset-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Header */}
                <Motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mb-8"
                >
                  <h1 className="text-4xl font-bold text-text-primary mb-3">
                    Reset password
                  </h1>
                  <p className="text-text-muted text-lg">
                    Create a new secure password for your account
                  </p>
                </Motion.div>

                {/* Error Message */}
                <AnimatePresence>
                  {error && (
                    <Motion.div
                      initial={{ opacity: 0, y: -10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -10, height: 0 }}
                      className="mb-6 p-4 bg-error-50 border border-error-200 rounded-2xl flex items-center gap-3"
                    >
                      <IoCloseCircle className="w-5 h-5 text-error-500 flex-shrink-0" />
                      <p className="text-error-700 text-sm">{error}</p>
                    </Motion.div>
                  )}
                </AnimatePresence>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* New Password Field */}
                  <Motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <label className="block text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wider">
                      New Password
                    </label>
                    <div
                      className={`relative rounded-2xl transition-all duration-300 ${
                        focusedField === "password"
                          ? "ring-2 ring-primary-500 ring-offset-2"
                          : ""
                      }`}
                    >
                      <IoLockClosedOutline
                        className={`absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                          focusedField === "password"
                            ? "text-primary-900"
                            : "text-secondary-400"
                        }`}
                      />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setError("");
                        }}
                        onFocus={() => setFocusedField("password")}
                        onBlur={() => setFocusedField(null)}
                        placeholder="Create a strong password"
                        disabled={isLoading}
                        className="w-full pl-14 pr-14 py-4 bg-surface-100 border-2 border-transparent rounded-2xl text-text-primary placeholder:text-secondary-400 focus:outline-none focus:bg-white focus:border-primary-500 transition-all text-lg disabled:opacity-50"
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

                    {/* Password Strength Indicator */}
                    <AnimatePresence>
                      {password && (
                        <Motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 space-y-3"
                        >
                          {/* Strength bar */}
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-secondary-100 rounded-full overflow-hidden flex gap-1">
                              {[1, 2, 3, 4, 5].map((level) => (
                                <Motion.div
                                  key={level}
                                  initial={{ scaleX: 0 }}
                                  animate={{
                                    scaleX: passwordStrength >= level ? 1 : 0,
                                  }}
                                  className={`flex-1 h-full origin-left transition-all duration-300 ${
                                    passwordStrength >= level
                                      ? getStrengthColor()
                                      : "bg-secondary-200"
                                  }`}
                                />
                              ))}
                            </div>
                            <span
                              className={`text-sm font-semibold min-w-[70px] ${getStrengthTextColor()}`}
                            >
                              {getStrengthText()}
                            </span>
                          </div>

                          {/* Requirements */}
                          <div className="grid grid-cols-2 gap-2">
                            {passwordRequirements.map((req) => {
                              const passed = req.test(password);
                              return (
                                <Motion.div
                                  key={req.id}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  className={`flex items-center gap-2 text-sm transition-colors ${
                                    passed
                                      ? "text-success-600"
                                      : "text-secondary-400"
                                  }`}
                                >
                                  <IoCheckmarkCircle
                                    className={`w-4 h-4 ${passed ? "opacity-100" : "opacity-30"}`}
                                  />
                                  <span>{req.label}</span>
                                </Motion.div>
                              );
                            })}
                          </div>
                        </Motion.div>
                      )}
                    </AnimatePresence>
                  </Motion.div>

                  {/* Confirm Password Field */}
                  <Motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <label className="block text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wider">
                      Confirm Password
                    </label>
                    <div
                      className={`relative rounded-2xl transition-all duration-300 ${
                        focusedField === "confirmPassword"
                          ? "ring-2 ring-primary-500 ring-offset-2"
                          : ""
                      } ${
                        confirmPassword && password !== confirmPassword
                          ? "ring-2 ring-error-400 ring-offset-2"
                          : ""
                      } ${
                        confirmPassword &&
                        password === confirmPassword &&
                        password.length > 0
                          ? "ring-2 ring-success-400 ring-offset-2"
                          : ""
                      }`}
                    >
                      <IoLockClosedOutline
                        className={`absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                          confirmPassword && password === confirmPassword
                            ? "text-success-600"
                            : confirmPassword && password !== confirmPassword
                              ? "text-error-500"
                              : focusedField === "confirmPassword"
                                ? "text-primary-900"
                                : "text-secondary-400"
                        }`}
                      />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          setError("");
                        }}
                        onFocus={() => setFocusedField("confirmPassword")}
                        onBlur={() => setFocusedField(null)}
                        placeholder="Confirm your password"
                        disabled={isLoading}
                        className="w-full pl-14 pr-14 py-4 bg-surface-100 border-2 border-transparent rounded-2xl text-text-primary placeholder:text-secondary-400 focus:outline-none focus:bg-white focus:border-primary-500 transition-all text-lg disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-text-secondary transition-colors"
                      >
                        {showConfirmPassword ? (
                          <IoEyeOffOutline className="w-5 h-5" />
                        ) : (
                          <IoEyeOutline className="w-5 h-5" />
                        )}
                      </button>
                    </div>

                    {/* Match indicator */}
                    <AnimatePresence>
                      {confirmPassword && (
                        <Motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className={`mt-2 flex items-center gap-2 text-sm ${
                            password === confirmPassword
                              ? "text-success-600"
                              : "text-error-600"
                          }`}
                        >
                          {password === confirmPassword ? (
                            <>
                              <IoCheckmarkCircle className="w-4 h-4" />
                              <span>Passwords match</span>
                            </>
                          ) : (
                            <>
                              <IoCloseCircle className="w-4 h-4" />
                              <span>Passwords do not match</span>
                            </>
                          )}
                        </Motion.div>
                      )}
                    </AnimatePresence>
                  </Motion.div>

                  {/* Submit Button */}
                  <Motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="pt-2"
                  >
                    <Motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-4 bg-primary-700 hover:bg-primary-800 text-white rounded-2xl font-semibold text-lg shadow-lg shadow-primary-900/30 hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
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
                          Reset Password
                          <IoArrowForward className="w-5 h-5" />
                        </>
                      )}
                    </Motion.button>
                  </Motion.div>
                </form>
              </Motion.div>
            )}

            {/* Success State */}
            {currentStep === STEPS.SUCCESS && (
              <Motion.div
                key="success"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="text-center"
              >
                {/* Success Icon */}
                <Motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="mb-8 inline-flex"
                >
                  <div className="relative">
                    <Motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute -inset-4 bg-success-100 rounded-full"
                    />
                    <div className="relative w-20 h-20 bg-success-500 rounded-full flex items-center justify-center shadow-lg shadow-success-500/30">
                      <IoCheckmarkCircle className="w-10 h-10 text-white" />
                    </div>
                  </div>
                </Motion.div>

                {/* Success Message */}
                <Motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mb-8"
                >
                  <h1 className="text-4xl font-bold text-text-primary mb-3">
                    Password reset!
                  </h1>
                  <p className="text-text-muted text-lg">
                    Your password has been successfully reset. You can now sign
                    in with your new password.
                  </p>
                </Motion.div>

                {/* Sign In Button */}
                <Motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => navigate("/login")}
                    className="w-full py-4 bg-primary-700 hover:bg-primary-800 text-white rounded-2xl font-semibold text-lg shadow-lg shadow-primary-900/30 hover:shadow-xl transition-all flex items-center justify-center gap-2"
                  >
                    Sign in to your account
                    <IoArrowForward className="w-5 h-5" />
                  </Motion.button>
                </Motion.div>
              </Motion.div>
            )}

            {/* Expired Token State */}
            {currentStep === STEPS.EXPIRED && (
              <Motion.div
                key="expired"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="text-center"
              >
                {/* Warning Icon */}
                <Motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="mb-8 inline-flex"
                >
                  <div className="relative">
                    <Motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute -inset-4 bg-warning-100 rounded-full"
                    />
                    <div className="relative w-20 h-20 bg-warning-500 rounded-full flex items-center justify-center shadow-lg shadow-warning-500/30">
                      <IoAlertCircle className="w-10 h-10 text-white" />
                    </div>
                  </div>
                </Motion.div>

                {/* Message */}
                <Motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mb-8"
                >
                  <h1 className="text-4xl font-bold text-text-primary mb-3">
                    Link expired
                  </h1>
                  <p className="text-text-muted text-lg">
                    This password reset link has expired. Please request a new
                    one to reset your password.
                  </p>
                </Motion.div>

                {/* Action Buttons */}
                <Motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-4"
                >
                  <Motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => navigate("/forgot-password")}
                    className="w-full py-4 bg-primary-700 hover:bg-primary-800 text-white rounded-2xl font-semibold text-lg shadow-lg shadow-primary-900/30 hover:shadow-xl transition-all flex items-center justify-center gap-2"
                  >
                    Request new link
                    <IoArrowForward className="w-5 h-5" />
                  </Motion.button>

                  <Link
                    to="/login"
                    className="inline-block text-text-muted hover:text-primary-700 transition-colors"
                  >
                    Back to sign in
                  </Link>
                </Motion.div>
              </Motion.div>
            )}

            {/* Invalid Token State */}
            {currentStep === STEPS.INVALID && (
              <Motion.div
                key="invalid"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="text-center"
              >
                {/* Error Icon */}
                <Motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="mb-8 inline-flex"
                >
                  <div className="relative">
                    <Motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute -inset-4 bg-error-100 rounded-full"
                    />
                    <div className="relative w-20 h-20 bg-error-500 rounded-full flex items-center justify-center shadow-lg shadow-error-500/30">
                      <IoCloseCircle className="w-10 h-10 text-white" />
                    </div>
                  </div>
                </Motion.div>

                {/* Message */}
                <Motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mb-8"
                >
                  <h1 className="text-4xl font-bold text-text-primary mb-3">
                    Invalid link
                  </h1>
                  <p className="text-text-muted text-lg">
                    This password reset link is invalid or has already been
                    used. Please request a new one.
                  </p>
                </Motion.div>

                {/* Action Buttons */}
                <Motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-4"
                >
                  <Motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => navigate("/forgot-password")}
                    className="w-full py-4 bg-primary-700 hover:bg-primary-800 text-white rounded-2xl font-semibold text-lg shadow-lg shadow-primary-900/30 hover:shadow-xl transition-all flex items-center justify-center gap-2"
                  >
                    Request new link
                    <IoArrowForward className="w-5 h-5" />
                  </Motion.button>

                  <Link
                    to="/login"
                    className="inline-block text-text-muted hover:text-primary-700 transition-colors"
                  >
                    Back to sign in
                  </Link>
                </Motion.div>
              </Motion.div>
            )}
          </AnimatePresence>

          {/* Help text */}
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-12 text-center"
          >
            <p className="text-text-light text-sm">
              Need help?{" "}
              <Link
                to="/support"
                className="text-primary-700 hover:text-primary-900 font-medium transition-colors"
              >
                Contact support
              </Link>
            </p>
          </Motion.div>
        </Motion.div>
      </div>
    </div>
  );
};

export default ResetPassword;
