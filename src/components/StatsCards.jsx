import { Users, CheckCircle, Clock, TrendingUp, Target, ShieldCheck, Award } from 'lucide-react';

const StatsCards = ({ technicians, totalJobs }) => {
  const activeTechs = technicians.length;

  const avgFTFR =
    activeTechs > 0
      ? Math.round(
          (technicians.reduce((s, t) => s + t._filteredFTFR, 0) / activeTechs) * 10
        ) / 10
      : 0;

  const avgCompletionTime =
    activeTechs > 0
      ? Math.round(
          technicians.reduce((s, t) => s + t._filteredAvgTime, 0) / activeTechs
        )
      : 0;

  const avgCompletionRate =
    activeTechs > 0
      ? Math.round(
          (technicians.reduce((s, t) => s + t._filteredCompletionRate, 0) / activeTechs) * 10
        ) / 10
      : 0;

  const avgJobsPerWeek =
    activeTechs > 0
      ? Math.round(
          (technicians.reduce((s, t) => s + t._filteredJobsPerWeek, 0) / activeTechs) * 10
        ) / 10
      : 0;

  const avgSla =
    activeTechs > 0
      ? Math.round(
          (technicians.reduce((s, t) => s + t._filteredSlaRate, 0) / activeTechs) * 10
        ) / 10
      : 0;

  const avgScore =
    activeTechs > 0
      ? Math.round(
          (technicians.reduce((s, t) => s + t._filteredScore, 0) / activeTechs) * 10
        ) / 10
      : 0;

  const cards = [
    {
      label: 'Performance Score',
      value: `${avgScore}%`,
      subLabel: 'Across 6 metrics',
      icon: Award,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      label: 'Technicians',
      value: activeTechs,
      subLabel: `${totalJobs.toLocaleString()} jobs`,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'First-Time Fix Rate',
      value: `${avgFTFR}%`,
      subLabel: 'Filtered average',
      icon: CheckCircle,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Completion Time',
      value: `${avgCompletionTime} min`,
      subLabel: 'Per job average',
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Completion Rate',
      value: `${avgCompletionRate}%`,
      subLabel: 'Done / assigned',
      icon: Target,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
    },
    {
      label: 'Jobs / Week',
      value: avgJobsPerWeek,
      subLabel: 'Per technician',
      icon: TrendingUp,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
    {
      label: 'SLA Compliance',
      value: `${avgSla}%`,
      subLabel: 'Service adherence',
      icon: ShieldCheck,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white rounded-xl border border-gray-200 px-3 py-3.5 shadow-sm"
        >
          <div className="flex items-center gap-1.5 mb-2">
            <div className={`${card.bg} p-1 rounded-md`}>
              <card.icon className={`w-3.5 h-3.5 ${card.color}`} />
            </div>
            <span className="text-[11px] font-medium text-gray-500 leading-tight">
              {card.label}
            </span>
          </div>
          <div className="text-lg font-bold text-gray-900 leading-none">{card.value}</div>
          <div className="text-[10px] text-gray-400 mt-1">{card.subLabel}</div>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;
