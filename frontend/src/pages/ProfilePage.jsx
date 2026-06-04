import { useAuthStore } from '../store/authStore';

export default function ProfilePage() {
    const { user, logout, getYoutubeAuthUrl } = useAuthStore();

    const handleConnectYoutube = async () => {
        const url = await getYoutubeAuthUrl();
        if (url) {
            window.location.href = url;
        }
    };

    if (!user) return <div className="loader-container"><div className="shimmer-loader"></div></div>;

    const isYoutubeConnected = user.youtubeTokens?.connected;

    return (
        <div className="profile-container">
            <div className="profile-card">
                <div className="profile-header">
                    <img src={user.avatarUrl || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'} 
                         alt="Avatar" width="80" height="80" />
                    <div className="profile-info">
                        <h1>{user.fullName || 'User Profile'}</h1>
                        <p>{user.email}</p>
                        <div className="badges">
                            <span className="badge">Verified Account</span>
                            {isYoutubeConnected && <span className="badge yt-badge">YouTube Connected</span>}
                        </div>
                    </div>
                </div>

                <div className="profile-details">
                    <div className="detail-item">
                        <label>Account ID</label>
                        <p>{user._id}</p>
                    </div>
                    <div className="detail-item">
                        <label>Last Login</label>
                        <p>{new Date(user.lastLogin).toLocaleString()}</p>
                    </div>
                </div>

                <div className="integration-section">
                    <h3>Integrations</h3>
                    {!isYoutubeConnected ? (
                        <button className="auth-btn youtube-btn" onClick={handleConnectYoutube}>
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                            </svg>
                            Connect YouTube Channel
                        </button>
                    ) : (
                        <button className="auth-btn analytics-btn" onClick={() => window.location.href='/dashboard'}>
                            View YouTube Analytics
                        </button>
                    )}
                </div>

                <div className="actions">
                    <button className="auth-btn logout-btn" onClick={logout}>
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
}
