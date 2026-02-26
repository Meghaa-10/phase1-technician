import { useState, useMemo, useCallback, useEffect } from 'react';
import StatsCards from './components/StatsCards';
import Filters from './components/Filters';
import TechnicianTable from './components/TechnicianTable';
import PerformanceCharts from './components/PerformanceCharts';
import TechnicianDetail from './components/TechnicianDetail';
import Header from './components/Header';

const DEFAULT_THRESHOLDS = {
  ftfr: { top10: 0, bottom10: 0 },
  avgTime: { top10: 0, bottom10: 0 },
  jobsPerWeek: { top10: 0, bottom10: 0 },
};

const App = () => {
  // ── API data state ──
  const [technicians, setTechnicians] = useState([]);
  const [allJobs, setAllJobs] = useState([]);
  const [globalThresholds, setGlobalThresholds] = useState(DEFAULT_THRESHOLDS);
  const [filterOptions, setFilterOptions] = useState({
    regions: [], jobTypes: [], roles: [], noms: [], roms: [],
  });
  const [apiDateRange, setApiDateRange] = useState({ min: '', max: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Fetch all data from Python backend on mount ──
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [techRes, jobsRes, threshRes, filtersRes, dateRes] = await Promise.all([
          fetch('/api/technicians'),
          fetch('/api/jobs'),
          fetch('/api/thresholds'),
          fetch('/api/filters'),
          fetch('/api/date-range'),
        ]);

        if (!techRes.ok || !jobsRes.ok || !threshRes.ok || !filtersRes.ok || !dateRes.ok) {
          throw new Error('Failed to fetch data from backend');
        }

        const [techData, jobsData, threshData, filtersData, dateData] = await Promise.all([
          techRes.json(), jobsRes.json(), threshRes.json(), filtersRes.json(), dateRes.json(),
        ]);

        setTechnicians(techData);
        setAllJobs(jobsData);
        setGlobalThresholds(threshData);
        setFilterOptions(filtersData);
        setApiDateRange(dateData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ── Filters ──
  const [filters, setFilters] = useState({
    region: '',
    jobType: '',
    dateFrom: '',
    dateTo: '',
    role: '',
    search: '',
  });

  // Sync date range once API data arrives
  useEffect(() => {
    if (apiDateRange.min && apiDateRange.max) {
      setFilters((prev) => ({
        ...prev,
        dateFrom: prev.dateFrom || apiDateRange.min,
        dateTo: prev.dateTo || apiDateRange.max,
      }));
    }
  }, [apiDateRange]);

  const [selectedTechnician, setSelectedTechnician] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'performanceScore', direction: 'desc' });

  // Filter jobs by date range and job type
  const filteredJobs = useMemo(() => {
    return allJobs.filter((job) => {
      if (filters.dateFrom && job.date < filters.dateFrom) return false;
      if (filters.dateTo && job.date > filters.dateTo) return false;
      if (filters.jobType && job.jobType !== filters.jobType) return false;
      if (filters.region && job.region !== filters.region) return false;
      return true;
    });
  }, [allJobs, filters.dateFrom, filters.dateTo, filters.jobType, filters.region]);

  // Recompute technician metrics based on filtered jobs
  const filteredTechnicians = useMemo(() => {
    const jobsByTech = {};
    filteredJobs.forEach((job) => {
      if (!jobsByTech[job.technicianId]) jobsByTech[job.technicianId] = [];
      jobsByTech[job.technicianId].push(job);
    });

    return technicians
      .filter((tech) => {
        if (filters.region && tech.region !== filters.region) return false;
        if (filters.role && tech.role !== filters.role) return false;
        if (filters.search) {
          const term = filters.search.toLowerCase();
          if (
            !tech.name.toLowerCase().includes(term) &&
            !tech.networkId.toLowerCase().includes(term) &&
            !tech.city.toLowerCase().includes(term)
          ) {
            return false;
          }
        }
        return true;
      })
      .map((tech) => {
        const jobs = jobsByTech[tech.networkId] || [];
        if (jobs.length === 0) {
          return {
            ...tech,
            _filteredTotalJobs: 0,
            _filteredTotalAssigned: 0,
            _filteredCompletionRate: 0,
            _filteredFTFR: 0,
            _filteredAvgTime: 0,
            _filteredJobsPerWeek: 0,
            _filteredSlaRate: 0,
            _filteredScore: 0,
          };
        }

        const total = jobs.length;
        const ftfr = (jobs.filter((j) => j.firstTimeFix).length / total) * 100;
        const avgTime = jobs.reduce((s, j) => s + j.completionTimeMinutes, 0) / total;
        const slaRate = (jobs.filter((j) => j.slaCompliant).length / total) * 100;

        const dates = jobs.map((j) => new Date(j.date).getTime());
        const weeks = Math.max(1, (Math.max(...dates) - Math.min(...dates)) / (7 * 86400000));
        const jpw = Math.round(((total / weeks)) * 10) / 10;

        // Compute assigned count proportionally to maintain completion rate ratio
        // When filters narrow down jobs (e.g. by job type), scale assigned accordingly
        const cr = tech.completionRate || 90;
        const filteredAssigned = Math.round(total / (cr / 100));

        return {
          ...tech,
          _filteredTotalJobs: total,
          _filteredTotalAssigned: filteredAssigned,
          _filteredCompletionRate: cr,
          _filteredFTFR: Math.round(ftfr * 10) / 10,
          _filteredAvgTime: Math.round(avgTime),
          _filteredJobsPerWeek: jpw,
          _filteredSlaRate: Math.round(slaRate * 10) / 10,
          _filteredScore: tech.performanceScore || 0,
        };
      })
      .filter((tech) => tech._filteredTotalJobs > 0);
  }, [technicians, filteredJobs, filters.region, filters.role, filters.search]);

  // Sort technicians
  const sortedTechnicians = useMemo(() => {
    const sorted = [...filteredTechnicians];
    sorted.sort((a, b) => {
      const keyMap = {
        performanceScore: '_filteredScore',
        firstTimeFixRate: '_filteredFTFR',
        avgCompletionTimeMinutes: '_filteredAvgTime',
        completionRate: '_filteredCompletionRate',
        jobsPerWeek: '_filteredJobsPerWeek',
        slaComplianceRate: '_filteredSlaRate',
        totalJobsCompleted: '_filteredTotalJobs',
        name: 'name',
      };
      const key = keyMap[sortConfig.key] || sortConfig.key;
      const aVal = a[key];
      const bVal = b[key];
      if (typeof aVal === 'string') {
        return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return sorted;
  }, [filteredTechnicians, sortConfig]);

  // Compute dynamic thresholds based on filtered data
  const dynamicThresholds = useMemo(() => {
    const ftfrVals = filteredTechnicians.map((t) => t._filteredFTFR).sort((a, b) => a - b);
    const timeVals = filteredTechnicians.map((t) => t._filteredAvgTime).sort((a, b) => a - b);
    const jobsVals = filteredTechnicians.map((t) => t._filteredJobsPerWeek).sort((a, b) => a - b);
    const scoreVals = filteredTechnicians.map((t) => t._filteredScore).sort((a, b) => a - b);
    const len = ftfrVals.length;
    if (len === 0) return globalThresholds;

    return {
      ftfr: { top10: ftfrVals[Math.floor(len * 0.9)] || 0, bottom10: ftfrVals[Math.floor(len * 0.1)] || 0 },
      avgTime: { top10: timeVals[Math.floor(len * 0.1)] || 0, bottom10: timeVals[Math.floor(len * 0.9)] || 0 },
      jobsPerWeek: { top10: jobsVals[Math.floor(len * 0.9)] || 0, bottom10: jobsVals[Math.floor(len * 0.1)] || 0 },
      performanceScore: { top10: scoreVals[Math.floor(len * 0.9)] || 0, bottom10: scoreVals[Math.floor(len * 0.1)] || 0 },
    };
  }, [filteredTechnicians, globalThresholds]);

  const handleSort = useCallback((key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  }, []);

  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSelectTechnician = useCallback((tech) => {
    setSelectedTechnician(tech);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedTechnician(null);
  }, []);

  // Max values for radar normalization
  const teamMaxValues = useMemo(() => {
    if (filteredTechnicians.length === 0) return { avgTime: 1, jobsPerWeek: 1, totalJobs: 1 };
    return {
      avgTime: Math.max(...filteredTechnicians.map((t) => t._filteredAvgTime), 1),
      jobsPerWeek: Math.max(...filteredTechnicians.map((t) => t._filteredJobsPerWeek), 1),
      totalJobs: Math.max(...filteredTechnicians.map((t) => t._filteredTotalJobs), 1),
    };
  }, [filteredTechnicians]);

  // Get jobs for selected technician
  const selectedTechJobs = useMemo(() => {
    if (!selectedTechnician) return [];
    return filteredJobs.filter((j) => j.technicianId === selectedTechnician.networkId);
  }, [selectedTechnician, filteredJobs]);

  // ── Loading / Error states ──
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          <p className="mt-4 text-lg text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="text-red-500 text-5xl mb-4">!</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            Make sure the Python backend is running on port 5000.
          </p>
          <button
            className="mt-4 px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Filters
          filters={filters}
          filterOptions={filterOptions}
          dateRange={apiDateRange}
          onFilterChange={handleFilterChange}
        />
        <StatsCards
          technicians={filteredTechnicians}
          totalJobs={filteredJobs.length}
        />
        <PerformanceCharts
          technicians={filteredTechnicians}
          allTechnicians={technicians}
          allJobs={allJobs}
          selectedRegion={filters.region}
          filters={filters}
        />
        <TechnicianTable
          technicians={sortedTechnicians}
          thresholds={dynamicThresholds}
          sortConfig={sortConfig}
          onSort={handleSort}
          onSelect={handleSelectTechnician}
        />
      </main>

      {selectedTechnician && (
        <TechnicianDetail
          technician={selectedTechnician}
          jobs={selectedTechJobs}
          thresholds={dynamicThresholds}
          teamMaxValues={teamMaxValues}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  );
};

export default App;
