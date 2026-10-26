import Header from "./Header";
import Sidebar from "./Sidebar";
import { ToastProvider } from "../common/Toast";
import { useTheme } from "../../context/ThemeContext";

const EASE = "ease-[cubic-bezier(0.32,0.72,0,1)]";

const Layout = ({ children }) => {
  const { isDark, sidebarCollapsed } = useTheme();

  return (
    <ToastProvider>
      <div className="app-shell min-h-screen bg-background dark:bg-dark-bg transition-colors duration-300">
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div
            className={`min-w-0 flex-1 flex flex-col h-screen overflow-x-hidden overflow-y-auto transition-[margin-left] duration-300 ${EASE} motion-reduce:transition-none ${
              sidebarCollapsed ? "lg:ml-[72px]" : "lg:ml-60"
            }`}
          >
            <Header />
            <main
              className={`app-main flex-1 min-w-0 transition-colors duration-300 ${
                isDark ? "bg-dark-bg" : "bg-background"
              }`}
            >
              <div className="page-content">{children}</div>
            </main>
          </div>
        </div>
      </div>
    </ToastProvider>
  );
};

export default Layout;
