export default function ScriptChatContent({ content = '', research }) {
  const references = new Map([...(research?.sources || []), ...(research?.images || [])].map(source => [source.id, source]));
  return <div className="space-y-2 break-words">{content.split('\n').map((line, lineIndex) => <p key={lineIndex} className="whitespace-pre-wrap min-h-2">
    {line.split(/(\*\*[^*]+\*\*|`[^`]+`|\[(?:S|I)[a-f0-9]{12}\])/g).map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
      if (part.startsWith('`') && part.endsWith('`')) return <code key={index} className="rounded bg-surface-100 dark:bg-dark-border px-1 font-mono text-xs">{part.slice(1, -1)}</code>;
      const source = references.get(part.slice(1, -1));
      if (source && /^https?:\/\//i.test(source.url)) return <a key={index} href={source.url} target="_blank" rel="noopener noreferrer"
        className="text-primary-700 dark:text-primary-300 underline" title={source.title}>{part}</a>;
      return part;
    })}
  </p>)}</div>;
}
