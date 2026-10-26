import { useId } from "react";

export default function ViewTabs({ tabs, value, onChange, label, panelId }) {
  const id = useId();
  return <div className="app-tabs" role="tablist" aria-label={label}>
    {tabs.map((tab, index) => <button key={tab.value} type="button" role="tab"
      id={`${panelId}-tab-${tab.value}`} aria-selected={value === tab.value} aria-controls={panelId}
      tabIndex={value === tab.value ? 0 : -1} data-tab-group={id}
      onClick={() => onChange(tab.value)} onKeyDown={event => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1
          : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
        onChange(tabs[next].value);
        document.getElementById(`${panelId}-tab-${tabs[next].value}`)?.focus();
      }}>{tab.label}{tab.count != null && <span>{tab.count}</span>}</button>)}
  </div>;
}
