import React from 'react';
import { BarChart3, FileSpreadsheet, Sparkles, Brain, Activity } from 'lucide-react';

export default function Navbar({ activePage, setActivePage, isMusicPlaying, toggleMusic }) {
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
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
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
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
              activePage === 'editor'
                ? 'bg-accentViolet/15 text-accentViolet border border-accentViolet/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            <FileSpreadsheet size={16} />
            <span>SPSS 數據網格</span>
          </button>

          <button
            onClick={() => setActivePage('psychometrics')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
              activePage === 'psychometrics'
                ? 'bg-gradient-to-r from-accentViolet/25 to-indigo-500/25 text-white border border-accentViolet/45 shadow-inner'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            <Brain size={16} className="text-accentViolet" />
            <span>心理計量特區</span>
          </button>

          <button
            onClick={() => setActivePage('diagnostic')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
              activePage === 'diagnostic'
                ? 'bg-gradient-to-r from-accentViolet/25 to-indigo-500/25 text-white border border-accentViolet/45 shadow-inner'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            <Activity size={16} className="text-accentViolet animate-[pulse_2s_infinite]" />
            <span>萬能診斷分析</span>
          </button>

          <span className="w-px h-6 bg-slate-800 mx-2 hidden sm:block"></span>

          {/* Background Music Toggle Button */}
          <button
            onClick={toggleMusic}
            title="背景音樂：Degrees of Clarity (預設關閉，點擊開啟/關閉)"
            className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer group border ${
              isMusicPlaying
                ? 'bg-accentEmerald/15 text-accentEmerald border-accentEmerald/35 shadow-inner shadow-accentEmerald/5'
                : 'bg-slate-900/40 text-slate-400 hover:text-slate-200 border-slate-800/80 hover:bg-slate-800/50'
            }`}
          >
            {isMusicPlaying ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-accentEmerald">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500 group-hover:text-slate-300">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <line x1="23" y1="9" x2="17" y2="15"></line>
                <line x1="17" y1="9" x2="23" y2="15"></line>
              </svg>
            )}
            
            <span className="hidden md:inline font-bold text-xs select-none">
              {isMusicPlaying ? '音樂：開啟' : '音樂：關閉'}
            </span>

            {/* Equalizer animation bars */}
            <div className="flex items-end justify-center space-x-0.5 h-3 w-3 overflow-hidden pb-0.5">
              <span className={`w-0.5 bg-current rounded-full ${isMusicPlaying ? 'animate-[musicBar_1.2s_ease-in-out_infinite]' : 'h-1'}`}></span>
              <span className={`w-0.5 bg-current rounded-full ${isMusicPlaying ? 'animate-[musicBar_0.8s_ease-in-out_infinite_0.2s]' : 'h-2'}`}></span>
              <span className={`w-0.5 bg-current rounded-full ${isMusicPlaying ? 'animate-[musicBar_1.0s_ease-in-out_infinite_0.4s]' : 'h-1.5'}`}></span>
            </div>
          </button>
        </div>

      </div>
    </nav>
  );
}
