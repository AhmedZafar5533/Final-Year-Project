import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SENTIMENT_SERVICE_URL = process.env.SENTIMENT_SERVICE_URL || 'http://127.0.0.1:8000';
const DEMO_RESULTS_PATH = path.resolve(__dirname, '../../sentiment_service/demo_batch_sentiment_results.json');

let cachedDemoResults = null;

const loadDemoResults = () => {
  if (cachedDemoResults) return cachedDemoResults;
  try {
    if (fs.existsSync(DEMO_RESULTS_PATH)) {
      const raw = fs.readFileSync(DEMO_RESULTS_PATH, 'utf-8');
      cachedDemoResults = JSON.parse(raw);
      return cachedDemoResults;
    }
  } catch (err) {
    console.warn('Could not load pre-computed demo sentiment results:', err.message);
  }
  return null;
};

export const getCommentsSentiment = async (comments = [], videoId = null) => {
  if (!comments || comments.length === 0) {
    return {
      comments: [],
      sentimentSummary: {
        positive_count: 0,
        neutral_count: 0,
        negative_count: 0,
        positive_percentage: 0,
        neutral_percentage: 0,
        negative_percentage: 0,
        total: 0
      }
    };
  }

  // 1. Try calling the Python microservice
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const payload = comments.map(c => ({
      id: c.id?.toString() || Math.random().toString(),
      text: c.text ? c.text.replace(/<br\s*[\/]?>/gi, ' ') : '',
      author: c.author || '',
      likes: c.likes || 0,
      publishedAt: c.publishedAt || new Date().toISOString()
    }));

    const response = await fetch(`${SENTIMENT_SERVICE_URL}/analyze-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comments: payload }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      
      // Merge sentiment back into original comments (preserving avatars, replyCounts, etc.)
      const enrichedComments = comments.map((orig, i) => {
        const analyzed = data.comments[i];
        return {
          ...orig,
          sentiment: analyzed?.sentiment || { label: 'NEUTRAL', confidence: 0.5, scores: { NEUTRAL: 0.5, POSITIVE: 0.25, NEGATIVE: 0.25 } }
        };
      });

      return {
        comments: enrichedComments,
        sentimentSummary: {
          ...data.summary,
          total: data.total
        }
      };
    }
  } catch (err) {
    console.warn('Sentiment service live call failed or timed out:', err.message);
  }

  // 2. Fallback for demo videos if pre-computed JSON is available
  const demoData = loadDemoResults();
  if (demoData) {
    if (videoId === 'vid1' && demoData.video_1) {
      return {
        comments: demoData.video_1.all_analyzed || comments,
        sentimentSummary: {
          positive_count: demoData.video_1.positive_count,
          neutral_count: demoData.video_1.neutral_count,
          negative_count: demoData.video_1.negative_count,
          positive_percentage: demoData.video_1.positive_percentage,
          neutral_percentage: demoData.video_1.neutral_percentage,
          negative_percentage: demoData.video_1.negative_percentage,
          total: demoData.video_1.total_comments
        }
      };
    } else if (videoId === 'vid2' && demoData.video_2) {
      return {
        comments: demoData.video_2.all_analyzed || comments,
        sentimentSummary: {
          positive_count: demoData.video_2.positive_count,
          neutral_count: demoData.video_2.neutral_count,
          negative_count: demoData.video_2.negative_count,
          positive_percentage: demoData.video_2.positive_percentage,
          neutral_percentage: demoData.video_2.neutral_percentage,
          negative_percentage: demoData.video_2.negative_percentage,
          total: demoData.video_2.total_comments
        }
      };
    }
  }

  // 3. Fallback neutral summary if microservice is offline and no precomputed data
  const total = comments.length;
  return {
    comments: comments.map(c => ({
      ...c,
      sentiment: { label: 'NEUTRAL', confidence: 0.5, scores: { NEUTRAL: 0.5, POSITIVE: 0.25, NEGATIVE: 0.25 } }
    })),
    sentimentSummary: {
      positive_count: 0,
      neutral_count: total,
      negative_count: 0,
      positive_percentage: 0,
      neutral_percentage: 100,
      negative_percentage: 0,
      total
    }
  };
};
