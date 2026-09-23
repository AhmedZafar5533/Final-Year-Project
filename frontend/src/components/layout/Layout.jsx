import Header from "./Header";
import Sidebar from "./Sidebar";
import { ToastProvider } from "../common/Toast";
import { useTheme } from "../../context/ThemeContext";

const EASE = "ease-[cubic-bezier(0.32,0.72,0,1)]";

const Layout = ({ children }) => {
  const { isDark, sidebarCollapsed } = useTheme();

  return (
    <ToastProvider>
      <div className="min-h-screen bg-background dark:bg-dark-bg transition-colors duration-300">
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div
            className={`flex-1 flex flex-col h-screen overflow-y-auto transition-[margin-left] duration-300 ${EASE} motion-reduce:transition-none ${
              sidebarCollapsed ? "lg:ml-[72px]" : "lg:ml-72"
            }`}
          >
            <Header />
            <main
              className={`flex-1 p-4 md:p-6 lg:p-8 transition-colors duration-300 ${
                isDark ? "bg-dark-bg" : "bg-background"
              }`}
            >
              {children}
            </main>
          </div>
        </div>
      </div>
    </ToastProvider>
  );
};

export default Layout;
