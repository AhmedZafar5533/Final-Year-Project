export function getDeepSeekConfig() {
  return {
    apiKey: process.env.DEEPSEEK_API_KEY?.trim() || '',
    apiUrl: process.env.DEEPSEEK_API_URL?.trim() || 'https://api.deepseek.com/chat/completions',
    model: process.env.DEEPSEEK_MODEL?.trim() || 'deepseek-flash'
  };
}
