import { useMemo, useState } from "react";
import { IoChevronDown } from "react-icons/io5";
import Card from "../common/Card";

function normalizeItem(item, index) {
  if (typeof item === "string") return { id: index, recommendation: item };
  return { id: item.id || index, category: item.category,
    recommendation: item.recommendation || item.text || item.tip || item.objective,
    current: item.current, impact: item.impact };
}

export default function RecommendationCard({ recommendations, suggestedTags, isPlaceholder = false }) {
  const [expanded, setExpanded] = useState(false);
  const [tagsExpanded, setTagsExpanded] = useState(false);
  const items = useMemo(() => (Array.isArray(recommendations) ? recommendations : []).map(normalizeItem).filter(item => item.recommendation), [recommendations]);
  const tags = Array.isArray(suggestedTags) ? suggestedTags : [];
  if (!items.length && !tags.length) return isPlaceholder ? <p className="section-note" role="status">Content tips are unavailable. Refresh insights to try again.</p> : null;
  return <Card title="More ways to improve">
    <div className="divide-y divide-surface-200 dark:divide-dark-border">
      {(expanded ? items : items.slice(0, 3)).map(item => <div key={item.id} className="py-4 first:pt-0 space-y-2">
        {item.category && <h3 className="text-sm font-semibold text-text-primary dark:text-dark-text">{item.category}</h3>}
        <p className="text-sm leading-relaxed text-text-secondary dark:text-dark-text-muted">{item.recommendation}</p>
        {(item.current || item.impact) && <details className="text-xs text-text-muted">
          <summary className="cursor-pointer font-medium py-1">Supporting detail</summary>
          <dl className="mt-2 space-y-2">
            {item.current && <div><dt className="font-semibold">Current approach</dt><dd className="mt-1">{item.current}</dd></div>}
            {item.impact && <div><dt className="font-semibold">Estimated impact</dt><dd className="mt-1">{item.impact}</dd></div>}
          </dl>
        </details>}
      </div>)}
    </div>
    {items.length > 3 && <button type="button" className="app-button-quiet mt-2" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? "Show fewer tips" : `View all ${items.length} tips`}<IoChevronDown className={expanded ? "rotate-180" : ""} /></button>}
    {!!tags.length && <div className="mt-5 pt-5 border-t border-surface-200 dark:border-dark-border">
      <h3 className="text-sm font-semibold mb-3">Suggested tags</h3>
      <div className="flex flex-wrap gap-2">{(tagsExpanded ? tags : tags.slice(0, 5)).map((tag, index) => <span key={index} className="idea-category text-xs">{tag}</span>)}
        {tags.length > 5 && <button type="button" aria-expanded={tagsExpanded} onClick={() => setTagsExpanded(value => !value)} className="text-xs font-medium text-primary-600 dark:text-primary-300 px-2">{tagsExpanded ? "Fewer tags" : `+${tags.length - 5} more`}</button>}
      </div>
    </div>}
  </Card>;
}
