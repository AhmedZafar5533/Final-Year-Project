import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sourceQuality, rankSourceCandidates, rankImageCandidates, imageDimensions } from '../services/research/quality.js';
import { embedScriptImages } from '../services/research/scriptImages.js';
import { scriptResearchResponse } from '../services/research/scriptWebResearch.js';
import { exportScriptMarkdown } from '../../frontend/src/utils/scriptVisuals.js';

test('topically comparable original research and institutional sources outrank commentary', () => {
  const results = rankSourceCandidates([
    { url: 'https://medium.com/example', title: 'ReAct agent study' },
    { url: 'https://arxiv.org/abs/2210.03629', title: 'ReAct agent study' },
    { url: 'https://research.google/blog/react/', title: 'ReAct agent study' },
    { url: 'https://www.nasa.gov/science', title: 'Lunar science' }
  ], 'ReAct agent');
  assert.equal(results[0].sourceType, 'Preprint / research manuscript');
  assert.ok(results.findIndex(item => item.url.includes('research.google')) < results.findIndex(item => item.url.includes('medium.com')));
  assert.match(results[0].sourceCaveat, /not verified/);
});

test('lookalike domains do not inherit institutional reputation and malformed URLs are removed', () => {
  assert.equal(sourceQuality('https://nasa.gov.evil.example/paper').type, 'Other web source');
  assert.equal(sourceQuality('https://fake-arxiv.org/paper').type, 'Other web source');
  assert.equal(rankSourceCandidates([{ url: 'http://127.0.0.1/private' }]).length, 0);
});

test('image ranking prefers original large images and excludes known small and stock-marketplace results', () => {
  const results = rankImageCandidates([
    { url: 'https://example.org/small', imageUrl: 'https://example.org/small.jpg', title: 'Moon surface', resolution: '320 x 200' },
    { url: 'https://example.org/large', imageUrl: 'https://example.org/large.jpg', title: 'Moon surface', resolution: '1,920 × 1,080' },
    { url: 'https://images.nasa.gov/moon', imageUrl: 'https://images-assets.nasa.gov/moon.jpg', title: 'Moon surface', width: 3840, height: 2160 },
    { url: 'https://shutterstock.com/moon', imageUrl: 'https://example.org/stock.jpg', title: 'Moon surface', resolution: '4000x2000' },
    { url: 'https://example.org/logo', imageUrl: 'https://example.org/logo.svg', title: 'Moon logo' }
  ], 'Moon surface');
  assert.equal(results.length, 2);
  assert.equal(results[0].sourceType, 'Original media archive');
  assert.equal(results[0].width, 3840);
  assert.equal(results[1].width, 1920);
  assert.deepEqual(imageDimensions({}), { width: null, height: null });
});

const image = { id: 'I123456abcdef', title: 'Moon surface', url: 'https://example.org/original', imageUrl: 'https://example.org/moon.jpg', license: 'Not verified' };
const placement = { imageId: image.id, sectionHeading: 'The lunar surface', caption: 'A candidate lunar-surface visual.', alt: 'Lunar terrain visual reference' };

test('validated image placements embed next to the exact relevant heading and survive citation checks', () => {
  const response = { reply: 'Drafted', script: '# Moon\n## The lunar surface\nNarration.\n## Another topic\nMore narration.', imagePlacements: [placement] };
  embedScriptImages(response, [image]);
  assert.ok(response.script.includes('## The lunar surface\n[IMAGE:I123456abcdef]\nNarration.'));
  assert.equal(scriptResearchResponse({ sources: [], images: [image], warnings: [] }, response).images[0].cited, true);
  embedScriptImages(response, [image]);
  assert.equal(response.script.match(/\[IMAGE:/g).length, 1);
});

test('unmatched sections do not produce a detached gallery and unknown image IDs are rejected', () => {
  const response = { script: '## Different heading\nText', imagePlacements: [placement] };
  embedScriptImages(response, [image]);
  assert.ok(!response.script.includes('[IMAGE:'));
  assert.deepEqual(response.imagePlacements, []);
  assert.throws(() => embedScriptImages({ script: '## The lunar surface', imagePlacements: [{ ...placement, imageId: 'Iffffffffffff' }] }, [image]), /Invalid script image/);
  assert.throws(() => embedScriptImages({ script: '[IMAGE:Iffffffffffff]' }, [image]), /Unknown embedded/);
  const chat = { script: null, imagePlacements: [placement] };
  embedScriptImages(chat, [image]);
  assert.equal(chat.script, null);
  assert.deepEqual(chat.imagePlacements, []);
});

test('image section matching handles formatted headings and skips ambiguous repeated headings', () => {
  const formatted = { script: '## **The lunar surface**\nNarration.', imagePlacements: [placement, placement] };
  embedScriptImages(formatted, [image]);
  assert.equal(formatted.script.match(/\[IMAGE:/g).length, 1);
  assert.equal(formatted.imagePlacements.length, 1);
  const repeated = { script: '## The lunar surface\nFirst.\n## The lunar surface\nSecond.', imagePlacements: [placement] };
  embedScriptImages(repeated, [image]);
  assert.deepEqual(repeated.imagePlacements, []);
  assert.ok(!repeated.script.includes('[IMAGE:'));
});

test('Markdown export contains real image embeds and original attribution without duplicating reference footers', () => {
  const script = `## The lunar surface\n[IMAGE:${image.id}]\n[VISUAL: Lunar terrain [${image.id}]]\n## Research references\n[${image.id}] ${image.url}`;
  const exported = exportScriptMarkdown(script, { images: [image], imagePlacements: [placement] });
  assert.ok(exported.includes(`![${placement.alt}](${image.imageUrl})`));
  assert.ok(exported.includes(`[Original image source](${image.url})`));
  assert.ok(!exported.includes('[IMAGE:'));
  assert.equal(exported.match(/!\[/g).length, 1);
});

test('unsafe image URLs are never inserted into exported Markdown', () => {
  const exported = exportScriptMarkdown(`[IMAGE:${image.id}]`, { images: [{ ...image, imageUrl: 'javascript:alert(1)' }] });
  assert.ok(!exported.includes('javascript:'));
  assert.ok(!exported.includes('!['));
});
