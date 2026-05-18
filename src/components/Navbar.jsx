import React from 'react';
import { BarChart3, HelpCircle, FileSpreadsheet, Sparkles } from 'lucide-react';

export default function Navbar({ activePage, setActivePage }) {
  return (
    <nav className="sticky top-0 z-50 w-full px-6 py-4 backdrop-blur-md bg-darkBg/60 border-b border-slate-800/80 transition-all duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Logo and Brand */}
        <div 
          className="flex items-center space-x-3 cursor-pointer group"
          onClick={() => setActivePage('home')}
        >
          <div className="bg-gradient-to-tr from-accentViolet to-indigo-500 p-2 rounded-xl text-white shadow-lg shadow-accentViolet/20 group-hover:scale-105 transition-transform duration-200">
            <BarChart3 size={22} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400 m-0 leading-none">
              ai-statistics-act
            </h1>
            <span className="text-xs font-semibold text-accentEmerald tracking-wider uppercase block mt-0.5">
              線上智慧統計分析平台
            </span>
          </div>
        </div>

        {/* Navigation Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActivePage('home')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activePage === 'home'
                ? 'bg-accentViolet/15 text-accentViolet border border-accentViolet/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            <Sparkles size={16} />
            <span>統計決策樹</span>
          </button>

          <button
            onClick={() => setActivePage('editor')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activePage === 'editor'
                ? 'bg-accentViolet/15 text-accentViolet border border-accentViolet/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            <FileSpreadsheet size={16} />
            <span>SPSS 數據網格</span>
          </button>
        </div>

      </div>
    </nav>
  );
}
