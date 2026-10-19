export const videoIds = ['video000001', 'video000002', 'video000003'];
export const videos = videoIds.map((id, index) => ({
  id, snippet: {
    title: 'Practical Study Tools ' + index, channelId: 'channel-' + index, channelTitle: 'Creator ' + index,
    publishedAt: '2026-09-01T00:00:00Z', description: 'A practical demonstration of study tools and workflows.',
    defaultAudioLanguage: 'en', thumbnails: { medium: { url: 'https://example.org/thumbnail.jpg' } }
  }, contentDetails: { duration: 'PT10M' }, statistics: { viewCount: '10000', likeCount: '300', commentCount: '100' }
}));
export const transcriptText = 'This practical guide demonstrates study tools with real examples. '.repeat(8);

export function evidenceFixture() {
  return {
    competitors: videos.map(video => ({ videoId: video.id, channelId: video.snippet.channelId, transcriptComplete: true })),
    sources: videos.flatMap(video => [
      { id: video.id + ':description', videoId: video.id, kind: 'description', text: video.snippet.description, url: 'https://youtube.com/watch?v=' + video.id, complete: true },
      { id: video.id + ':transcript:0', videoId: video.id, kind: 'transcript', text: transcriptText, url: 'https://youtube.com/watch?v=' + video.id, complete: true },
      { id: video.id + ':comment:comment-1', videoId: video.id, kind: 'comment', text: 'How can I apply this to exam preparation?', url: 'https://youtube.com/watch?v=' + video.id + '&lc=comment-1', complete: true }
    ]),
    limitations: [], coverage: { videoCount: 3, channelCount: 3, completeTranscripts: 3, pageCount: 0, commentCount: 3 }
  };
}

export function reportFixture(evidence = evidenceFixture()) {
  const claim = (value, sourceIds) => ({ text: value, sourceIds });
  const first = evidence.competitors[0].videoId;
  const complete = evidence.sources.filter(source => source.kind === 'transcript' && source.complete);
  return {
    summary: claim('The examined examples describe study workflows.', [first + ':description']),
    competitors: evidence.competitors.map(video => ({
      videoId: video.videoId, approach: claim('A practical demonstration.', [video.videoId + ':description']),
      coveredTopics: [claim('Study tools.', [video.videoId + ':description'])],
      audienceNeeds: evidence.sources.some(source => source.id === video.videoId + ':comment:comment-1')
        ? [{ ...claim('A viewer asks for exam preparation examples.', [video.videoId + ':comment:comment-1']),
          quote: 'How can I apply this to exam preparation?' }] : []
    })),
    coverageMatrix: [{ topic: 'Study tools', coveredBy: [first], sourceIds: [first + ':description'] }],
    gaps: complete.length >= 2 ? [{
      title: 'Potential exam preparation examples',
      finding: claim('An exam preparation walkthrough may address an observed question.', [first + ':comment:comment-1']),
      comparison: claim('Compare the examined demonstrations before choosing a new example.', complete.slice(0, 2).map(source => source.id)),
      suggestedApproach: 'Demonstrate one complete revision session.'
    }] : [],
    refinedIdea: { angle: 'One exam preparation workflow.', hook: 'Can these tools help you revise?',
      titleOptions: ['A Practical Study Workflow'], outline: ['Set a revision goal', 'Demonstrate the workflow'] },
    limitations: ['This is a small sample of public content.']
  };
}
