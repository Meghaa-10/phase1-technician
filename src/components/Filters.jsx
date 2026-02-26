import { Search, SlidersHorizontal, RotateCcw } from 'lucide-react';

const Filters = ({ filters, filterOptions, dateRange, onFilterChange }) => {
  const handleReset = () => {
    onFilterChange('region', '');
    onFilterChange('jobType', '');
    onFilterChange('role', '');
    onFilterChange('search', '');
    onFilterChange('dateFrom', dateRange.min);
    onFilterChange('dateTo', dateRange.max);
  };

  const hasActiveFilters =
    filters.region ||
    filters.jobType ||
    filters.role ||
    filters.search ||
    filters.dateFrom !== dateRange.min ||
    filters.dateTo !== dateRange.max;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <SlidersHorizontal className="w-4 h-4" />
          <span>Filters</span>
        </div>
        {hasActiveFilters && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* Search */}
        <div className="relative xl:col-span-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search name, ID, city..."
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
          />
        </div>

        {/* Region */}
        <select
          value={filters.region}
          onChange={(e) => onFilterChange('region', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white"
        >
          <option value="">All Regions</option>
          {filterOptions.regions.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        {/* Job Type */}
        <select
          value={filters.jobType}
          onChange={(e) => onFilterChange('jobType', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white"
        >
          <option value="">All Job Types</option>
          {filterOptions.jobTypes.map((j) => (
            <option key={j} value={j}>{j}</option>
          ))}
        </select>

        {/* Role */}
        <select
          value={filters.role}
          onChange={(e) => onFilterChange('role', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white"
        >
          <option value="">All Roles</option>
          {filterOptions.roles.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        {/* Date From */}
        <input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => onFilterChange('dateFrom', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
        />

        {/* Date To */}
        <input
          type="date"
          value={filters.dateTo}
          onChange={(e) => onFilterChange('dateTo', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
        />
      </div>
    </div>
  );
};

export default Filters;
