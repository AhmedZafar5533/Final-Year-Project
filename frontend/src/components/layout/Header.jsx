import { useState, useRef, useEffect, useCallback, memo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  IoSearchOutline,
  IoMenuOutline,
  IoSettingsOutline,
  IoLogOutOutline,
  IoPersonOutline,
  IoChevronDown,
  IoClose,
  IoSparkles,
  IoTrendingUp,
  IoVideocam,
  IoPeople,
  IoBulb,
  IoStatsChart,
  IoLogoYoutube,
} from "react-icons/io5";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../context/ThemeContext";
import ThemeToggle from "../common/ThemeToggle";
import analyticsService from "../../services/analyticsService";
import { formatNumber } from "../../utils/formatters";

const searchSuggestions = [
  {
    id: 1,
    type: "page",
    icon: IoVideocam,
    title: "Dashboard Overview",
    path: "/dashboard",
  },
  { id: 2, type: "page", icon: IoTrendingUp, title: "Trends & Topics", path: "/trends" },
  { id: 3, type: "page", icon: IoBulb, title: "Insights & Optimization", path: "/insights" },
  { id: 4, type: "page", icon: IoSparkles, title: "AI Script Studio", path: "/studio" },
  { id: 5, type: "page", icon: IoPeople, title: "Audience Analytics", path: "/audience" },
  {
    id: 6,
    type: "page",
    icon: IoPersonOutline,
    title: "Profile Settings",
    path: "/settings?tab=profile",
  },
  {
    id: 7,
    type: "page",
    icon: IoSettingsOutline,
    title: "Channel & Accounts",
    path: "/settings?tab=accounts",
  },
];

const Header = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, toggleSidebar, sidebarCollapsed } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === "dark";

  const [showProfile, setShowProfile] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);

  const profileRef = useRef(null);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);

  const [channelStats, setChannelStats] = useState({
    subscribers: user?.subscriberCount || 0,
    views: user?.totalViews || 0,
    growth: 0,
    loading: true,
  });

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      try {
        const data = await analyticsService.getOverview("30d");
        if (!isMounted || !data) return;

        const subs =
          data.totalSubscribers ??
          (data.channelStats?.subscriberCount
            ? parseInt(data.channelStats.subscriberCount, 10)
            : user?.subscriberCount ?? 0);

        const views =
          data.totalViews ??
          (data.channelStats?.viewCount
            ? parseInt(data.channelStats.viewCount, 10)
            : user?.totalViews ?? 0);

        const growth =
          typeof data.viewsChange === "number"
            ? data.viewsChange
            : typeof data.subscribersChange === "number"
            ? data.subscribersChange
            : 0;

        setChannelStats({
          subscribers: subs,
          views: views,
          growth: growth,
          loading: false,
        });
      } catch (err) {
        if (isMounted) {
          setChannelStats((prev) => ({
            ...prev,
            subscribers: user?.subscriberCount || 0,
            views: user?.totalViews || 0,
            growth: 0,
            loading: false,
          }));
        }
      }
    };

    if (user) {
      fetchStats();
    }
    return () => {
      isMounted = false;
    };
  }, [user]);

  const formatStatValue = (val) => {
    if (val === undefined || val === null || isNaN(val)) return "0";
    return formatNumber(Number(val));
  };

  const growthNum = Number(channelStats.growth || 0);
  const isPositiveGrowth = growthNum > 0;
  const isNegativeGrowth = growthNum < 0;
  const growthFormatted = isPositiveGrowth
    ? `+${growthNum.toFixed(1)}%`
    : `${growthNum.toFixed(1)}%`;

  useEffect(() => {
    const handleScroll = (e) => {
      const scrollTop =
        e.target === document ? window.scrollY : (e.target.scrollTop || 0);
      setIsScrolled(scrollTop > 10);
    };
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === "Escape") {
        setShowSearch(false);
        setShowProfile(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfile(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearch(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    navigate("/login");
  }, [logout, navigate]);

  const filteredSuggestions = searchQuery
    ? searchSuggestions.filter((s) =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : searchSuggestions;

  return (
    <>
      <header
        className={`
          sticky top-0 z-40 transition-all duration-300
          ${
            isScrolled
              ? isDark
                ? "bg-dark-surface/90 backdrop-blur-xl shadow-lg shadow-black/20 border-b border-dark-border/50"
                : "bg-white/90 backdrop-blur-xl shadow-lg shadow-surface-200/50 border-b border-surface-200/50"
              : isDark
                ? "bg-dark-surface border-b border-dark-border"
                : "bg-white border-b border-surface-200"
          }
        `}
      >
        <div className="flex items-center justify-between h-16 px-4 md:px-6">
          {/* Left section */}
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: "spring", stiffness: 420, damping: 24 }}
              onClick={toggleSidebar}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={`p-2.5 rounded-xl transition-colors duration-200 ${
                isDark
                  ? "text-dark-text-muted hover:text-dark-text hover:bg-dark-surface-light"
                  : "text-text-muted hover:text-text-primary hover:bg-surface-100"
              }`}
            >
              <IoMenuOutline className="w-6 h-6" />
            </motion.button>

            {/* Search bar */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              onClick={() => setShowSearch(true)}
              className={`hidden md:flex items-center gap-3 w-64 lg:w-80 px-4 py-2.5 rounded-xl transition-all duration-200 group ${
                isDark
                  ? "bg-dark-surface-light hover:bg-dark-border border border-transparent hover:border-dark-border text-dark-text-muted"
                  : "bg-surface-100 hover:bg-surface-200 border border-transparent hover:border-surface-300 text-text-muted"
              }`}
            >
              <IoSearchOutline
                className={`w-5 h-5 transition-colors ${isDark ? "text-dark-text-muted group-hover:text-dark-text" : "text-text-light group-hover:text-text-muted"}`}
              />
              <span className="text-sm">Search anything...</span>
              <div
                className={`ml-auto flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${isDark ? "bg-dark-surface text-dark-text-muted border border-dark-border" : "bg-white text-text-light border border-surface-200"}`}
              >
                <span>⌘</span>
                <span>K</span>
              </div>
            </motion.button>
          </div>

          {/* Right section */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Mobile search */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowSearch(true)}
              className={`p-2.5 rounded-xl md:hidden transition-all ${
                isDark
                  ? "text-dark-text-muted hover:text-dark-text hover:bg-dark-surface-light"
                  : "text-text-muted hover:text-text-primary hover:bg-surface-100"
              }`}
            >
              <IoSearchOutline className="w-5 h-5" />
            </motion.button>

            {/* Professional Theme Toggle */}
            <ThemeToggle
              isDark={isDark}
              toggleTheme={toggleTheme}
              size="default"
            />

            {/* Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowProfile(!showProfile)}
                className={`flex items-center gap-3 p-1.5 rounded-xl transition-all ${
                  isDark
                    ? "hover:bg-dark-surface-light"
                    : "hover:bg-surface-100"
                }`}
              >
                <div className="relative">
                  <img
                    src={
                      user?.channelAvatarUrl ||
                      user?.avatarUrl ||
                      user?.avatar ||
                      user?.profilePicture ||
                      "https://via.placeholder.com/40"
                    }
                    alt={user?.name || "Avatar"}
                    onError={(e) => {
                      e.target.src = "https://via.placeholder.com/40?text=U";
                    }}
                    className={`w-10 h-10 rounded-xl object-cover ring-2 ${isDark ? "ring-dark-border" : "ring-surface-200"}`}
                  />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-success-500 border-2 rounded-full ${isDark ? "border-dark-surface" : "border-white"}`}
                  />
                </div>
                <div className="hidden md:block text-left">
                  <p
                    className={`text-sm font-semibold truncate max-w-[120px] ${isDark ? "text-dark-text" : "text-text-primary"}`}
                  >
                    {user?.channelTitle || user?.name?.split(" ")[0] || "Creator"}
                  </p>
                  <p
                    className={`text-xs truncate max-w-[120px] ${
                      user?.channelTitle
                        ? "text-success-600 dark:text-success-400 font-medium"
                        : isDark
                        ? "text-dark-text-muted"
                        : "text-text-muted"
                    }`}
                  >
                    {user?.channelTitle ? "Connected" : "Creator"}
                  </p>
                </div>
                <IoChevronDown
                  className={`hidden md:block w-4 h-4 transition-transform duration-200 ${
                    isDark ? "text-dark-text-muted" : "text-text-muted"
                  } ${showProfile ? "rotate-180" : ""}`}
                />
              </motion.button>

              <AnimatePresence>
                {showProfile && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className={`absolute right-0 mt-2 w-72 rounded-2xl shadow-2xl overflow-hidden ${
                      isDark
                        ? "bg-dark-surface border border-dark-border"
                        : "bg-white border border-surface-200"
                    }`}
                  >
                    {/* User Info */}
                    <div
                      className={`relative px-5 py-5 border-b ${
                        isDark
                          ? "border-dark-border bg-gradient-to-br from-dark-surface-light to-dark-surface"
                          : "border-surface-200 bg-gradient-to-br from-surface-50 to-white"
                      }`}
                    >
                      <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-primary-100 to-accent-100 rounded-full opacity-50 blur-2xl pointer-events-none" />
                      <Link
                        to="/settings?tab=profile"
                        onClick={() => setShowProfile(false)}
                        className="relative flex items-center gap-4 group cursor-pointer"
                        title="View profile settings"
                      >
                        <img
                          src={
                            user?.channelAvatarUrl ||
                            user?.avatarUrl ||
                            user?.avatar ||
                            user?.profilePicture ||
                            "https://via.placeholder.com/56"
                          }
                          alt={user?.name || "Avatar"}
                          onError={(e) => {
                            e.target.src = "https://via.placeholder.com/56?text=User";
                          }}
                          className={`w-14 h-14 rounded-xl object-cover ring-2 shadow-lg transition-transform group-hover:scale-105 ${isDark ? "ring-dark-border" : "ring-white"}`}
                        />
                        <div className="flex-1 min-w-0">
                          <p
                            className={`font-bold truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors ${isDark ? "text-dark-text" : "text-text-primary"}`}
                          >
                            {user?.name || user?.fullName || "Creator"}
                          </p>
                          <p
                            className={`text-xs truncate ${isDark ? "text-dark-text-muted" : "text-text-muted"}`}
                          >
                            {user?.email}
                          </p>
                          {user?.channelTitle ? (
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
                              <span className="text-xs font-semibold text-primary-900 dark:text-primary-400 truncate">
                                {user.channelTitle}
                              </span>
                            </div>
                          ) : (
                            <span className="inline-block mt-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-surface-200 dark:bg-dark-surface-light text-text-muted dark:text-dark-text-muted">
                              Creator
                            </span>
                          )}
                        </div>
                      </Link>

                      {/* Stats */}
                      <div
                        className={`flex items-center gap-3 mt-4 pt-4 border-t ${isDark ? "border-dark-border" : "border-surface-200"}`}
                      >
                        <div
                          className={`flex-1 text-center p-2 rounded-xl transition-colors ${isDark ? "bg-dark-surface" : "bg-white shadow-sm"}`}
                        >
                          <p
                            className={`text-lg font-bold ${isDark ? "text-dark-text" : "text-text-primary"}`}
                          >
                            {formatStatValue(channelStats.subscribers)}
                          </p>
                          <p
                            className={`text-xs ${isDark ? "text-dark-text-muted" : "text-text-muted"}`}
                          >
                            Subs
                          </p>
                        </div>
                        <div
                          className={`flex-1 text-center p-2 rounded-xl transition-colors ${isDark ? "bg-dark-surface" : "bg-white shadow-sm"}`}
                        >
                          <p
                            className={`text-lg font-bold ${isDark ? "text-dark-text" : "text-text-primary"}`}
                          >
                            {formatStatValue(channelStats.views)}
                          </p>
                          <p
                            className={`text-xs ${isDark ? "text-dark-text-muted" : "text-text-muted"}`}
                          >
                            Views
                          </p>
                        </div>
                        <div
                          className={`flex-1 text-center p-2 rounded-xl transition-colors ${
                            isPositiveGrowth
                              ? "bg-success-50 dark:bg-success-900/30 text-success-600 dark:text-success-400"
                              : isNegativeGrowth
                              ? "bg-error-50 dark:bg-error-900/30 text-error-600 dark:text-error-400"
                              : isDark
                              ? "bg-dark-surface text-dark-text-muted"
                              : "bg-surface-100 text-text-muted"
                          }`}
                        >
                          <p className="text-lg font-bold">
                            {growthFormatted}
                          </p>
                          <p
                            className={`text-xs ${
                              isPositiveGrowth
                                ? "text-success-600 dark:text-success-400"
                                : isNegativeGrowth
                                ? "text-error-600 dark:text-error-400"
                                : isDark
                                ? "text-dark-text-muted"
                                : "text-text-muted"
                            }`}
                          >
                            Growth
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                      {[
                        {
                          icon: IoPersonOutline,
                          label: "Profile",
                          path: "/settings?tab=profile",
                        },
                        {
                          icon: IoLogoYoutube,
                          label: "Connected Channel",
                          path: "/settings?tab=accounts",
                        },
                        {
                          icon: IoSettingsOutline,
                          label: "Settings",
                          path: "/settings",
                        },
                      ].map((item) => (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setShowProfile(false)}
                          className={`flex items-center gap-3 px-5 py-3 transition-all group ${
                            isDark
                              ? "text-dark-text-muted hover:text-dark-text hover:bg-dark-surface-light"
                              : "text-text-secondary hover:text-text-primary hover:bg-surface-50"
                          }`}
                        >
                          <item.icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                          <span className="text-sm font-medium">
                            {item.label}
                          </span>
                        </Link>
                      ))}
                    </div>

                    {/* Logout */}
                    <div
                      className={`py-2 border-t ${isDark ? "border-dark-border" : "border-surface-200"}`}
                    >
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-5 py-3 w-full text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20 transition-all group"
                      >
                        <IoLogOutOutline className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        <span className="text-sm font-medium">Logout</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* Command Palette / Search Modal */}
      <AnimatePresence>
        {showSearch && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={() => setShowSearch(false)}
            />

            <motion.div
              ref={searchRef}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={`fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden z-50 ${
                isDark
                  ? "bg-dark-surface border border-dark-border"
                  : "bg-white border border-surface-200"
              }`}
            >
              <div
                className={`flex items-center gap-3 px-5 py-4 border-b ${isDark ? "border-dark-border" : "border-surface-200"}`}
              >
                <IoSearchOutline
                  className={`w-5 h-5 ${isDark ? "text-dark-text-muted" : "text-text-muted"}`}
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search videos, trends, pages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`flex-1 bg-transparent focus:outline-none ${
                    isDark
                      ? "text-dark-text placeholder:text-dark-text-muted"
                      : "text-text-primary placeholder:text-text-light"
                  }`}
                />
                <button
                  onClick={() => setShowSearch(false)}
                  className={`p-1.5 rounded-lg transition-all ${
                    isDark
                      ? "text-dark-text-muted hover:text-dark-text hover:bg-dark-surface-light"
                      : "text-text-muted hover:text-text-primary hover:bg-surface-100"
                  }`}
                >
                  <IoClose className="w-5 h-5" />
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto py-2">
                {filteredSuggestions.length > 0 ? (
                  filteredSuggestions.map((item, index) => (
                    <motion.button
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => {
                        navigate(item.path);
                        setShowSearch(false);
                        setSearchQuery("");
                      }}
                      className={`w-full flex items-center gap-4 px-5 py-3 transition-all group ${
                        isDark
                          ? "hover:bg-dark-surface-light"
                          : "hover:bg-surface-50"
                      }`}
                    >
                      <div
                        className={`p-2.5 rounded-xl ${
                          item.type === "page"
                            ? "bg-primary-100 text-primary-900"
                            : item.type === "trend"
                              ? "bg-warning-100 text-warning-600"
                              : "bg-surface-200 text-text-secondary"
                        }`}
                      >
                        <item.icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 text-left">
                        <p
                          className={`text-sm font-medium transition-colors ${
                            isDark
                              ? "text-dark-text group-hover:text-primary-400"
                              : "text-text-primary group-hover:text-primary-900"
                          }`}
                        >
                          {item.title}
                        </p>
                        <p
                          className={`text-xs capitalize ${isDark ? "text-dark-text-muted" : "text-text-muted"}`}
                        >
                          {item.type}
                        </p>
                      </div>
                      <span
                        className={`text-xs ${isDark ? "text-dark-text-muted" : "text-text-light"}`}
                      >
                        ↵
                      </span>
                    </motion.button>
                  ))
                ) : (
                  <div className="px-5 py-8 text-center">
                    <p
                      className={
                        isDark ? "text-dark-text-muted" : "text-text-muted"
                      }
                    >
                      No results found
                    </p>
                  </div>
                )}
              </div>

              <div
                className={`px-5 py-3 border-t ${isDark ? "border-dark-border bg-dark-surface-light" : "border-surface-200 bg-surface-50"}`}
              >
                <div
                  className={`flex items-center justify-between text-xs ${isDark ? "text-dark-text-muted" : "text-text-light"}`}
                >
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <kbd
                        className={`px-1.5 py-0.5 rounded ${isDark ? "bg-dark-surface border border-dark-border text-dark-text-muted" : "bg-white border border-surface-200 text-text-muted"}`}
                      >
                        ↑
                      </kbd>
                      <kbd
                        className={`px-1.5 py-0.5 rounded ${isDark ? "bg-dark-surface border border-dark-border text-dark-text-muted" : "bg-white border border-surface-200 text-text-muted"}`}
                      >
                        ↓
                      </kbd>
                      navigate
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd
                        className={`px-1.5 py-0.5 rounded ${isDark ? "bg-dark-surface border border-dark-border text-dark-text-muted" : "bg-white border border-surface-200 text-text-muted"}`}
                      >
                        ↵
                      </kbd>
                      select
                    </span>
                  </div>
                  <span className="flex items-center gap-1">
                    <kbd
                      className={`px-1.5 py-0.5 rounded ${isDark ? "bg-dark-surface border border-dark-border text-dark-text-muted" : "bg-white border border-surface-200 text-text-muted"}`}
                    >
                      esc
                    </kbd>
                    close
                  </span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default memo(Header);
