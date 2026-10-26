import UserAvatar from "../components/common/UserAvatar";
import { createElement, useState, useCallback, memo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  IoPersonOutline,
  IoLinkOutline,
  IoColorPaletteOutline,
  IoShieldOutline,
  IoLogoYoutube,
  IoLogoInstagram,
  IoLogoTiktok,
  IoCamera,
  IoCheckmarkCircle,
  IoWarning,
  IoSparkles,
  IoSaveOutline,
} from "react-icons/io5";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../context/ThemeContext";
import Card from "../components/common/Card";
import PageHeader from "../components/common/PageHeader";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import Badge from "../components/common/Badge";
import Modal from "../components/common/Modal";
import api from "../services/api";

const TabButton = memo(({ active, icon: Icon, label, onClick, badge }) => (
  <button
    type="button"
    aria-pressed={active}
    onClick={onClick}
    className={`
      relative flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium transition-all duration-300 w-auto lg:w-full shrink-0 whitespace-nowrap group
      ${
        active
          ? "bg-primary-50 text-primary-700 dark:bg-primary-500/15 dark:text-primary-200"
          : "text-text-secondary dark:text-dark-text-muted hover:bg-surface-100 dark:hover:bg-dark-surface-light hover:text-text-primary dark:hover:text-dark-text"
      }
    `}
  >
    {createElement(Icon, { className: `w-4 h-4 flex-shrink-0` })}
    <span className="flex-1 text-left">{label}</span>
    {badge && (
      <span
        className={`px-2 py-0.5 text-xs font-bold rounded-full ${
          active ? "bg-white/20 text-white" : "bg-error-100 text-error-700"
        }`}
      >
        {badge}
      </span>
    )}

  </button>
));

const Toggle = memo(({ checked, onChange, disabled = false }) => (
  <button
    type="button"
    onClick={() => !disabled && onChange(!checked)}
    disabled={disabled}
    className={`
      relative w-14 h-7 rounded-full transition-all duration-300 shadow-inner
      ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      ${checked ? "bg-primary-700 " : "bg-surface-300 dark:bg-dark-surface-light"}
    `}
  >
    <span
      className={`
        absolute top-1 w-5 h-5 bg-white rounded-full shadow-lg transition-all duration-300
        ${checked ? "left-8" : "left-1"}
      `}
    />
  </button>
));

const ConnectedAccount = memo(
  ({
    icon: Icon,
    name,
    description,
    connected,
    comingSoon,
    gradient,
    onConnect,
    onDisconnect,
    loading = false,
    avatarUrl,
  }) => (
    <div
      className={`
        relative overflow-hidden flex items-center justify-between p-5 rounded-2xl border transition-all duration-300
        ${
          comingSoon
            ? "bg-surface-50 dark:bg-dark-surface border-surface-200 dark:border-dark-border opacity-70"
            : connected
              ? "bg-gradient-to-br from-surface-50 to-white dark:from-dark-surface dark:to-dark-surface-light border-success-200 dark:border-success-800 hover:border-success-300 dark:hover:border-success-700"
              : "bg-white dark:bg-dark-surface border-surface-300 dark:border-dark-border hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-md dark:hover:shadow-black/30"
        }
      `}
    >
      {connected && (
        <div className="absolute top-0 right-0 w-20 h-20 bg-success-100 rounded-full -translate-y-10 translate-x-10 opacity-50" />
      )}
      <div className="flex items-center gap-4 relative">
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="w-12 h-12 rounded-xl object-cover shadow-lg border border-surface-200 dark:border-dark-border" />
        ) : (
          <div className={`p-3.5 rounded-xl ${gradient} shadow-lg`}>
            {createElement(Icon, { className: "w-6 h-6 text-white" })}
          </div>
        )}
        <div>
          <h4 className="font-bold text-text-primary dark:text-dark-text">
            {name}
          </h4>
          <p className="text-sm text-text-muted dark:text-dark-text-muted">
            {description}
          </p>
        </div>
      </div>
      <div className="relative">
        {comingSoon ? (
          <Badge variant="neutral">Coming Soon</Badge>
        ) : connected ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-success-100 dark:bg-success-900/30 rounded-full">
              <span className="w-2 h-2 bg-success-500 rounded-full animate-pulse" />
              <span className="text-sm font-semibold text-success-700 dark:text-success-400">
                Connected
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDisconnect}
              disabled={loading}
            >
              Disconnect
            </Button>
          </div>
        ) : (
          <Button size="sm" onClick={onConnect} disabled={loading}>
            {loading ? "Connecting…" : "Connect"}
          </Button>
        )}
      </div>
    </div>
  ),
);

const Settings = ({ initialTab = "profile" }) => {
  const { user, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam || initialTab);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [connectingYoutube, setConnectingYoutube] = useState(false);

  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl && tabFromUrl !== "notifications") {
      setActiveTab(tabFromUrl);
    } else if (initialTab && initialTab !== "notifications") {
      setActiveTab(initialTab);
    } else {
      setActiveTab("profile");
    }
  }, [searchParams, initialTab]);

  const handleConnectYoutube = async () => {
    try {
      setConnectingYoutube(true);
      const res = await api.get("/youtube/auth-url");
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      console.error("Failed to get YouTube auth URL:", err);
      alert("Failed to initiate YouTube connection.");
    } finally {
      setConnectingYoutube(false);
    }
  };

  const handleDisconnectYoutube = async () => {
    if (!confirm("Are you sure you want to disconnect your YouTube channel?")) return;
    try {
      setConnectingYoutube(true);
      await api.post("/youtube/disconnect");
      window.location.reload();
    } catch (err) {
      console.error("Failed to disconnect YouTube:", err);
    } finally {
      setConnectingYoutube(false);
    }
  };

  const [profile, setProfile] = useState({
    name: user?.name || "",
    email: user?.email || "",
    bio: "Full-stack developer sharing coding tutorials and tech insights.",
    channelName: user?.channelName || "",
  });

  const [preferences, setPreferences] = useState({
    theme: theme,
    language: "en",
    timezone: "America/New_York",
  });

  // Handle theme change - update both local state and actual theme
  const handleThemeChange = useCallback(
    (newTheme) => {
      setPreferences((prev) => ({ ...prev, theme: newTheme }));
      if (newTheme === "system") {
        // Check system preference
        const systemPrefersDark = window.matchMedia(
          "(prefers-color-scheme: dark)",
        ).matches;
        setTheme(systemPrefersDark ? "dark" : "light");
      } else {
        setTheme(newTheme);
      }
    },
    [setTheme],
  );

  // Sync preferences.theme with actual theme on mount
  useEffect(() => {
    setPreferences((prev) => ({ ...prev, theme }));
  }, [theme]);

  // Automatically refresh user auth state and open Connected accounts tab when returning from YouTube OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("youtube") === "connected") {
      setActiveTab("accounts");
      api
        .get("/auth/me")
        .then((res) => {
          if (res.data?.user) updateUser(res.data.user);
        })
        .catch(console.error);
    }
  }, [updateUser]);

  const handleProfileSave = useCallback(async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    updateUser(profile);
    setIsLoading(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  }, [profile, updateUser]);

  const tabs = [
    { id: "profile", label: "Profile", icon: IoPersonOutline },
    { id: "accounts", label: "Connected accounts", icon: IoLinkOutline },
    { id: "preferences", label: "Preferences", icon: IoColorPaletteOutline },
    { id: "security", label: "Security", icon: IoShieldOutline },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "profile":
        return (
          <div className="bg-white dark:bg-dark-surface rounded-2xl border border-surface-300 dark:border-dark-border shadow-sm overflow-hidden">
            <div className="p-6 border-b border-surface-200 dark:border-dark-border">
              <h2 className="text-xl font-bold text-text-primary dark:text-dark-text">
                Profile
              </h2>
              <p className="text-sm text-text-muted dark:text-dark-text-muted mt-1">
                Your personal details.
              </p>
            </div>
            <div className="p-6 space-y-6">
              {/* Success Message */}
              {saveSuccess && (
                <div className="flex items-center gap-3 p-4 bg-success-50 dark:bg-success-900/30 border border-success-200 dark:border-success-800 rounded-xl text-success-700 dark:text-success-400 animate-fade-in">
                  <IoCheckmarkCircle className="w-5 h-5" />
                  <span className="font-medium">
                    Profile updated successfully!
                  </span>
                </div>
              )}

              <div className="flex items-center gap-4 pb-5 border-b border-surface-200 dark:border-dark-border">
                <UserAvatar src={user?.channelAvatarUrl || user?.avatarUrl || user?.avatar || user?.profilePicture} name={user?.name || user?.fullName || "Creator"} className="w-16 h-16 text-xl" />
                <div className="min-w-0"><h3 className="font-semibold text-base text-text-primary dark:text-dark-text">{user?.name || user?.fullName}</h3><p className="text-sm text-text-muted mt-1 break-words">{user?.email}</p></div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Full Name"
                  value={profile.name}
                  onChange={(e) =>
                    setProfile({ ...profile, name: e.target.value })
                  }
                />
                <Input
                  label="Email"
                  type="email"
                  value={profile.email}
                  disabled
                  helperText="Email cannot be changed"
                />
              </div>

              <Input
                label="Channel Name"
                value={profile.channelName}
                onChange={(e) =>
                  setProfile({ ...profile, channelName: e.target.value })
                }
                placeholder="Your YouTube channel name"
              />

              <div>
                <label className="block text-sm font-semibold text-text-primary dark:text-dark-text mb-2">
                  Bio
                </label>
                <textarea
                  value={profile.bio}
                  onChange={(e) =>
                    setProfile({ ...profile, bio: e.target.value })
                  }
                  rows={4}
                  className="w-full px-4 py-3 border border-surface-300 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-900 dark:focus:ring-primary-500 focus:border-transparent resize-none transition-all text-text-primary dark:text-dark-text bg-white dark:bg-dark-surface-light"
                  placeholder="Tell us about yourself..."
                />
                <p className="mt-2 text-xs text-text-muted dark:text-dark-text-muted">
                  {profile.bio.length}/500 characters
                </p>
              </div>

              <div className="flex justify-end pt-4 border-t border-surface-200 dark:border-dark-border">
                <Button
                  onClick={handleProfileSave}
                  isLoading={isLoading}
                  leftIcon={<IoSaveOutline className="w-4 h-4" />}
                >
                  Save changes
                </Button>
              </div>
            </div>
          </div>
        );

      case "accounts":
        return (
          <div className="bg-white dark:bg-dark-surface rounded-2xl border border-surface-300 dark:border-dark-border shadow-sm overflow-hidden">
            <div className="p-6 border-b border-surface-200 dark:border-dark-border">
              <h2 className="text-xl font-bold text-text-primary dark:text-dark-text">
                Connected Platforms
              </h2>
              <p className="text-sm text-text-muted dark:text-dark-text-muted mt-1">
                Manage your connected social media accounts
              </p>
            </div>
            <div className="p-6 space-y-4">
              <ConnectedAccount
                icon={IoLogoYoutube}
                name={user?.channelTitle ? `YouTube (${user.channelTitle})` : "YouTube"}
                description={
                  user?.youtubeTokens?.connected || user?.connectedAccounts?.youtube
                    ? `Connected as ${user.channelTitle || user.channelName || "Connected Channel"}`
                    : "Connect your channel to sync live analytics, subscriber stats, and viewer comments."
                }
                connected={Boolean(user?.youtubeTokens?.connected || user?.connectedAccounts?.youtube)}
                avatarUrl={user?.channelAvatarUrl}
                gradient="bg-gradient-to-br from-red-500 to-red-600"
                onConnect={handleConnectYoutube}
                onDisconnect={handleDisconnectYoutube}
                loading={connectingYoutube}
              />
              <ConnectedAccount
                icon={IoLogoInstagram}
                name="Instagram"
                description="Coming soon"
                comingSoon
                gradient="bg-gradient-to-br from-pink-500 via-purple-500 to-orange-400"
              />
              <ConnectedAccount
                icon={IoLogoTiktok}
                name="TikTok"
                description="Coming soon"
                comingSoon
                gradient="bg-gradient-to-br from-dark-900 to-dark-800"
              />
            </div>
          </div>
        );

      case "preferences":
        return (
          <div className="bg-white dark:bg-dark-surface rounded-2xl border border-surface-300 dark:border-dark-border shadow-sm overflow-hidden">
            <div className="p-6 border-b border-surface-200 dark:border-dark-border">
              <h2 className="text-xl font-bold text-text-primary dark:text-dark-text">
                App Preferences
              </h2>
              <p className="text-sm text-text-muted dark:text-dark-text-muted mt-1">
                Customize your experience
              </p>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-text-primary dark:text-dark-text mb-3">
                  Theme
                </label>
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  {["light", "dark", "system"].map((themeOption) => (
                    <button
                      key={themeOption}
                      onClick={() => handleThemeChange(themeOption)}
                      className={`
                        relative px-2 sm:px-4 py-3 sm:py-4 rounded-xl border-2 text-xs sm:text-sm font-semibold capitalize transition-all duration-300
                        ${
                          preferences.theme === themeOption
                            ? "border-primary-900 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-900 dark:text-primary-300 shadow-lg shadow-primary-900/10"
                            : "border-surface-300 dark:border-dark-border text-text-secondary dark:text-dark-text-muted hover:border-surface-400 dark:hover:border-dark-border hover:bg-surface-50 dark:hover:bg-dark-surface-light"
                        }
                      `}
                    >
                      {preferences.theme === themeOption && (
                        <IoCheckmarkCircle className="absolute top-2 right-2 w-5 h-5 text-primary-900 dark:text-primary-400" />
                      )}
                      {themeOption}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-text-primary dark:text-dark-text mb-2">
                  Language
                </label>
                <select
                  value={preferences.language}
                  onChange={(e) =>
                    setPreferences({ ...preferences, language: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-surface-300 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-900 dark:focus:ring-primary-500 bg-white dark:bg-dark-surface-light text-text-primary dark:text-dark-text"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-text-primary dark:text-dark-text mb-2">
                  Timezone
                </label>
                <select
                  value={preferences.timezone}
                  onChange={(e) =>
                    setPreferences({ ...preferences, timezone: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-surface-300 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-900 dark:focus:ring-primary-500 bg-white dark:bg-dark-surface-light text-text-primary dark:text-dark-text"
                >
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="Europe/London">GMT</option>
                </select>
              </div>
            </div>
          </div>
        );

      case "security":
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-dark-surface rounded-2xl border border-surface-300 dark:border-dark-border shadow-sm overflow-hidden">
              <div className="p-6 border-b border-surface-200 dark:border-dark-border">
                <h2 className="text-xl font-bold text-text-primary dark:text-dark-text">
                  Change Password
                </h2>
                <p className="text-sm text-text-muted dark:text-dark-text-muted mt-1">
                  Update your account password
                </p>
              </div>
              <div className="p-6 space-y-4">
                <Input
                  label="Current Password"
                  type="password"
                  placeholder="••••••••"
                />
                <Input
                  label="New Password"
                  type="password"
                  placeholder="••••••••"
                />
                <Input
                  label="Confirm New Password"
                  type="password"
                  placeholder="••••••••"
                />
                <div className="flex justify-end pt-2">
                  <Button>Update Password</Button>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-dark-surface rounded-2xl border border-surface-300 dark:border-dark-border shadow-sm overflow-hidden">
              <div className="p-6">
                <div className="relative overflow-hidden p-6 bg-gradient-to-br from-error-50 to-warning-50 dark:from-error-900/30 dark:to-warning-900/30 border border-error-200 dark:border-error-800 rounded-xl">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-error-100 dark:bg-error-900/50 rounded-full opacity-50 blur-2xl" />
                  <div className="relative flex items-start gap-4">
                    <div className="p-3 bg-error-100 dark:bg-error-900/50 rounded-xl shadow-lg">
                      <IoWarning className="w-6 h-6 text-error-600 dark:text-error-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-error-800 dark:text-error-300 mb-1">
                        Danger Zone
                      </h4>
                      <p className="text-sm text-error-700 dark:text-error-400 mb-4">
                        Once you delete your account, there is no going back.
                        Please be certain.
                      </p>
                      <Button
                        variant="danger"
                        onClick={() => setShowDeleteModal(true)}
                      >
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="page-stack">
      <PageHeader title="Settings" description="Your profile, connected accounts, and preferences." />
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Tabs */}
        <div className="lg:col-span-1">
          <div className="settings-tabs flex lg:block overflow-x-auto lg:overflow-visible bg-white dark:bg-dark-surface rounded-xl border border-surface-300 dark:border-dark-border p-2 lg:p-3 gap-1 lg:space-y-1 sticky top-24">
            {tabs.map((tab) => (
              <TabButton
                key={tab.id}
                active={activeTab === tab.id}
                icon={tab.icon}
                label={tab.label}
                badge={tab.badge}
                onClick={() => setActiveTab(tab.id)}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3 animate-fade-in" key={activeTab}>
          {renderContent()}
        </div>
      </div>

      {/* Delete Account Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Account"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger">Yes, Delete My Account</Button>
          </>
        }
      >
        <div className="text-center py-6">
          <div className="w-20 h-20 bg-error-100 dark:bg-error-900/30 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-error-500/20">
            <IoWarning className="w-10 h-10 text-error-600 dark:text-error-400" />
          </div>
          <h3 className="text-xl font-bold text-text-primary dark:text-dark-text mb-3">
            Are you absolutely sure?
          </h3>
          <p className="text-text-muted dark:text-dark-text-muted max-w-sm mx-auto">
            This action cannot be undone. All your data, insights, and connected
            accounts will be permanently deleted.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default memo(Settings);
