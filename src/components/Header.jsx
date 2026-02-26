import { Activity } from 'lucide-react';

const Header = () => {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 bg-brand-600 rounded-lg">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 leading-tight">
                Performance Visibility Dashboard
              </h1>
              <p className="text-xs text-gray-500 leading-tight">
                Phase 1A — Technician Rankings & Insights
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="hidden sm:inline">Field Service Management</span>
            <span className="hidden sm:inline text-gray-300">|</span>
            <span className="font-medium text-gray-700">Zinier</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
