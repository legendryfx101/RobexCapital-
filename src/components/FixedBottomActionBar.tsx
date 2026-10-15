import React from 'react';
import { Upload, Download, BookOpen, ShieldAlert } from 'lucide-react';

export type ActivePage = 'analyzer' | 'journal' | 'admin';

interface FixedBottomActionBarProps {
  activePage: ActivePage;
  onPageChange: (page: ActivePage) => void;
  onExportPDFClick: () => void;
  isAdmin: boolean;
}

export const FixedBottomActionBar: React.FC<FixedBottomActionBarProps> = ({
  activePage,
  onPageChange,
  onExportPDFClick,
  isAdmin,
}) => {
  const NavButton = ({ page, icon: Icon, label }: { page: ActivePage; icon: any; label: string }) => {
    if (page === 'admin' && !isAdmin) return null;
    return (
      <button
        type="button"
        onClick={() => onPageChange(page)}
        className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer border ${
          activePage === page
            ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-black border-amber-400 font-bold shadow-lg shadow-amber-500/20'
            : 'bg-zinc-900 hover:bg-zinc-800 text-gray-300 hover:text-white border-gray-800'
        }`}
      >
        <Icon className="w-3.5 h-3.5" />
        <span>{label}</span>
      </button>
    );
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-t border-gray-800/80 shadow-2xl px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
        {/* Left Action Group (Page Navigation Tabs) */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <NavButton page="analyzer" icon={Upload} label="Chart Analyzer" />
          <NavButton page="journal" icon={BookOpen} label="Personal Trades" />
          <NavButton page="admin" icon={ShieldAlert} label="Admin" />
        </div>

        {/* Right Action Group (PDF Export Section) */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onExportPDFClick}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-amber-400 hover:text-amber-300 border border-amber-500/30 rounded-lg transition-colors cursor-pointer shadow-sm"
            title="Export Signal / Report as PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};

