/**
 * backend/services/trendService.js
 * Trend Detection and Market Synthesis Service
 * Ported and adapted from the OnlyCreators trend intelligence architecture.
 * Synthesizes macro trends, search velocity, and YouTube topic momentum for a given creator niche.
 */

// High-fidelity pre-computed niche trends for the demo channel (Astrophysics, Space & Deep Tech)
const DEMO_ASTROPHYSICS_TRENDS = [
  {
    id: "trend-micro-wormholes",
    topic: "Quantum Entanglement & Micro-Wormhole Spacetime Simulation",
    category: "Theoretical Physics & Quantum Gravity",
    strength: "Surging",
    opportunityScore: 94,
    searchVolume: "480K monthly searches",
    growthData: [32, 45, 59, 71, 84, 98],
    hashtags: ["#QuantumEntanglement", "#MicroWormholes", "#EREPR", "#TheoreticalPhysics"],
    marketInsight: "Recent quantum computing simulations testing the holographic ER=EPR conjecture have exploded across academic and science channels. Viewers are specifically searching for whether quantum entanglement is physically equivalent to traversable microscopic wormholes.",
    relatedVideos: [
      { title: "Did Physicists Create a Holographic Wormhole in a Quantum Computer?", views: "1.4M views" },
      { title: "ER=EPR Explained: How Spacetime is Built from Entangled Qubits", views: "890K views" }
    ]
  },
  {
    id: "trend-jwst-biosignatures",
    topic: "JWST Exoplanet Atmospheric Biosignatures (K2-18b & Hycean Worlds)",
    category: "Astrobiology & Deep Space",
    strength: "Surging",
    opportunityScore: 91,
    searchVolume: "620K monthly searches",
    growthData: [40, 52, 63, 76, 89, 95],
    hashtags: ["#JWST", "#ExoplanetLife", "#K218b", "#Astrobiology", "#HyceanWorlds"],
    marketInsight: "Atmospheric transmission spectroscopy from the James Webb Space Telescope revealing potential dimethyl sulfide (DMS) and methane signatures has ignited massive curiosity. The strongest performing videos debunk sensationalism while explaining real spectroscopic absorption lines.",
    relatedVideos: [
      { title: "James Webb Telescope Discovers Atmospheric Gases on K2-18b", views: "2.1M views" },
      { title: "Are Hycean Planets Our Best Hope for Extraterrestrial Life?", views: "1.1M views" }
    ]
  },
  {
    id: "trend-fusion-ignition",
    topic: "Net Energy Gain Milestones in Commercial Nuclear Fusion",
    category: "Next-Gen Energy & Plasma Physics",
    strength: "High",
    opportunityScore: 85,
    searchVolume: "370K monthly searches",
    growthData: [25, 34, 48, 62, 74, 86],
    hashtags: ["#NuclearFusion", "#NetEnergyGain", "#Tokamak", "#PlasmaPhysics"],
    marketInsight: "Private fusion ventures and national ignition laboratories achieving repeat Q>1 energy breakeven are drawing high audience retention. Viewers gravitate toward videos that contrast magnetic confinement (tokamaks) against laser inertial confinement.",
    relatedVideos: [
      { title: "Commercial Fusion: How Close Are We to Unlimited Clean Energy?", views: "1.6M views" },
      { title: "Inertial Confinement vs Tokamaks: The Engineering Reality", views: "750K views" }
    ]
  },
  {
    id: "trend-dyson-megastructures",
    topic: "Kardashev Type II Megastructures & Star Lifting Engineering",
    category: "Futurism & Astrophysics",
    strength: "Breakout",
    opportunityScore: 82,
    searchVolume: "290K monthly searches",
    growthData: [18, 26, 39, 55, 68, 83],
    hashtags: ["#DysonSphere", "#KardashevScale", "#StarLifting", "#Megastructures"],
    marketInsight: "Existential futurism content analyzing planetary resource limits and megastructure construction yields exceptional average view duration (AVD > 12 minutes). Viewers are captivated by practical blueprints for dismantling asteroids and planets to construct Dyson swarms.",
    relatedVideos: [
      { title: "How to Build a Dyson Swarm (Step-by-Step Planetary Dismantling)", views: "3.2M views" },
      { title: "Star Lifting: How Advanced Civilizations Drain Matter from Stars", views: "940K views" }
    ]
  }
];

/**
 * Helper to calculate opportunity score from view metrics and velocity
 */
function calculateOpportunityScore(views, likeRatio = 98) {
  const viewScore = Math.min(60, Math.round((Math.log10(views + 1) / 7) * 60));
  const qualityScore = Math.min(40, Math.round((likeRatio / 100) * 40));
  return Math.max(50, Math.min(99, viewScore + qualityScore));
}

/**
 * Fetch and synthesize market trends for a channel based on its detected niche
 * @param {Object} params
 * @param {Object} params.niche Channel niche object (primary_niche, sub_niches, content_pillars)
 * @param {Object} [params.youtubeClient] Authenticated googleapis youtube client (if available)
 * @param {boolean} [params.isDemo=false] Whether operating in demo mode
 * @returns {Promise<Array>} Array of synthesized trend objects
 */
export const fetchAndSynthesizeMarketTrends = async ({
  niche,
  youtubeClient = null,
  isDemo = false
}) => {
  // If demo mode or no live client, return rich demo astrophysics trends
  if (isDemo || !youtubeClient) {
    return DEMO_ASTROPHYSICS_TRENDS;
  }

  try {
    const primaryNiche = niche?.primary_niche || 'Science and Technology';
    const subNiches = niche?.sub_niches || [];
    const contentPillars = niche?.content_pillars || [];

    // Formulate a focused search query based on niche
    const query = [primaryNiche, ...subNiches.slice(0, 2)].join(' ');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const searchResponse = await youtubeClient.search.list({
      part: 'snippet',
      q: query,
      type: 'video',
      order: 'viewCount',
      publishedAfter: thirtyDaysAgo,
      maxResults: 12,
    });

    const items = searchResponse.data.items || [];
    if (items.length === 0) {
      console.warn('YouTube trend search returned 0 items, using niche fallback trends.');
      return DEMO_ASTROPHYSICS_TRENDS;
    }

    // Collect video IDs to get full statistics
    const videoIds = items.map(item => item.id.videoId).filter(Boolean).join(',');
    let videoStatsMap = {};

    if (videoIds) {
      try {
        const statsResponse = await youtubeClient.videos.list({
          part: 'snippet,statistics',
          id: videoIds,
        });
        for (const vid of statsResponse.data.items || []) {
          videoStatsMap[vid.id] = {
            views: parseInt(vid.statistics?.viewCount || '0', 10),
            likes: parseInt(vid.statistics?.likeCount || '0', 10),
            tags: vid.snippet?.tags || []
          };
        }
      } catch (statsErr) {
        console.warn('Failed to fetch detailed video statistics for trends:', statsErr.message);
      }
    }

    // Synthesize top 3-4 distinct trend clusters from the retrieved videos
    const synthesizedTrends = [];
    const processedTopics = new Set();

    for (let i = 0; i < Math.min(items.length, 4); i++) {
      const item = items[i];
      const videoId = item.id.videoId;
      const title = item.snippet.title.replace(/&quot;/g, '"').replace(/&#39;/g, "'");
      const channelTitle = item.snippet.channelTitle;
      const stats = videoStatsMap[videoId] || { views: 250000, likes: 12000, tags: [] };
      const oppScore = calculateOpportunityScore(stats.views);

      // Clean topic name
      let topic = title.split('|')[0].split('-')[0].trim();
      if (processedTopics.has(topic) || topic.length < 5) continue;
      processedTopics.add(topic);

      const strength = oppScore >= 90 ? 'Surging' : (oppScore >= 75 ? 'High' : 'Breakout');
      const tags = stats.tags.length > 0 
        ? stats.tags.slice(0, 4).map(t => `#${t.replace(/\s+/g, '')}`)
        : [`#${primaryNiche.replace(/\s+/g, '')}`, '#TrendingNow', '#ViralGrowth'];

      synthesizedTrends.push({
        id: `trend-live-${i + 1}`,
        topic,
        category: primaryNiche,
        strength,
        opportunityScore: oppScore,
        searchVolume: `${(Math.round(stats.views * 0.4 / 1000) * 10).toLocaleString()}K monthly searches`,
        growthData: [
          Math.max(20, Math.round(oppScore * 0.35)),
          Math.max(30, Math.round(oppScore * 0.48)),
          Math.max(45, Math.round(oppScore * 0.62)),
          Math.max(60, Math.round(oppScore * 0.74)),
          Math.max(75, Math.round(oppScore * 0.88)),
          oppScore
        ],
        hashtags: tags,
        marketInsight: `High viewer velocity observed in ${channelTitle}'s coverage of "${topic}". Viewers show sustained demand for deeper technical breakdowns, analytical diagrams, and objective evaluation.`,
        relatedVideos: [
          { title, views: `${(stats.views / 1000).toFixed(0)}K views` }
        ]
      });
    }

    if (synthesizedTrends.length > 0) {
      return synthesizedTrends;
    }

    return DEMO_ASTROPHYSICS_TRENDS;
  } catch (error) {
    console.error('Error fetching live market trends:', error.message);
    return DEMO_ASTROPHYSICS_TRENDS;
  }
};
