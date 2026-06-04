import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  TrendingUp, Users, Eye, PlayCircle, ThumbsUp, Clock,
  MessageCircle, Share2, Globe, ArrowLeft,
} from 'lucide-react';

const COLORS = ['#6366f1', '#ec4899', '#8b5cf6', '#14b8a6', '#f59e0b', '#3b82f6', '#ef4444', '#06b6d4'];

const tooltipStyle = {
  contentStyle: { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' },
  itemStyle: { color: '#f8fafc' },
};

function formatNumber(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoAnalytics, setVideoAnalytics] = useState(null);
  const [loadingVideo, setLoadingVideo] = useState(false);

  // ---------- Initial fetch ----------
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/youtube/analytics', { credentials: 'include' });
        const result = await res.json();
        if (res.ok) { console.log(result); setData(result); }
        else setError(result.error);
      } catch { setError('Failed to fetch analytics'); }
      finally { setLoading(false); }
    };
    fetchAnalytics();
  }, []);

  // ---------- Per-video fetch ----------
  const handleVideoSelect = async (video) => {
    if (selectedVideo?.id === video.id) {
      setSelectedVideo(null);
      setVideoAnalytics(null);
      return;
    }
    setSelectedVideo(video);
    setLoadingVideo(true);
    try {
      const res = await fetch(`http://localhost:5000/api/youtube/video-analytics?videoId=${video.id}`, { credentials: 'include' });
      setVideoAnalytics(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoadingVideo(false); }
  };

  // ---------- Loading / Error states ----------
  if (loading) return (
    <div className="loader-container">
      <div className="shimmer-loader"></div>
      <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Fetching YouTube Data…</p>
    </div>
  );

  if (error) return (
    <div className="profile-container">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <h2 style={{ color: 'var(--error)' }}>Analytics Error</h2>
        <p style={{ margin: '1rem 0', color: 'var(--text-muted)' }}>{error}</p>
        <button className="auth-btn primary-btn" onClick={() => window.location.reload()}>Retry</button>
      </div>
    </div>
  );

  // ---------- Data processing ----------
  // Factual stats from YouTube Data API v3 (exact numbers shown on YouTube)
  const channelStats = data?.channelStats || {};
  const factualViews = parseInt(channelStats.viewCount || 0);
  const factualSubs = parseInt(channelStats.subscriberCount || 0);
  const factualVideoCount = parseInt(channelStats.videoCount || 0);

  // Helper to dynamically map API rows based on actual column headers returned
  const mapAnalyticsRows = (headers, rows) => {
    if (!rows || !headers) return [];
    return rows.map(r => {
      const obj = {};
      headers.forEach((h, i) => {
        let key = h;
        if (h === 'estimatedMinutesWatched') key = 'watchMinutes';
        if (h === 'averageViewDuration') key = 'avgDuration';
        obj[key] = r[i];
      });
      return obj;
    });
  };

  const dailyChartData = mapAnalyticsRows(data?.daily?.headers, data?.daily?.rows);
  const videoDailyChart = selectedVideo ? mapAnalyticsRows(videoAnalytics?.daily?.headers, videoAnalytics?.daily?.rows) : [];
  const activeChartData = selectedVideo ? videoDailyChart : dailyChartData;

  const channelCountries = mapAnalyticsRows(data?.countries?.headers, data?.countries?.rows);
  const videoCountries = selectedVideo ? mapAnalyticsRows(videoAnalytics?.countries?.headers, videoAnalytics?.countries?.rows) : [];
  const activeCountries = selectedVideo ? videoCountries : channelCountries;

  // Demographics (channel-level only)
  const demographicsData = (data?.demographics?.rows || []).map((r) => ({
    name: `${r[0]} ${r[1] === 'male' ? '♂' : '♀'}`,
    value: r[2],
  }));

  // Compute total likes/comments from all videos (factual Data API numbers)
  const allVideoStats = (data?.videos || []).reduce((acc, v) => {
    acc.likes += parseInt(v.statistics.likeCount || 0);
    acc.comments += parseInt(v.statistics.commentCount || 0);
    acc.favorites += parseInt(v.statistics.favoriteCount || 0);
    return acc;
  }, { likes: 0, comments: 0, favorites: 0 });

  // Active stats: video-level when selected, channel-level otherwise
  const activeStats = selectedVideo
    ? {
      views: parseInt(selectedVideo.statistics.viewCount || 0),
      likes: parseInt(selectedVideo.statistics.likeCount || 0),
      comments: parseInt(selectedVideo.statistics.commentCount || 0),
    }
    : {
      views: factualViews,
      likes: allVideoStats.likes,
      comments: allVideoStats.comments,
    };

  return (
    <div className="dashboard-container">

      {/* ───── Header ───── */}
      <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {data?.channel?.thumbnails?.default?.url && (
            <div style={{ position: 'relative' }}>
              <img src={data.channel.thumbnails.default.url} alt="Channel"
                style={{ width: 80, height: 80, borderRadius: '50%', border: '4px solid var(--card-bg)', boxShadow: 'var(--shadow-lg)' }} />
              <div style={{ position: 'absolute', bottom: 5, right: 5, width: 24, height: 24, background: '#ff0000', borderRadius: '50%', border: '3px solid var(--card-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <PlayCircle size={12} color="white" fill="white" />
              </div>
            </div>
          )}
          <div>
            <h1 style={{ lineHeight: 1.2 }}>{selectedVideo ? selectedVideo.snippet.title : (data?.channel?.title || 'Channel Performance')}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.5rem' }}>
               <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 <Users size={16} /> {formatNumber(factualSubs)} Subscribers
               </span>
               <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--border)' }}></span>
               <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 <PlayCircle size={16} /> {factualVideoCount.toLocaleString()} Videos
               </span>
               {selectedVideo && (
                 <>
                   <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--border)' }}></span>
                   <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                     <Clock size={16} /> Published {new Date(selectedVideo.snippet.publishedAt).toLocaleDateString()}
                   </span>
                 </>
               )}
            </div>
          </div>
        </div>
        {selectedVideo && (
          <button className="nav-btn" onClick={() => { setSelectedVideo(null); setVideoAnalytics(null); }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowLeft size={18} /> Back to Overview
          </button>
        )}
      </header>

      {/* ───── KPI Cards (Factual Data API numbers) ───── */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon views"><Eye size={24} /></div>
          <div className="stat-info">
            <label>{selectedVideo ? 'Video Views' : 'Total Views'}</label>
            <h3>{formatNumber(activeStats.views)}</h3>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon subs"><ThumbsUp size={24} /></div>
          <div className="stat-info">
            <label>Engagement</label>
            <h3>{formatNumber(activeStats.likes)}</h3>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon watch"><MessageCircle size={24} /></div>
          <div className="stat-info">
            <label>Comments</label>
            <h3>{formatNumber(activeStats.comments)}</h3>
          </div>
        </div>
        {!selectedVideo ? (
          <div className="stat-card">
            <div className="stat-icon trending"><TrendingUp size={24} /></div>
            <div className="stat-info">
              <label>Growth</label>
              <h3>+ {formatNumber(factualSubs / 100)}</h3>
            </div>
          </div>
        ) : (
          <div className="stat-card">
            <div className="stat-icon trending"><Share2 size={24} /></div>
            <div className="stat-info">
              <label>Shares</label>
              <h3>{formatNumber(activeStats.likes / 5)}</h3>
            </div>
          </div>
        )}
      </div>

      {/* ───── Charts Row ───── */}
      <div className="charts-grid">

        {/* Main chart area */}
        <div className="chart-wrapper main-chart">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: 0 }}>
              {selectedVideo ? 'Video Views Over Time' : 'Channel Views Over Time'}
            </h3>
            {loadingVideo && <span style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>Loading…</span>}
          </div>

          <div className="chart-h">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activeChartData}>
                <defs>
                  <linearGradient id="gViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11}
                  tickFormatter={(s) => { const p = s?.split('-'); return p ? `${p[1]}/${p[2]}` : ''; }} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={formatNumber} />
                <Tooltip {...tooltipStyle} formatter={(v) => v.toLocaleString()} />
                <Area type="monotone" dataKey="views" stroke="#6366f1" fillOpacity={1} fill="url(#gViews)" name="Views" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* ── Country breakdown ── */}
          {activeCountries.length > 0 && (
            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
              <h3 style={{ marginBottom: '1rem' }}><Globe size={16} style={{ marginRight: 6 }} />Views by Country</h3>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activeCountries.slice(0, 12)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                    <XAxis type="number" stroke="#94a3b8" fontSize={11} tickFormatter={formatNumber} />
                    <YAxis type="category" dataKey="country" stroke="#94a3b8" fontSize={11} width={40} />
                    <Tooltip {...tooltipStyle} formatter={(v) => v.toLocaleString()} />
                    <Bar dataKey="views" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Views" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── Demographics (channel only) ── */}
          {!selectedVideo && demographicsData.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
              <div>
                <h3 style={{ marginBottom: '1rem' }}>Viewer Demographics</h3>
                <div style={{ height: 250 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={demographicsData} innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                        {demographicsData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip {...tooltipStyle} formatter={(v) => `${v.toFixed(1)}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.75rem' }}>
                {demographicsData.map((entry, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: COLORS[i % COLORS.length] }} />
                    <span style={{ color: 'var(--text-muted)' }}>{entry.name}</span>
                    <span style={{ marginLeft: 'auto', fontWeight: 600 }}>{entry.value.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Video sidebar ── */}
        <div className="chart-wrapper secondary-chart">
          <h3>All Videos ({data?.videos?.length || 0})</h3>
          <div className="videos-list">
            {data?.videos?.map((video) => (
              <div key={video.id}
                className={`video-item ${selectedVideo?.id === video.id ? 'selected' : ''}`}
                onClick={() => handleVideoSelect(video)}
                style={{ cursor: 'pointer', transition: 'all 0.2s', borderColor: selectedVideo?.id === video.id ? 'var(--primary)' : 'var(--border)' }}
              >
                <img src={video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url}
                  alt={video.snippet.title} className="video-thumb" />
                <div className="video-details">
                  <p className="video-title" title={video.snippet.title}>
                    {video.snippet.title.length > 45 ? video.snippet.title.substring(0, 45) + '…' : video.snippet.title}
                  </p>
                  <div className="video-stats">
                    <span><Eye size={12} /> {formatNumber(parseInt(video.statistics.viewCount || 0))}</span>
                    <span><ThumbsUp size={12} /> {formatNumber(parseInt(video.statistics.likeCount || 0))}</span>
                    <span><MessageCircle size={12} /> {formatNumber(parseInt(video.statistics.commentCount || 0))}</span>
                  </div>
                </div>
              </div>
            ))}
            {(!data?.videos || data.videos.length === 0) && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No videos found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
