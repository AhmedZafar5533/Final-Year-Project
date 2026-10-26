export default function ScriptRequestMode({ value, onChange, disabled }) {
  return <div className="pb-2">
    <div role="group" aria-label="Request mode" className="inline-flex rounded-lg bg-surface-100 dark:bg-dark-border p-1 gap-1">
      {[['auto', 'Auto'], ['chat', 'Ask only'], ['edit', 'Edit script']].map(([mode, label]) => <button key={mode} type="button" aria-pressed={value === mode} title={mode === "chat" ? "Answer in chat without changing the draft" : mode === "edit" ? "Apply changes to the draft" : "Answer questions or apply requested edits"}
        disabled={disabled} onClick={() => onChange(mode)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-50 ${value === mode ? 'bg-white dark:bg-dark-surface shadow-sm text-primary-700 dark:text-primary-300' : 'text-text-muted hover:text-primary-600'}`}>{label}</button>)}
    </div>

  </div>;
}
