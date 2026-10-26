import { createElement } from "react";
import { IoBarChartOutline, IoBulbOutline, IoDocumentTextOutline } from "react-icons/io5";

export default function AuthAside() {
  return <aside className="auth-aside hidden lg:flex">
    <div className="auth-aside-content">
      <span className="text-xs font-medium tracking-widest uppercase text-white/60">Made for creators</span>
      <h2>Know what to<br />make next.</h2>
      <p className="text-white/70 text-base leading-relaxed max-w-sm">Understand your audience, find an idea, and start writing.</p>
      <div className="auth-workflow">
        {[[IoBarChartOutline, "Understand your channel", "See what connects with your audience."], [IoBulbOutline, "Find your next idea", "Build on viewer questions and trends."], [IoDocumentTextOutline, "Make it a script", "Research, write, and refine in one place."]].map(([Icon, title, description]) => <div key={title} className="flex items-start gap-4">
          <span className="p-2.5 rounded-lg bg-white/10">{createElement(Icon, { className: "w-5 h-5 text-white/85" })}</span>
          <div><h3 className="text-sm font-medium text-white">{title}</h3><p className="text-xs mt-1.5 leading-relaxed text-white/60">{description}</p></div>
        </div>)}
      </div>
    </div>
    <span className="text-xs text-white/45">OnlyCreators · Your creator workspace</span>
  </aside>;
}
