import { NavLink, Link } from "react-router-dom";
import {
  IoGridOutline,
  IoTrendingUpOutline,
  IoBulbOutline,
  IoPeopleOutline,
  IoSettingsOutline,
  IoCloseOutline,
  IoSparkles,
  IoChevronForward,
  IoChevronForwardOutline,
} from "react-icons/io5";
import { useTheme } from "../../context/ThemeContext";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: IoGridOutline },
  { path: "/trends", label: "Trends", icon: IoTrendingUpOutline },
  { path: "/insights", label: "Insights", icon: IoBulbOutline, badge: "3" },
  { path: "/studio", label: "AI Script Studio", icon: IoSparkles, badge: "AI" },
  { path: "/audience", label: "Audience", icon: IoPeopleOutline },
  { path: "/settings", label: "Settings", icon: IoSettingsOutline },
];

// Shared motion tokens so every element collapses on the same curve.
// The rail is 72px collapsed and 288px (w-72) expanded. Because the icon slot
// is a fixed 40px with 16px padding on each side, the icons sit at the exact
// same x-position in both states — nothing jumps while the rail animates.
const EASE = "ease-[cubic-bezier(0.32,0.72,0,1)]";
// Respect prefers-reduced-motion on every timed transition in this file.
const MOTION = `transition-all duration-300 ${EASE} motion-reduce:transition-none`;
// Same curve, scoped to color/background so hover + active states feel
// identical to the collapse/expand motion instead of using the browser default ease.
const COLOR_MOTION = `transition-colors duration-300 ${EASE} motion-reduce:transition-none`;
// Consistent, visible keyboard focus for every interactive element.
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-50 dark:focus-visible:ring-offset-dark-surface";

// A label that fades + collapses its width in lockstep with the rail.
const labelMotion = (collapsed) =>
  `overflow-hidden whitespace-nowrap ${MOTION} ${
    collapsed ? "ml-0 max-w-0 opacity-0" : "ml-3 max-w-[220px] opacity-100"
  }`;

const Sidebar = () => {
  const { sidebarCollapsed, setSidebarCollapsed, toggleSidebar } = useTheme();
  const collapsed = sidebarCollapsed;

  const handleNavClick = () => {
    // On mobile the sidebar is an overlay — close it after navigating.
    // On desktop it stays put as an icon rail.
    if (window.innerWidth < 1024) setSidebarCollapsed(true);
  };

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-primary-950/60 dark:bg-dark-900/80 backdrop-blur-sm lg:hidden transition-opacity duration-300 motion-reduce:transition-none ${
          collapsed ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        onClick={() => setSidebarCollapsed(true)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-screen overflow-hidden
          bg-surface-50 dark:bg-dark-surface
          border-r border-surface-300 dark:border-dark-border
          transition-[width,transform] duration-300 ${EASE} motion-reduce:transition-none
          lg:z-30 lg:flex-shrink-0
          ${collapsed
            ? "w-72 -translate-x-full lg:translate-x-0 lg:w-[72px]"
            : "w-72 translate-x-0 lg:w-72"}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <header className="flex items-center justify-between h-16 px-4 border-b border-surface-300 dark:border-dark-border shrink-0">
            <Link
              to="/dashboard"
              className={`flex items-center group min-w-0 rounded-lg ${FOCUS_RING}`}
            >
              {/* Logo — 40px, so it stays centred in the 72px rail */}
              <div className="relative shrink-0">
                <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20 group-hover:shadow-primary-500/35 transition-shadow duration-300 motion-reduce:transition-none">
                  <svg
                    width="22"
                    height="22"
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
                {/* Online indicator */}
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                  <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-success-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-success-500 border-2 border-surface-50 dark:border-dark-surface" />
                </span>
              </div>

              {/* Brand — fades with the rail */}
              <div className={labelMotion(collapsed)}>
                <h1 className="text-lg font-bold text-text-primary dark:text-dark-text leading-tight">
                  Only
                  <span className="text-primary-700 dark:text-primary-400">
                    Creators
                  </span>
                </h1>
                <p className="text-[11px] font-medium text-text-muted dark:text-dark-text-muted">
                  Analytics suite
                </p>
              </div>
            </Link>

            {/* Close button - Mobile only */}
            <button
              onClick={() => setSidebarCollapsed(true)}
              className={`p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-200 dark:text-dark-text-muted dark:hover:text-dark-text dark:hover:bg-dark-surface-light transition-[opacity,background-color] duration-300 motion-reduce:transition-none lg:hidden ${FOCUS_RING} ${
                collapsed ? "opacity-0 pointer-events-none" : "opacity-100"
              }`}
              aria-label="Close sidebar"
            >
              <IoCloseOutline className="w-5 h-5" />
            </button>
          </header>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden p-4">
            <p
              className={`text-xs font-medium text-text-light dark:text-dark-text-muted px-3 overflow-hidden whitespace-nowrap ${MOTION} ${
                collapsed ? "max-h-0 mb-0 opacity-0" : "max-h-6 mb-3 opacity-100"
              }`}
            >
              Menu
            </p>

            <ul className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      onClick={handleNavClick}
                      title={collapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        `group flex items-center w-full rounded-xl text-sm font-medium ${COLOR_MOTION} ${FOCUS_RING} ${
                          isActive
                            ? "bg-gradient-to-r from-primary-700 to-primary-600 text-surface-50 shadow-md shadow-primary-900/25 dark:from-primary-500 dark:to-primary-600 dark:text-white dark:shadow-primary-500/20"
                            : "text-text-secondary hover:text-text-primary hover:bg-surface-200 dark:text-white dark:hover:text-dark-text dark:hover:bg-dark-surface-light"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            className={`relative flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ${COLOR_MOTION} ${
                              isActive
                                ? "bg-transparent"
                                : "bg-transparent dark:bg-dark-surface-light group-hover:bg-surface-300 dark:group-hover:bg-dark-border"
                            }`}
                          >
                            <Icon className="w-[18px] h-[18px]" />
                            {/* Badge collapses to a dot on the icon */}
                            <span
                              className={`absolute top-1 right-1 h-2 w-2 rounded-full bg-accent-500 ring-2 ring-surface-50 dark:ring-dark-surface ${MOTION} ${
                                collapsed && item.badge ? "opacity-100" : "opacity-0"
                              }`}
                              aria-hidden="true"
                            />
                          </span>

                          <span className={`flex flex-1 min-w-0 items-center gap-2 ${labelMotion(collapsed)}`}>
                            <span className="flex-1 truncate">{item.label}</span>
                            {item.badge && (
                              <span
                                className={`px-2 py-0.5 text-[10px] font-bold rounded-full shrink-0 ${
                                  isActive
                                    ? "bg-white/20 text-white"
                                    : "bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300"
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                            {isActive && (
                              <IoChevronForward className="w-4 h-4 opacity-70 shrink-0" />
                            )}
                          </span>
                        </>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Version footer */}
          <div
            className={`shrink-0 overflow-hidden px-4 pb-2 ${MOTION} ${
              collapsed ? "max-h-0 opacity-0" : "max-h-16 opacity-100"
            }`}
          >
            <p className="text-center text-[10px] leading-relaxed text-text-light dark:text-dark-text-muted">
              v2.4.1 • © 2025 OnlyCreators
            </p>
          </div>

          {/* Collapse / Expand toggle */}
          <button
            onClick={toggleSidebar}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`group flex items-center justify-center w-full h-14 shrink-0 border-t border-surface-300 dark:border-dark-border text-text-muted hover:text-primary-700 dark:text-dark-text-muted dark:hover:text-primary-300 ${COLOR_MOTION} ${FOCUS_RING}`}
          >
            <span className="flex items-center justify-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-surface-200 dark:bg-dark-surface-light group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30 transition-all duration-300 motion-reduce:transition-none group-hover:scale-110">
                <IoChevronForwardOutline
                  className={`w-4 h-4 transition-transform duration-500 ${EASE} motion-reduce:transition-none ${
                    collapsed ? "" : "rotate-180"
                  }`}
                />
              </span>
              <span
                className={`text-xs font-medium overflow-hidden whitespace-nowrap ${MOTION} ${
                  collapsed
                    ? "ml-0 max-w-0 opacity-0"
                    : "ml-1.5 max-w-[80px] opacity-100 group-hover:translate-x-0.5"
                }`}
              >
                Collapse
              </span>
            </span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
