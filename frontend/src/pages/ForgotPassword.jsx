import AuthAside from "../components/auth/AuthAside";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion as Motion, AnimatePresence } from "framer-motion";
import {
  IoMailOutline,
  IoArrowForward,
  IoArrowBack,
  IoSparkles,
  IoCheckmarkCircle,
  IoCloseCircle,
  IoRefresh,
  IoShieldCheckmark,
  IoLockClosedOutline,
  IoTimeOutline,
} from "react-icons/io5";

// Steps for the process
const STEPS = {
  EMAIL: "email",
  SENT: "sent",
};

const ForgotPassword = () => {
  const [currentStep, setCurrentStep] = useState(STEPS.EMAIL);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendCount, setResendCount] = useState(0);

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(
        () => setResendCooldown(resendCooldown - 1),
        1000,
      );
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Email validation
  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      // Simulate API call - Replace with actual API call
      await new Promise((resolve) => {
        setTimeout(() => {
          // Simulate success (you can also simulate failure for testing)
          resolve();
        }, 2000);
      });

      setCurrentStep(STEPS.SENT);
      setResendCooldown(60); // 60 second cooldown
    } catch (err) {
      setError(err.message || "Failed to send reset email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle resend email
  const handleResend = async () => {
    if (resendCooldown > 0) return;

    setIsLoading(true);
    setError("");

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setResendCount((prev) => prev + 1);
      setResendCooldown(60);
    } catch {
      setError("Failed to resend email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle try different email
  const handleTryDifferentEmail = () => {
    setCurrentStep(STEPS.EMAIL);
    setEmail("");
    setError("");
    setResendCooldown(0);
  };

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
            {currentStep === STEPS.EMAIL ? (
              /* Email Input Step */
              <Motion.div
                key="email-step"
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
                    Forgot password?
                  </h1>
                  <p className="text-text-muted text-lg">
                    No worries! Enter your email and we'll send you a reset
                    link.
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
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Email Field */}
                  <Motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <label className="block text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wider">
                      Email Address
                    </label>
                    <div
                      className={`relative rounded-2xl transition-all duration-300 ${
                        focusedField === "email"
                          ? "ring-2 ring-primary-500 ring-offset-2"
                          : ""
                      }`}
                    >
                      <IoMailOutline
                        className={`absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                          focusedField === "email"
                            ? "text-primary-900"
                            : "text-secondary-400"
                        }`}
                      />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setError("");
                        }}
                        onFocus={() => setFocusedField("email")}
                        onBlur={() => setFocusedField(null)}
                        placeholder="your@email.com"
                        disabled={isLoading}
                        className="w-full pl-14 pr-5 py-4 bg-surface-100 border-2 border-transparent rounded-2xl text-text-primary placeholder:text-secondary-400 focus:outline-none focus:bg-white focus:border-primary-500 transition-all text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                  </Motion.div>

                  {/* Submit Button */}
                  <Motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
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
                          Send Reset Link
                          <IoArrowForward className="w-5 h-5" />
                        </>
                      )}
                    </Motion.button>
                  </Motion.div>
                </form>

                {/* Back to Login */}
                <Motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="mt-8"
                >
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 text-text-muted hover:text-primary-700 transition-colors group"
                  >
                    <IoArrowBack className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span>Back to sign in</span>
                  </Link>
                </Motion.div>
              </Motion.div>
            ) : (
              /* Email Sent Step */
              <Motion.div
                key="sent-step"
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

                {/* Header */}
                <Motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mb-6"
                >
                  <h1 className="text-4xl font-bold text-text-primary mb-3">
                    Check your email
                  </h1>
                  <p className="text-text-muted text-lg">
                    We've sent a password reset link to
                  </p>
                  <p className="text-primary-700 font-semibold text-lg mt-1">
                    {email}
                  </p>
                </Motion.div>

                {/* Instructions */}
                <Motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-surface-100 rounded-2xl p-6 mb-6 text-left"
                >
                  <h3 className="font-semibold text-text-primary mb-3">
                    Next steps:
                  </h3>
                  <ol className="space-y-2 text-text-muted">
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        1
                      </span>
                      <span>Open the email from OnlyCreators</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        2
                      </span>
                      <span>Click the "Reset Password" button</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        3
                      </span>
                      <span>Create your new password</span>
                    </li>
                  </ol>
                </Motion.div>

                {/* Resend Email */}
                <Motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mb-6"
                >
                  <p className="text-text-muted text-sm mb-3">
                    Didn't receive the email?
                  </p>
                  <Motion.button
                    whileHover={{ scale: resendCooldown > 0 ? 1 : 1.02 }}
                    whileTap={{ scale: resendCooldown > 0 ? 1 : 0.98 }}
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || isLoading}
                    className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                      resendCooldown > 0
                        ? "bg-secondary-100 text-secondary-400 cursor-not-allowed"
                        : "bg-primary-100 text-primary-700 hover:bg-primary-200"
                    }`}
                  >
                    {isLoading ? (
                      <Motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="w-5 h-5 border-2 border-primary-300 border-t-primary-700 rounded-full"
                      />
                    ) : (
                      <>
                        <IoRefresh
                          className={`w-5 h-5 ${
                            resendCooldown > 0
                              ? ""
                              : "group-hover:rotate-180 transition-transform"
                          }`}
                        />
                        {resendCooldown > 0
                          ? `Resend in ${resendCooldown}s`
                          : "Resend email"}
                      </>
                    )}
                  </Motion.button>

                  {resendCount > 0 && (
                    <Motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-success-600 text-sm mt-2"
                    >
                      Email resent successfully!
                    </Motion.p>
                  )}
                </Motion.div>

                {/* Error Message */}
                <AnimatePresence>
                  {error && (
                    <Motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mb-6 p-4 bg-error-50 border border-error-200 rounded-2xl flex items-center gap-3 text-left"
                    >
                      <IoCloseCircle className="w-5 h-5 text-error-500 flex-shrink-0" />
                      <p className="text-error-700 text-sm">{error}</p>
                    </Motion.div>
                  )}
                </AnimatePresence>

                {/* Actions */}
                <Motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="space-y-4"
                >
                  <button
                    onClick={handleTryDifferentEmail}
                    className="text-primary-700 hover:text-primary-900 font-medium transition-colors"
                  >
                    Try a different email
                  </button>

                  <div className="pt-4">
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-2 text-text-muted hover:text-primary-700 transition-colors group"
                    >
                      <IoArrowBack className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                      <span>Back to sign in</span>
                    </Link>
                  </div>
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

export default ForgotPassword;
