import { useMemo, useState, useCallback } from 'react';
import {
  X, MapPin, Briefcase, Calendar, Award, TrendingUp, Clock,
  CheckCircle, Target, ShieldCheck, Sparkles, AlertTriangle,
  BookOpen, ChevronDown, ChevronUp, Lightbulb, ThumbsUp,
} from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts';

const TechnicianDetail = ({ technician, jobs, thresholds, teamMaxValues, onClose }) => {
  const tech = technician;
  const [aiInsights, setAiInsights] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [insightsExpanded, setInsightsExpanded] = useState(true);

  const fetchAiInsights = useCallback(async () => {
    if (!tech?.networkId) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch(`/api/technicians/${tech.networkId}/ai-insights`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to load AI insights');
      }
      const data = await res.json();
      setAiInsights(data.insights);
    } catch (err) {
      setAiError(err.message);
    } finally {
      setAiLoading(false);
    }
  }, [tech?.networkId]);

  // ── Radar chart data (technician only, no team avg) ──
  const radarData = useMemo(() => {
    const normTime = (val) => {
      if (!teamMaxValues || teamMaxValues.avgTime <= 0) return 50;
      return Math.round(Math.max(0, (1 - val / teamMaxValues.avgTime)) * 100);
    };
    const normJPW = (val) => {
      if (!teamMaxValues || teamMaxValues.jobsPerWeek <= 0) return 50;
      return Math.round(Math.min(100, (val / teamMaxValues.jobsPerWeek) * 100));
    };
    const normTotal = (val) => {
      if (!teamMaxValues || teamMaxValues.totalJobs <= 0) return 50;
      return Math.round(Math.min(100, (val / teamMaxValues.totalJobs) * 100));
    };

    return [
      { metric: 'FTFR', value: tech._filteredFTFR, fullMark: 100 },
      { metric: 'Speed', value: normTime(tech._filteredAvgTime), fullMark: 100 },
      { metric: 'Completion', value: tech._filteredCompletionRate, fullMark: 100 },
      { metric: 'Jobs/Week', value: normJPW(tech._filteredJobsPerWeek), fullMark: 100 },
      { metric: 'Volume', value: normTotal(tech._filteredTotalJobs), fullMark: 100 },
      { metric: 'SLA', value: tech._filteredSlaRate, fullMark: 100 },
    ];
  }, [tech, teamMaxValues]);

  // Job type breakdown
  const jobTypeBreakdown = useMemo(() => {
    const map = {};
    jobs.forEach((j) => {
      if (!map[j.jobType]) map[j.jobType] = { type: j.jobType, count: 0, ftfCount: 0 };
      map[j.jobType].count++;
      if (j.firstTimeFix) map[j.jobType].ftfCount++;
    });
    return Object.values(map)
      .sort((a, b) => b.count - a.count)
      .map((jt) => ({
        ...jt,
        ftfr: Math.round((jt.ftfCount / jt.count) * 1000) / 10,
      }));
  }, [jobs]);

  const RadarTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const label = payload[0]?.payload?.metric;
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2.5 text-xs">
        <div className="font-semibold text-gray-900 mb-1">{label}</div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#6366f1' }} />
          <span className="text-gray-500">{tech.name}:</span>
          <span className="font-medium text-gray-800">{payload[0].value}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Slide-over panel */}
      <div className="relative w-full max-w-2xl h-full bg-white shadow-2xl overflow-y-auto animate-slideIn">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{tech.name}</h2>
            <p className="text-sm text-gray-500">{tech.networkId} · {tech.role}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Performance Score - Prominent */}
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-indigo-900">Performance Score</h3>
              <p className="text-xs text-indigo-600 mt-0.5">
                Composite of FTFR, Speed, Completion, Jobs/Week, Volume, SLA
              </p>
            </div>
            <div className="text-3xl font-bold text-indigo-700">
              {tech._filteredScore}%
            </div>
          </div>

          {/* Profile info */}
          <div className="grid grid-cols-2 gap-4">
            <InfoRow icon={MapPin} label="Location" value={`${tech.city}, ${tech.region}`} />
            <InfoRow icon={Briefcase} label="NOM" value={tech.nom} />
            <InfoRow icon={Briefcase} label="ROM" value={tech.rom} />
            <InfoRow icon={Calendar} label="Active Since" value={tech.activationDate?.split(' ')[0]} />
            <InfoRow icon={Award} label="Skills" value={`${tech.skills?.length || 0} skills`} />
            <InfoRow
              icon={TrendingUp}
              label="Performance Tier"
              value={<TierBadge tier={tech.performanceTier} />}
            />
          </div>

          {/* Skills list */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Skills</h3>
            <div className="flex flex-wrap gap-1.5">
              {(tech.skills || []).map((skill) => (
                <span
                  key={skill}
                  className="inline-flex px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Key metrics */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Performance Metrics (Filtered)
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <MetricCard
                icon={CheckCircle}
                label="FTFR"
                value={`${tech._filteredFTFR}%`}
                isHighlighted={tech._filteredFTFR >= thresholds.ftfr.top10}
                isWarning={tech._filteredFTFR <= thresholds.ftfr.bottom10}
              />
              <MetricCard
                icon={Clock}
                label="Avg Time"
                value={`${tech._filteredAvgTime} min`}
                isHighlighted={tech._filteredAvgTime <= thresholds.avgTime.top10}
                isWarning={tech._filteredAvgTime >= thresholds.avgTime.bottom10}
              />
              <MetricCard
                icon={Target}
                label="Completion Rate"
                value={`${tech._filteredCompletionRate}%`}
                isHighlighted={tech._filteredCompletionRate >= 95}
                isWarning={tech._filteredCompletionRate < 80}
              />
              <MetricCard
                icon={TrendingUp}
                label="Jobs/Week"
                value={tech._filteredJobsPerWeek}
                isHighlighted={tech._filteredJobsPerWeek >= thresholds.jobsPerWeek.top10}
                isWarning={tech._filteredJobsPerWeek <= thresholds.jobsPerWeek.bottom10}
              />
              <MetricCard icon={ShieldCheck} label="SLA" value={`${tech._filteredSlaRate}%`} />
              <MetricCard icon={Briefcase} label="Total Jobs" value={`${tech._filteredTotalJobs} / ${tech._filteredTotalAssigned}`} />
            </div>
          </div>

          {/* Radar Chart + Job Type Breakdown */}
          <div className="grid grid-cols-2 gap-4">
            {/* Radar chart */}
            <div className="border border-gray-200 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Performance Radar
              </h3>
              <p className="text-[10px] text-gray-400 mb-2">All values normalized 0-100, higher is better</p>
              <div style={{ height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis
                      dataKey="metric"
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 100]}
                      tick={{ fontSize: 9, fill: '#9ca3af' }}
                      tickCount={5}
                    />
                    <Tooltip content={<RadarTooltip />} />
                    <Radar
                      name={tech.name}
                      dataKey="value"
                      stroke="#6366f1"
                      fill="#6366f1"
                      fillOpacity={0.25}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Job Type Breakdown */}
            <div className="border border-gray-200 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Job Type Breakdown
              </h3>
              <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
                {jobTypeBreakdown.map((jt) => (
                  <div key={jt.type} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 truncate mr-2">{jt.type}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-gray-400">{jt.count} jobs</span>
                      <span className="font-medium text-gray-700">{jt.ftfr}% FTFR</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── AI Insights Section ── */}
          <div className="border border-purple-200 rounded-xl overflow-hidden bg-gradient-to-b from-purple-50/60 to-white">
            {/* Header — always visible */}
            <div className="px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Sparkles className="w-4.5 h-4.5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-purple-900">AI Performance Insights</h3>
                  <p className="text-[11px] text-purple-500">Powered by Claude — analysis of all metrics & job types</p>
                </div>
              </div>
              {aiInsights && (
                <button onClick={() => setInsightsExpanded((p) => !p)}>
                  {insightsExpanded
                    ? <ChevronUp className="w-4 h-4 text-purple-400" />
                    : <ChevronDown className="w-4 h-4 text-purple-400" />
                  }
                </button>
              )}
            </div>

            <div className="px-5 pb-5">
              {/* Not yet requested — show Generate button */}
              {!aiInsights && !aiLoading && !aiError && (
                <button
                  onClick={fetchAiInsights}
                  className="w-full py-3 rounded-lg border-2 border-dashed border-purple-300 text-sm font-medium text-purple-700 hover:bg-purple-50 hover:border-purple-400 transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate AI Insights for {tech.name}
                </button>
              )}

              {/* Loading */}
              {aiLoading && (
                <div className="flex items-center gap-3 py-6 justify-center">
                  <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-purple-600">Analyzing performance data...</span>
                </div>
              )}

              {/* Error */}
              {aiError && !aiLoading && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-red-700">{aiError}</p>
                    <button
                      onClick={fetchAiInsights}
                      className="text-xs text-red-600 underline mt-1 hover:text-red-800"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}

              {/* Results — collapsible once loaded */}
              {aiInsights && !aiLoading && insightsExpanded && (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="bg-white border border-purple-100 rounded-lg p-4">
                    <p className="text-sm text-gray-700 leading-relaxed">{aiInsights.summary}</p>
                  </div>

                  {/* Strengths */}
                  {aiInsights.strengths?.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
                        <h4 className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Strengths</h4>
                      </div>
                      <div className="space-y-1.5">
                        {aiInsights.strengths.map((s, i) => (
                          <div key={i} className="flex items-start gap-2 bg-emerald-50/60 border border-emerald-100 rounded-lg px-3 py-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                            <p className="text-xs text-emerald-800 leading-relaxed">{s}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Areas of Improvement */}
                  {aiInsights.improvements?.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                        <h4 className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Areas to Improve</h4>
                      </div>
                      <div className="space-y-2">
                        {aiInsights.improvements.map((item, i) => (
                          <div key={i} className="bg-amber-50/60 border border-amber-100 rounded-lg px-3 py-2.5">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-xs font-semibold text-amber-800">{item.area}</span>
                            </div>
                            <p className="text-xs text-amber-700 leading-relaxed">{item.detail}</p>
                            <p className="text-xs text-amber-900 font-medium mt-1.5 flex items-start gap-1">
                              <span className="text-amber-500">→</span> {item.recommendation}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Training Recommendations */}
                  {aiInsights.trainingRecommendations?.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                        <h4 className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Recommended Training</h4>
                      </div>
                      <div className="space-y-1.5">
                        {aiInsights.trainingRecommendations.map((rec, i) => (
                          <div key={i} className="bg-blue-50/60 border border-blue-100 rounded-lg px-3 py-2.5">
                            <p className="text-xs font-semibold text-blue-800">{rec.skill}</p>
                            <p className="text-xs text-blue-600 mt-0.5 leading-relaxed">{rec.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-2">
    <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
    <div>
      <div className="text-xs text-gray-400">{label}</div>
      <div className="text-sm text-gray-800">{typeof value === 'string' ? value : value}</div>
    </div>
  </div>
);

const MetricCard = ({ icon: Icon, label, value, isHighlighted, isWarning }) => {
  let border = 'border-gray-200';
  if (isHighlighted) border = 'border-emerald-300 bg-emerald-50/40';
  if (isWarning) border = 'border-red-300 bg-red-50/40';

  return (
    <div className={`border rounded-lg p-3 ${border}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <div className="text-lg font-bold text-gray-900">{value}</div>
    </div>
  );
};

const TierBadge = ({ tier }) => {
  const styles = {
    top: 'bg-emerald-100 text-emerald-700',
    above_avg: 'bg-blue-100 text-blue-700',
    average: 'bg-gray-100 text-gray-700',
    below_avg: 'bg-amber-100 text-amber-700',
    bottom: 'bg-red-100 text-red-700',
    no_data: 'bg-gray-100 text-gray-400',
  };

  const labels = {
    top: 'Top Performer',
    above_avg: 'Above Average',
    average: 'Average',
    below_avg: 'Below Average',
    bottom: 'Needs Attention',
    no_data: 'No Data',
  };

  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${styles[tier] || styles.no_data}`}>
      {labels[tier] || tier}
    </span>
  );
};

export default TechnicianDetail;
