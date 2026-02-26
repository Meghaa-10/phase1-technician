import { ChevronUp, ChevronDown, ArrowUpDown, Trophy, AlertTriangle, Eye } from 'lucide-react';

const COLUMNS = [
  { key: 'rank', label: '#', sortable: false, width: 'w-12' },
  { key: 'name', label: 'Technician', sortable: true, width: 'min-w-[200px]' },
  { key: 'performanceScore', label: 'Score', sortable: true, width: 'w-20' },
  { key: 'firstTimeFixRate', label: 'FTFR', sortable: true, width: 'w-20' },
  { key: 'avgCompletionTimeMinutes', label: 'Avg Time', sortable: true, width: 'w-24' },
  { key: 'completionRate', label: 'Completion %', sortable: true, width: 'w-24' },
  { key: 'jobsPerWeek', label: 'Jobs/Week', sortable: true, width: 'w-24' },
  { key: 'totalJobsCompleted', label: 'Total Jobs', sortable: true, width: 'w-24' },
  { key: 'slaComplianceRate', label: 'SLA %', sortable: true, width: 'w-20' },
  { key: 'actions', label: '', sortable: false, width: 'w-12' },
];

const getOutlierTag = (tech, thresholds) => {
  const score = tech._filteredScore;
  if (!thresholds.performanceScore) {
    // Fallback to FTFR-based detection
    const ftfr = tech._filteredFTFR;
    if (ftfr >= thresholds.ftfr.top10) return 'top';
    if (ftfr <= thresholds.ftfr.bottom10) return 'bottom';
    return null;
  }

  if (score >= thresholds.performanceScore.top10) return 'top';
  if (score <= thresholds.performanceScore.bottom10) return 'bottom';
  return null;
};

const SortIcon = ({ columnKey, sortConfig }) => {
  if (sortConfig.key !== columnKey) {
    return <ArrowUpDown className="w-3 h-3 text-gray-300" />;
  }
  return sortConfig.direction === 'asc' ? (
    <ChevronUp className="w-3.5 h-3.5 text-brand-600" />
  ) : (
    <ChevronDown className="w-3.5 h-3.5 text-brand-600" />
  );
};

const TechnicianTable = ({ technicians, thresholds, sortConfig, onSort, onSelect }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">
          Technician Rankings
          <span className="ml-2 text-xs font-normal text-gray-400">
            ({technicians.length} technicians)
          </span>
        </h2>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-gray-500">Top 10%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-gray-500">Bottom 10%</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${col.width} ${
                    col.sortable ? 'cursor-pointer select-none hover:text-gray-700' : ''
                  }`}
                  onClick={col.sortable ? () => onSort(col.key) : undefined}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && <SortIcon columnKey={col.key} sortConfig={sortConfig} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {technicians.map((tech, index) => {
              const outlier = getOutlierTag(tech, thresholds);
              const rowBg =
                outlier === 'top'
                  ? 'bg-emerald-50/50 hover:bg-emerald-50'
                  : outlier === 'bottom'
                    ? 'bg-red-50/50 hover:bg-red-50'
                    : 'hover:bg-gray-50';

              return (
                <tr
                  key={tech.networkId}
                  className={`${rowBg} transition-colors cursor-pointer`}
                  onClick={() => onSelect(tech)}
                >
                  <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                    {index + 1}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {outlier === 'top' && (
                        <Trophy className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      )}
                      {outlier === 'bottom' && (
                        <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      )}
                      <div>
                        <div className="font-medium text-gray-900">{tech.name}</div>
                        <div className="text-xs text-gray-400">
                          {tech.role} · {tech.city}, {tech.region}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <ScoreBadge value={tech._filteredScore} thresholds={thresholds} />
                  </td>
                  <td className="px-4 py-3">
                    <FTFRBadge value={tech._filteredFTFR} thresholds={thresholds} />
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-medium">
                    {tech._filteredAvgTime} min
                  </td>
                  <td className="px-4 py-3">
                    <CompletionBadge value={tech._filteredCompletionRate} />
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-medium">
                    {tech._filteredJobsPerWeek}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {tech._filteredTotalJobs}
                  </td>
                  <td className="px-4 py-3">
                    <SLABadge value={tech._filteredSlaRate} />
                  </td>
                  <td className="px-4 py-3">
                    <Eye className="w-4 h-4 text-gray-300 hover:text-brand-500" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {technicians.length === 0 && (
        <div className="px-4 py-12 text-center text-sm text-gray-400">
          No technicians match the current filters.
        </div>
      )}
    </div>
  );
};

const ScoreBadge = ({ value, thresholds }) => {
  let color = 'bg-gray-100 text-gray-700';
  if (thresholds.performanceScore) {
    if (value >= thresholds.performanceScore.top10) color = 'bg-indigo-100 text-indigo-700';
    else if (value <= thresholds.performanceScore.bottom10) color = 'bg-red-100 text-red-700';
    else if (value >= 75) color = 'bg-blue-50 text-blue-700';
  }

  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${color}`}>
      {value}%
    </span>
  );
};

const FTFRBadge = ({ value, thresholds }) => {
  let color = 'bg-gray-100 text-gray-700';
  if (value >= thresholds.ftfr.top10) color = 'bg-emerald-100 text-emerald-700';
  else if (value <= thresholds.ftfr.bottom10) color = 'bg-red-100 text-red-700';
  else if (value >= 80) color = 'bg-blue-50 text-blue-700';

  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      {value}%
    </span>
  );
};

const CompletionBadge = ({ value }) => {
  let color = 'text-gray-600';
  if (value >= 95) color = 'text-emerald-600';
  else if (value < 80) color = 'text-red-600';
  else if (value < 88) color = 'text-amber-600';

  return <span className={`text-sm font-medium ${color}`}>{value}%</span>;
};

const SLABadge = ({ value }) => {
  let color = 'text-gray-600';
  if (value >= 90) color = 'text-emerald-600';
  else if (value < 70) color = 'text-red-600';

  return <span className={`text-sm font-medium ${color}`}>{value}%</span>;
};

export default TechnicianTable;
