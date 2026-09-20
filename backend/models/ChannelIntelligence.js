import mongoose from 'mongoose';

const VideoAnalysisSchema = new mongoose.Schema({
  videoId: { type: String, required: true },
  title: { type: String, required: true },
  thumbnailUrl: { type: String },
  metrics: {
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    likeRatio: { type: String, default: '100.0' }
  },
  sentimentSummary: {
    positive_percentage: { type: Number, default: 0 },
    neutral_percentage: { type: Number, default: 0 },
    negative_percentage: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  performance_tier: { type: String }, // e.g. "Top Performer", "Solid Engagement", "Niche Appeal"
  strengths: [{ type: String }],
  weaknesses: [{ type: String }],
  audience_demands_identified: [{ type: String }], // specific topics/requests from audience comments
  engagement_driver: { type: String },
  deep_analysis: { type: String }
}, { _id: false });

const MarketTrendSchema = new mongoose.Schema({
  id: { type: String, required: true },
  topic: { type: String, required: true },
  category: { type: String, default: 'General' },
  strength: { type: String, enum: ['Surging', 'High', 'Breakout', 'Medium'], default: 'High' },
  opportunityScore: { type: Number, default: 75 },
  searchVolume: { type: String, default: '100K monthly searches' },
  growthData: [{ type: Number }],
  hashtags: [{ type: String }],
  marketInsight: { type: String },
  relatedVideos: [{
    title: { type: String },
    views: { type: String }
  }]
}, { _id: false });

const NextVideoRecommendationSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  hook: { type: String, required: true },
  angle: { type: String },
  target_audience: { type: String },
  why_it_will_perform: { type: String, required: true },
  recommendation_type: { 
    type: String, 
    enum: ['overlap', 'demand', 'trend'], 
    default: 'demand' 
  },
  trend_source: { type: String }, // e.g. "Quantum Entanglement & Micro-Wormhole Simulation (Opportunity Score: 94/100)"
  audience_demand_source: { type: String }, // e.g. "Explicitly requested by Marcus Thorne in Warp Drive comments"
  overlap_rationale: { type: String }, // Synthesis of how audience hunger meets algorithm surge
  estimated_potential: { type: String }, // e.g. "Viral Candidate (Top Demand)", "High Watch Time"
  suggested_format: { type: String } // e.g. "12-15 min Deep Dive with Visual Metaphors"
}, { _id: false });

const ChannelIntelligenceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  channelId: { type: String, required: true, index: true },
  channelTitle: { type: String, default: 'Channel' },
  isDemo: { type: Boolean, default: false },
  
  // 1. Channel Niche & Persona
  niche: {
    primary_niche: { type: String, default: 'General Science & Technology' },
    sub_niches: [{ type: String }],
    target_audience: { type: String },
    content_tone: { type: String },
    content_pillars: [{ type: String }],
    differentiators: [{ type: String }]
  },

  // 2. Synthesized Niche Market & YouTube Trends
  marketTrends: [MarketTrendSchema],

  // 3. Individual Video Deep Dives (up to 5 latest videos)
  videoAnalyses: [VideoAnalysisSchema],

  // 4. Master Channel Synthesis & Categorized Recommendations
  masterSummary: {
    executive_overview: { type: String },
    cross_video_synthesis: { type: String },
    best_performing_patterns: [{ type: String }],
    friction_points: [{ type: String }],
    growth_roadmap: [{ type: String }],
    audience_demand_themes: [{ type: String }],
    market_trend_themes: [{ type: String }],
    overlap_recommendations: [NextVideoRecommendationSchema],
    demand_recommendations: [NextVideoRecommendationSchema],
    trend_recommendations: [NextVideoRecommendationSchema],
    next_video_recommendations: [NextVideoRecommendationSchema] // Full combined list for easy mapping
  },

  analyzedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['completed', 'processing', 'failed'], default: 'completed' }
}, { timestamps: true });

const ChannelIntelligence = mongoose.model('ChannelIntelligence', ChannelIntelligenceSchema);

export default ChannelIntelligence;
