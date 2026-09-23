import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import Card from "../common/Card";
import Button from "../common/Button";
import { IoSparkles } from "react-icons/io5";

// Single source of truth for the opportunity tiers — used by the bars,
// the legend swatches, and the tooltip so the three can't drift out of sync.
const OPPORTUNITY_TIERS = [
  { label: "High Opportunity (80+)", min: 80, hex: "#10B981", swatch: "bg-success-500" },
  { label: "Medium (50-79)", min: 50, hex: "#F59E0B", swatch: "bg-warning-500" },
  { label: "Lower (<50)", min: 0, hex: "#EF4444", swatch: "bg-error-500" },
];

const tierFor = (score) => OPPORTUNITY_TIERS.find((tier) => score >= tier.min) ?? OPPORTUNITY_TIERS[2];

// Recharts renders raw SVG, so its stroke/fill props need literal color
// values rather than Tailwind classes — these are kept in sync with the
// app's surface/text tokens by hand. If the design tokens change, update here too.
const CHART_COLORS = {
  grid: "#E5E7EB",
  gridDark: "#374151",
  axisTick: "#6B7280",
  axisTickDark: "#9CA3AF",
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { fullTopic, score } = payload[0].payload;
  const tier = tierFor(score);
  return (
    <div className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg ring-1 ring-white/10">
      <p className="text-sm font-medium mb-1 max-w-[220px] truncate">{fullTopic}</p>
      <p className="text-lg font-bold flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tier.hex }} />
        Opportunity: {score}%
      </p>
    </div>
  );
};

const ContentGapChart = ({ trends = [] }) => {
  const gapData = trends
    .filter((t) => !t.covered)
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .slice(0, 6)
    .map((trend) => ({
      topic: trend.topic.length > 20 ? `${trend.topic.slice(0, 20)}...` : trend.topic,
      fullTopic: trend.topic,
      score: trend.opportunityScore,
      covered: trend.covered,
    }));

  return (
    <Card
      title="Content Gap Analysis"
      subtitle="Topics you haven't covered yet"
      headerAction={
        <Button variant="ghost" size="sm" leftIcon={<IoSparkles className="w-4 h-4" />}>
          Get AI Suggestions
        </Button>
      }
    >
      {gapData.length > 0 ? (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={gapData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={CHART_COLORS.grid}
                horizontal
                vertical={false}
              />
              <XAxis
                type="number"
                domain={[0, 100]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: CHART_COLORS.axisTick, fontSize: 12 }}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis
                type="category"
                dataKey="topic"
                axisLine={false}
                tickLine={false}
                tick={{ fill: CHART_COLORS.axisTick, fontSize: 12 }}
                width={150}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
              <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={24}>
                {gapData.map((entry) => (
                  <Cell key={entry.fullTopic} fill={tierFor(entry.score).hex} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-80 flex items-center justify-center">
          <div className="text-center px-6">
            <div className="w-16 h-16 bg-success-100 dark:bg-success-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <IoSparkles className="w-8 h-8 text-success-600 dark:text-success-400" />
            </div>
            <h3 className="text-lg font-semibold text-text-heading mb-2">
              Great job! You're on top of trends
            </h3>
            <p className="text-text-light max-w-sm mx-auto">
              You've covered all the major trending topics. Keep monitoring for new opportunities.
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-surface-border">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          {OPPORTUNITY_TIERS.map((tier) => (
            <div key={tier.label} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded ${tier.swatch}`} />
              <span className="text-text-light">{tier.label}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default ContentGapChart;
