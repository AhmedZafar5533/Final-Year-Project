"""Export demo sentiment through the same DeepSeek service used by the backend."""

import subprocess
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"

NODE_SCRIPT = """
import 'dotenv/config';
import fs from 'node:fs';
import { getMockComments, mockVideos } from './config/mockYoutubeData.js';
import { getCommentsSentiment } from './services/sentimentService.js';

const output = {};
for (const [index, video] of mockVideos.slice(0, 2).entries()) {
  console.log('Analyzing demo comments with DeepSeek:', video.title);
  const { comments } = getMockComments(video.id, 100);
  const result = await getCommentsSentiment(comments, video.id);
  const top = label => result.comments
    .filter(comment => comment.sentiment.label === label)
    .sort((a, b) => (b.likes || 0) - (a.likes || 0))
    .slice(0, 5);
  output['video_' + (index + 1)] = {
    video_id: video.id,
    title: video.title,
    provider: 'deepseek',
    ...result.sentimentSummary,
    total_comments: result.sentimentSummary.total,
    top_positive: top('POSITIVE'),
    top_neutral: top('NEUTRAL'),
    top_negative: top('NEGATIVE'),
    all_analyzed: result.comments
  };
}
fs.writeFileSync('../sentiment_service/demo_batch_sentiment_results.json', JSON.stringify(output, null, 2));
console.log('Saved demo_batch_sentiment_results.json (DeepSeek).');
"""


if __name__ == "__main__":
    result = subprocess.run(
        ["node", "--input-type=module", "-e", NODE_SCRIPT],
        cwd=BACKEND_DIR,
        check=False,
    )
    raise SystemExit(result.returncode)
