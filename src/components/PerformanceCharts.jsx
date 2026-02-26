import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';

const BRAND_COLOR = '#667eea';

const PerformanceCharts = ({ technicians, allTechnicians, allJobs, selectedRegion, filters }) => {
  // ── Score Distribution (always uses current filtered technicians) ──
  const distributionData = useMemo(() => {
    const buckets = [
      { range: '30-40%', min: 30, max: 40, count: 0 },
      { range: '40-50%', min: 40, max: 50, count: 0 },
      { range: '50-60%', min: 50, max: 60, count: 0 },
      { range: '60-70%', min: 60, max: 70, count: 0 },
      { range: '70-80%', min: 70, max: 80, count: 0 },
      { range: '80-90%', min: 80, max: 90, count: 0 },
      { range: '90-100%', min: 90, max: 100, count: 0 },
    ];

    technicians.forEach((t) => {
      const score = t._filteredScore;
      const bucket = buckets.find((b) => score >= b.min && score < b.max);
      if (bucket) bucket.count++;
      else if (score === 100) buckets[buckets.length - 1].count++;
    });

    return buckets.filter((b) => b.count > 0 || b.min >= 40);
  }, [technicians]);

  // ── All-regions radar (shown when NO region is selected) ──
  const regionalRadarData = useMemo(() => {
    if (selectedRegion) return [];

    const regionMap = {};
    technicians.forEach((t) => {
      if (!regionMap[t.region]) {
        regionMap[t.region] = { region: t.region, scores: [] };
      }
      regionMap[t.region].scores.push(t._filteredScore);
    });

    return Object.values(regionMap)
      .map((r) => ({
        region: r.region,
        avgScore: Math.round((r.scores.reduce((a, b) => a + b, 0) / r.scores.length) * 10) / 10,
        count: r.scores.length,
      }))
      .sort((a, b) => a.region.localeCompare(b.region));
  }, [technicians, selectedRegion]);

  // ── 6-metric radar for selected region (shown when a region IS selected) ──
  const regionMetricData = useMemo(() => {
    if (!selectedRegion) return null;

    const regionTechs = technicians.filter((t) => t.region === selectedRegion);
    if (regionTechs.length === 0) return null;

    const len = regionTechs.length;
    const avg = (fn) => Math.round((regionTechs.reduce((s, t) => s + fn(t), 0) / len) * 10) / 10;

    // Normalize time, jpw, volume against full dataset to keep radar meaningful
    const allMaxTime = Math.max(...technicians.map((t) => t._filteredAvgTime), 1);
    const allMaxJPW = Math.max(...technicians.map((t) => t._filteredJobsPerWeek), 1);
    const allMaxTotal = Math.max(...technicians.map((t) => t._filteredTotalJobs), 1);

    const avgTime = avg((t) => t._filteredAvgTime);
    const avgJPW = avg((t) => t._filteredJobsPerWeek);
    const avgTotal = avg((t) => t._filteredTotalJobs);

    return {
      count: len,
      data: [
        { metric: 'FTFR', value: avg((t) => t._filteredFTFR), raw: `${avg((t) => t._filteredFTFR)}%` },
        { metric: 'Speed', value: Math.round(Math.max(0, (1 - avgTime / allMaxTime)) * 100), raw: `${avgTime} min` },
        { metric: 'Completion', value: avg((t) => t._filteredCompletionRate), raw: `${avg((t) => t._filteredCompletionRate)}%` },
        { metric: 'Jobs/Week', value: Math.round(Math.min(100, (avgJPW / allMaxJPW) * 100)), raw: `${avgJPW}` },
        { metric: 'Volume', value: Math.round(Math.min(100, (avgTotal / allMaxTotal) * 100)), raw: `${avgTotal} jobs` },
        { metric: 'SLA', value: avg((t) => t._filteredSlaRate), raw: `${avg((t) => t._filteredSlaRate)}%` },
      ],
    };
  }, [selectedRegion, technicians]);

  const DistTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
        <div className="font-semibold text-gray-900">Score {d.range}</div>
        <div className="text-gray-500">{d.count} technician{d.count !== 1 ? 's' : ''}</div>
      </div>
    );
  };

  const RegionalTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
        <div className="font-semibold text-gray-900">{d.region}</div>
        <div className="text-gray-500">Avg Score: <span className="font-medium text-gray-800">{d.avgScore}%</span></div>
        <div className="text-gray-500">{d.count} technician{d.count !== 1 ? 's' : ''}</div>
      </div>
    );
  };

  const MetricTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2.5 text-xs">
        <div className="font-semibold text-gray-900">{d.metric}</div>
        <div className="text-gray-600">{d.raw}</div>
      </div>
    );
  };

  const isRegionSelected = selectedRegion && regionMetricData;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">Performance Overview</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
        {/* Score Distribution */}
        <div className="p-4">
          <h3 className="text-xs font-medium text-gray-500 mb-2">Score Distribution</h3>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distributionData} margin={{ top: 10, right: 10, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="range" tick={{ fontSize: 10, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} allowDecimals={false} />
                <Tooltip content={<DistTooltip />} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={45} fill={BRAND_COLOR} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right panel: switches based on region filter */}
        <div className="p-4">
          {isRegionSelected ? (
            <>
              <h3 className="text-xs font-medium text-gray-500 mb-2">
                <span className="text-gray-900 font-semibold">{selectedRegion}</span>
                <span className="text-gray-400 ml-1.5">— 6 Metric Breakdown ({regionMetricData.count} techs)</span>
              </h3>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={regionMetricData.data} cx="50%" cy="50%" outerRadius="72%">
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#374151' }} />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 100]}
                      tick={{ fontSize: 9, fill: '#9ca3af' }}
                      tickCount={5}
                    />
                    <Tooltip content={<MetricTooltip />} />
                    <Radar
                      name={selectedRegion}
                      dataKey="value"
                      stroke="#6366f1"
                      fill="#6366f1"
                      fillOpacity={0.25}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-xs font-medium text-gray-500 mb-2">Regional Performance</h3>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={regionalRadarData} cx="50%" cy="50%" outerRadius="68%">
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="region" tick={{ fontSize: 9, fill: '#6b7280' }} />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 100]}
                      tick={{ fontSize: 8, fill: '#9ca3af' }}
                      tickCount={5}
                    />
                    <Tooltip content={<RegionalTooltip />} />
                    <Radar
                      name="Avg Score"
                      dataKey="avgScore"
                      stroke={BRAND_COLOR}
                      fill={BRAND_COLOR}
                      fillOpacity={0.25}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PerformanceCharts;
