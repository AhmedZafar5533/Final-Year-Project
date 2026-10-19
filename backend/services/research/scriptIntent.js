import { deepSeekJson } from './providers.js';

export async function classifyScriptRequest({ messages, currentScript, requestMode = 'auto', log }) {
  if (requestMode === 'chat') return 'chat';
  if (requestMode === 'edit') return currentScript ? 'refine' : 'generate';
  const result = await deepSeekJson(
    'Classify the latest request in a YouTube script workspace. Return JSON {"intent":"chat|refine|generate"}. ' +
    'chat means answer a question, discuss/explain a concept, critique without applying changes, find sources/images, ' +
    'or suggest options. It MUST NOT modify the draft. refine means the user explicitly asks to apply changes to the ' +
    'existing script, add/remove/replace script content or change its wording, tone, length or format. ' +
    'generate means an explicit request to write a new script. A question such as "can you explain this?" is chat; ' +
    '"can you simplify this section in the script?" is refine. If uncertain choose chat. ' +
    'The existence of a draft does not imply permission to edit it. Use recent conversation only to resolve references.',
    { request: messages.filter(message => message.role === 'user').at(-1)?.content.slice(0, 4000),
      recentConversation: messages.slice(-4), hasDraft: Boolean(currentScript) },
    { signal: AbortSignal.timeout(15000), usage: {}, log }, value => {
      if (!['chat', 'refine', 'generate'].includes(value?.intent)) throw new Error('Invalid script intent');
      return value;
    });
  return result.intent;
}
