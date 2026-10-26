import AuthAside from "../components/auth/AuthAside";
import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion as Motion, AnimatePresence } from "framer-motion";
import {
  IoMailOutline,
  IoLockClosedOutline,
  IoEyeOutline,
  IoEyeOffOutline,
  IoArrowForward,
  IoArrowBack,
  IoLogoGoogle,
  IoLogoYoutube,
  IoSparkles,
  IoPersonOutline,
  IoCheckmarkCircle,
  IoCloseCircle,
  IoRocket,
  IoTrendingUp,
  IoBulb,
  IoShieldCheckmark,
} from "react-icons/io5";
import { useAuth } from "../hooks/useAuth";

// Password requirements configuration
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

const Signup = () => {
  const navigate = useNavigate();
  const { signup, isLoading: authLoading } = useAuth() || {};

  // Form state
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState(null);

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    return passwordRequirements.filter((req) => req.test(formData.password))
      .length;
  }, [formData.password]);

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

  // Input change handler
  const handleInputChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    setError("");
  };

  // Step 1 validation
  const validateStep1 = () => {
    if (!formData.name.trim()) {
      setError("Please enter your name");
      return false;
    }
    if (formData.name.trim().length < 2) {
      setError("Name must be at least 2 characters");
      return false;
    }
    if (!formData.email.trim()) {
      setError("Please enter your email");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError("Please enter a valid email address");
      return false;
    }
    return true;
  };

  // Step 2 validation
  const validateStep2 = () => {
    if (!formData.password) {
      setError("Please enter a password");
      return false;
    }
    if (passwordStrength < 3) {
      setError("Please create a stronger password");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    if (!agreeToTerms) {
      setError("Please agree to the terms and conditions");
      return false;
    }
    return true;
  };

  // Navigation handlers
  const handleNextStep = () => {
    if (validateStep1()) {
      setCurrentStep(2);
      setError("");
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(1);
    setError("");
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateStep2()) return;

    setIsLoading(true);
    setError("");

    try {
      if (signup) {
        await signup(formData.name, formData.email, formData.password);
      } else {
        // Simulated signup for demo
        await new Promise((r) => setTimeout(r, 2000));
      }
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Failed to create account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Social signup handlers
  const handleGoogleSignup = () => {
    const apiBase = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace(/\/+$/, "")
      : "http://localhost:5000/api";
    window.location.href = `${apiBase}/auth/login`;
  };

  const handleYouTubeSignup = () => {
    const apiBase = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace(/\/+$/, "")
      : "http://localhost:5000/api";
    window.location.href = `${apiBase}/auth/login`;
  };

  return (
    <div className="min-h-screen flex bg-background">
      <AuthAside />

      {/* Right Side - Form */}
      <div className="auth-form-panel flex-1 flex items-center justify-center px-6 sm:px-12 lg:px-16 py-8 overflow-y-auto">
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
            className="mb-8"
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

          {/* Step Indicator */}
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <div className="flex items-center justify-center gap-4 mb-6">
              {/* Step 1 */}
              <div className="flex items-center gap-2">
                <Motion.div
                  animate={{
                    backgroundColor: currentStep >= 1 ? "#662843" : "#dcdcda",
                  }}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                >
                  {currentStep > 1 ? (
                    <IoCheckmarkCircle className="w-6 h-6" />
                  ) : (
                    "1"
                  )}
                </Motion.div>
                <span
                  className={`text-sm font-medium ${currentStep >= 1 ? "text-primary-900" : "text-secondary-400"}`}
                >
                  Account
                </span>
              </div>

              {/* Connector */}
              <Motion.div
                animate={{
                  backgroundColor: currentStep >= 2 ? "#662843" : "#dcdcda",
                }}
                className="w-16 h-1 rounded-full"
              />

              {/* Step 2 */}
              <div className="flex items-center gap-2">
                <Motion.div
                  animate={{
                    backgroundColor: currentStep >= 2 ? "#662843" : "#dcdcda",
                    color: currentStep >= 2 ? "#ffffff" : "#6b6370",
                  }}
                  className="w-10 h-10 rounded-full flex items-center justify-center font-semibold"
                >
                  2
                </Motion.div>
                <span
                  className={`text-sm font-medium ${currentStep >= 2 ? "text-primary-900" : "text-secondary-400"}`}
                >
                  Security
                </span>
              </div>
            </div>

            {/* Header */}
            <h1 className="text-4xl font-bold text-text-primary mb-3">
              {currentStep === 1 ? "Create account" : "Secure your account"}
            </h1>
            <p className="text-text-muted text-lg">
              {currentStep === 1
                ? "Set up your creator workspace."
                : "Create a strong password to protect your account"}
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

          <AnimatePresence mode="wait">
            {currentStep === 1 ? (
              /* Step 1: Account Info */
              <Motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Social Signup */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <Motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleGoogleSignup}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 py-3.5 bg-white border-2 border-secondary-200 rounded-2xl text-text-primary font-medium hover:border-secondary-300 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <IoLogoGoogle className="w-5 h-5 text-red-500" />
                    <span>Google</span>
                  </Motion.button>
                  <Motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleYouTubeSignup}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 py-3.5 bg-white border-2 border-secondary-200 rounded-2xl text-text-primary font-medium hover:border-secondary-300 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <IoLogoYoutube className="w-5 h-5 text-red-600" />
                    <span>YouTube</span>
                  </Motion.button>
                </div>

                {/* Divider */}
                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t-2 border-secondary-200" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-6 text-text-muted bg-background font-medium">
                      or
                    </span>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-5">
                  {/* Name Field */}
                  <Motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <label className="block text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wider">
                      Full Name
                    </label>
                    <div
                      className={`relative rounded-2xl transition-all duration-300 ${
                        focusedField === "name"
                          ? "ring-2 ring-primary-500 ring-offset-2"
                          : ""
                      }`}
                    >
                      <IoPersonOutline
                        className={`absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                          focusedField === "name"
                            ? "text-primary-900"
                            : "text-secondary-400"
                        }`}
                      />
                      <input
                        type="text"
                        value={formData.name}
                        onChange={handleInputChange("name")}
                        onFocus={() => setFocusedField("name")}
                        onBlur={() => setFocusedField(null)}
                        placeholder="John Doe"
                        className="w-full pl-14 pr-5 py-4 bg-surface-100 border-2 border-transparent rounded-2xl text-text-primary placeholder:text-secondary-400 focus:outline-none focus:bg-white focus:border-primary-500 transition-all text-lg"
                      />
                    </div>
                  </Motion.div>

                  {/* Email Field */}
                  <Motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
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
                        value={formData.email}
                        onChange={handleInputChange("email")}
                        onFocus={() => setFocusedField("email")}
                        onBlur={() => setFocusedField(null)}
                        placeholder="your@email.com"
                        className="w-full pl-14 pr-5 py-4 bg-surface-100 border-2 border-transparent rounded-2xl text-text-primary placeholder:text-secondary-400 focus:outline-none focus:bg-white focus:border-primary-500 transition-all text-lg"
                      />
                    </div>
                  </Motion.div>

                  {/* Continue Button */}
                  <Motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="pt-2"
                  >
                    <Motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={handleNextStep}
                      disabled={isLoading}
                      className="w-full py-4 bg-primary-700 hover:bg-primary-800 text-white rounded-2xl font-semibold text-lg shadow-lg shadow-primary-900/30 hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                      Continue
                      <IoArrowForward className="w-5 h-5" />
                    </Motion.button>
                  </Motion.div>
                </div>
              </Motion.div>
            ) : (
              /* Step 2: Password */
              <Motion.form
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleSubmit}
                className="space-y-5"
              >
                {/* Password Field */}
                <Motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <label className="block text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wider">
                    Password
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
                      value={formData.password}
                      onChange={handleInputChange("password")}
                      onFocus={() => setFocusedField("password")}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Create a strong password"
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

                  {/* Password Strength Indicator */}
                  <AnimatePresence>
                    {formData.password && (
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

                        {/* Requirements checklist */}
                        <div className="grid grid-cols-2 gap-2">
                          {passwordRequirements.map((req) => {
                            const passed = req.test(formData.password);
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
                                  className={`w-4 h-4 transition-opacity ${
                                    passed ? "opacity-100" : "opacity-30"
                                  }`}
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
                  transition={{ delay: 0.2 }}
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
                      formData.confirmPassword &&
                      formData.password !== formData.confirmPassword
                        ? "ring-2 ring-error-400 ring-offset-2"
                        : ""
                    } ${
                      formData.confirmPassword &&
                      formData.password === formData.confirmPassword &&
                      formData.password.length > 0
                        ? "ring-2 ring-success-400 ring-offset-2"
                        : ""
                    }`}
                  >
                    <IoLockClosedOutline
                      className={`absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                        focusedField === "confirmPassword"
                          ? "text-primary-900"
                          : formData.confirmPassword &&
                              formData.password === formData.confirmPassword
                            ? "text-success-600"
                            : formData.confirmPassword &&
                                formData.password !== formData.confirmPassword
                              ? "text-error-500"
                              : "text-secondary-400"
                      }`}
                    />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={handleInputChange("confirmPassword")}
                      onFocus={() => setFocusedField("confirmPassword")}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Confirm your password"
                      className="w-full pl-14 pr-14 py-4 bg-surface-100 border-2 border-transparent rounded-2xl text-text-primary placeholder:text-secondary-400 focus:outline-none focus:bg-white focus:border-primary-500 transition-all text-lg"
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

                  {/* Password match indicator */}
                  <AnimatePresence>
                    {formData.confirmPassword && (
                      <Motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className={`mt-2 flex items-center gap-2 text-sm ${
                          formData.password === formData.confirmPassword
                            ? "text-success-600"
                            : "text-error-600"
                        }`}
                      >
                        {formData.password === formData.confirmPassword ? (
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

                {/* Terms Agreement */}
                <Motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-start gap-3"
                >
                  <button
                    type="button"
                    onClick={() => setAgreeToTerms(!agreeToTerms)}
                    className={`mt-1 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                      agreeToTerms
                        ? "bg-primary-700 border-primary-700"
                        : "border-secondary-300 hover:border-primary-400"
                    }`}
                  >
                    {agreeToTerms && (
                      <IoCheckmarkCircle className="w-4 h-4 text-white" />
                    )}
                  </button>
                  <p className="text-sm text-text-muted leading-relaxed">
                    I agree to the{" "}
                    <Link
                      to="/terms"
                      className="text-primary-700 hover:text-primary-900 font-medium underline"
                    >
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link
                      to="/privacy"
                      className="text-primary-700 hover:text-primary-900 font-medium underline"
                    >
                      Privacy Policy
                    </Link>
                  </p>
                </Motion.div>

                {/* Action Buttons */}
                <Motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex gap-4 pt-2"
                >
                  <Motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={handlePrevStep}
                    className="px-6 py-4 bg-surface-100 border-2 border-secondary-200 text-text-secondary rounded-2xl font-semibold hover:bg-surface-200 hover:border-secondary-300 transition-all flex items-center gap-2"
                  >
                    <IoArrowBack className="w-5 h-5" />
                    Back
                  </Motion.button>
                  <Motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    type="submit"
                    disabled={isLoading || authLoading}
                    className="flex-1 py-4 bg-primary-700 hover:bg-primary-800 text-white rounded-2xl font-semibold text-lg shadow-lg shadow-primary-900/30 hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isLoading || authLoading ? (
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
                        Create Account
                        <IoArrowForward className="w-5 h-5" />
                      </>
                    )}
                  </Motion.button>
                </Motion.div>
              </Motion.form>
            )}
          </AnimatePresence>

          {/* Sign In Link */}
          <Motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-8 text-center text-text-muted text-lg"
          >
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-primary-900 hover:text-primary-700 font-semibold transition-colors"
            >
              Sign in
            </Link>
          </Motion.p>

        </Motion.div>
      </div>
    </div>
  );
};

export default Signup;
