import React, { useState } from 'react';
import Navbar from './components/Navbar';
import MethodWizard from './components/MethodWizard';
import DataGrid from './components/DataGrid';
import SimpleAnalysis from './components/SimpleAnalysis';
import ReportTemplate from './components/ReportTemplate';

import { 
  calculateIndependentT, 
  calculateDependentT, 
  calculateCorrelation, 
  calculateOneWayANOVA, 
  calculateMultipleRegression, 
  calculateModeration 
} from './utils/statsEngine';

import { 
  Sparkles, HelpCircle, Layers, ArrowDown, BookOpen 
} from 'lucide-react';

export default function App() {
  const [activePage, setActivePage] = useState('home');
  const [headers, setHeaders] = useState(['X', 'Y', 'Group']);
  
  // Initial dummy dataset for immediate usage and WOW effect
  const [data, setData] = useState([
    [10.2, 22.4, '實驗組'],
    [11.5, 23.8, '實驗組'],
    [12.1, 26.1, '實驗組'],
    [14.3, 29.5, '實驗組'],
    [13.8, 28.2, '實驗組'],
    [8.4,  16.2, '對照組'],
    [9.1,  18.5, '對照組'],
    [9.5,  17.9, '對照組'],
    [10.6, 21.0, '對照組'],
    [10.0, 19.8, '對照組']
  ]);

  const [variableMapping, setVariableMapping] = useState({
    x: 'X',
    y: 'Y',
    w: '',
    group: 'Group',
    pre: '',
    post: ''
  });

  const [selectedMethod, setSelectedMethod] = useState('ind-t');
  const [results, setResults] = useState(null);

  // When a method is selected via the wizard
  const handleSelectMethodFromWizard = (methodId) => {
    setSelectedMethod(methodId);
    setResults(null); // Clear previous results
    
    // Auto map values based on selected method
    if (methodId === 'ind-t' || methodId === 'oneway-anova') {
      setVariableMapping({ x: '', y: 'Y', w: '', group: 'Group', pre: '', post: '' });
    } else if (methodId === 'dep-t') {
      setVariableMapping({ x: '', y: '', w: '', group: '', pre: 'X', post: 'Y' });
    } else if (methodId === 'correlation' || methodId === 'regression') {
      setVariableMapping({ x: 'X', y: 'Y', w: '', group: '', pre: '', post: '' });
    } else if (methodId === 'moderation') {
      // Find another col or add one
      setVariableMapping({ x: 'X', y: 'Y', w: 'Group', group: '', pre: '', post: '' });
    }
    
    setActivePage('editor');
  };

  // Run the statistical calculations in the engine
  const handleRunAnalysis = () => {
    // Extract column array from spreadsheet data
    const getColData = (headerName) => {
      const colIdx = headers.indexOf(headerName);
      if (colIdx === -1) return [];
      return data.map(row => row[colIdx]);
    };

    let res = null;

    if (selectedMethod === 'ind-t') {
      const groupCol = getColData(variableMapping.group);
      const yCol = getColData(variableMapping.y);
      if (!variableMapping.group || !variableMapping.y) {
        alert("請確認是否已正確設定分組變項及依變項欄位！");
        return;
      }

      // Filter non-null, listwise
      const uniqueGroups = [...new Set(groupCol.filter(v => v !== null && v !== undefined && v !== ''))];
      if (uniqueGroups.length < 2) {
        alert("獨立樣本 t 檢定的分組變項必須包含至少兩個不同的組別（如：實驗組 vs 對照組）！");
        return;
      }
      const group1 = [];
      const group2 = [];
      for (let i = 0; i < groupCol.length; i++) {
        if (groupCol[i] === uniqueGroups[0]) group1.push(yCol[i]);
        if (groupCol[i] === uniqueGroups[1]) group2.push(yCol[i]);
      }
      res = calculateIndependentT(group1, group2);
    } 
    
    else if (selectedMethod === 'dep-t') {
      const preCol = getColData(variableMapping.pre);
      const postCol = getColData(variableMapping.post);
      if (!variableMapping.pre || !variableMapping.post) {
        alert("請設定前後測對應之欄位變項！");
        return;
      }
      res = calculateDependentT(preCol, postCol);
    } 
    
    else if (selectedMethod === 'correlation') {
      const xCol = getColData(variableMapping.x);
      const yCol = getColData(variableMapping.y);
      if (!variableMapping.x || !variableMapping.y) {
        alert("請設定兩個要進行相關性分析的欄位變項！");
        return;
      }
      res = calculateCorrelation(xCol, yCol);
    } 
    
    else if (selectedMethod === 'oneway-anova') {
      const groupCol = getColData(variableMapping.group);
      const yCol = getColData(variableMapping.y);
      if (!variableMapping.group || !variableMapping.y) {
        alert("請設定分組類別與依變項！");
        return;
      }

      const groupsData = {};
      for (let i = 0; i < groupCol.length; i++) {
        const g = groupCol[i];
        if (g === null || g === undefined || g === '') continue;
        if (!groupsData[g]) groupsData[g] = [];
        groupsData[g].push(yCol[i]);
      }
      res = calculateOneWayANOVA(groupsData);
    } 
    
    else if (selectedMethod === 'regression') {
      const xCol = getColData(variableMapping.x);
      const yCol = getColData(variableMapping.y);
      if (!variableMapping.x || !variableMapping.y) {
        alert("請設定自變項與依變項！");
        return;
      }
      res = calculateMultipleRegression([xCol], yCol, [variableMapping.x]);
    } 
    
    else if (selectedMethod === 'moderation') {
      const xCol = getColData(variableMapping.x);
      const wCol = getColData(variableMapping.w);
      const yCol = getColData(variableMapping.y);
      if (!variableMapping.x || !variableMapping.w || !variableMapping.y) {
        alert("請設定自變項、調節變項與依變項！");
        return;
      }

      // Convert Moderator group to numeric if it's text, or center it directly
      const cleanW = wCol.map(val => {
        if (typeof val === 'string') {
          // simple hash or length fallback
          return val.length;
        }
        return val;
      });

      res = calculateModeration(xCol, cleanW, yCol, variableMapping.x, variableMapping.w);
    }

    if (res) {
      setResults(res);
      // Smooth scroll to the results section below
      setTimeout(() => {
        const target = document.getElementById('analysis-results-section');
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } else {
      alert("計算失敗！請檢查數值格式是否正確，並確認無過多空值。");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-darkBg text-slate-100">
      
      {/* 1. Navbar */}
      <Navbar activePage={activePage} setActivePage={setActivePage} />

      {/* Ambient gradient backgrounds */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accentViolet/5 rounded-full blur-3xl pointer-events-none bg-pulse-violet"></div>

      {/* 2. Main Content Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-8">
        
        {activePage === 'home' ? (
          /* HOME PAGE: Wizard + Guidance */
          <div className="space-y-12">
            
            {/* Header Hero Section */}
            <div className="text-center max-w-3xl mx-auto space-y-4 py-8 relative">
              <div className="inline-flex bg-gradient-to-r from-accentViolet/20 to-indigo-500/20 px-4 py-1.5 rounded-full text-xs font-bold text-accentViolet border border-accentViolet/30 items-center space-x-1.5 mb-2 shadow-lg">
                <Sparkles size={12} className="animate-spin-slow" />
                <span>專為論文寫作者打造的智慧統計助理</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white leading-none">
                傻瓜統計線上分析平台
              </h2>
              <p className="text-base text-slate-400 leading-relaxed font-medium">
                結合《給論文寫作者的統計指南》方法論。無須繁雜的軟體操作與艱深代碼，只需三步：上傳數據、選定變項，一鍵獲得精美的 <strong>APA 統計表</strong>與<strong>標準論述報告</strong>。
              </p>
            </div>

            {/* Decision Tree Question wizard */}
            <div>
              <MethodWizard onSelectMethod={handleSelectMethodFromWizard} />
            </div>

            {/* Reference info links */}
            <div className="max-w-2xl mx-auto border-t border-slate-800/80 pt-10 text-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">學術指引核心參考</span>
              <div className="inline-flex items-center space-x-6 text-sm font-semibold text-slate-400">
                <a href="#/book1" className="hover:text-accentViolet transition-colors flex items-center space-x-1">
                  <BookOpen size={14} />
                  <span>傻瓜跑統計 I (基礎篇)</span>
                </a>
                <span className="text-slate-700">|</span>
                <a href="#/book2" className="hover:text-accentEmerald transition-colors flex items-center space-x-1">
                  <BookOpen size={14} />
                  <span>傻瓜跑統計 II (進階 R/SPSS 篇)</span>
                </a>
              </div>
            </div>

          </div>
        ) : (
          /* EDITOR PAGE: Spreadsheet editor + Variable assignment + Results */
          <div className="space-y-8 animate-fade-in">
            
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-800/80 pb-6">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">SPSS 智慧數據編輯器</h2>
                <p className="text-xs text-slate-400 mt-1 font-medium">
                  可雙擊表格內任何儲存格進行即時修改，或點選上方匯入您自備的 CSV 數據。
                </p>
              </div>

              {/* Quick toggle list */}
              <div className="mt-4 md:mt-0 flex items-center space-x-2">
                <label className="text-xs font-bold text-slate-400">當前統計方法：</label>
                <select
                  value={selectedMethod}
                  onChange={(e) => {
                    setSelectedMethod(e.target.value);
                    setResults(null);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs font-semibold outline-none focus:border-accentViolet transition-colors"
                >
                  <option value="ind-t">獨立樣本 t 檢定 (Unit 3)</option>
                  <option value="dep-t">相依樣本 t 檢定 (Unit 4)</option>
                  <option value="correlation">Pearson 相關 (Unit 5)</option>
                  <option value="oneway-anova">單因子 ANOVA (Unit 16)</option>
                  <option value="regression">複迴歸分析 (Unit 6)</option>
                  <option value="moderation">調節效果分析 (Unit 9)</option>
                </select>
              </div>
            </div>

            {/* Data Grid Component */}
            <DataGrid 
              data={data}
              setData={setData}
              headers={headers}
              setHeaders={setHeaders}
              variableMapping={variableMapping}
              setVariableMapping={setVariableMapping}
              selectedMethod={selectedMethod}
              onRunAnalysis={handleRunAnalysis}
            />

            {/* Results Rendering Anchor */}
            {results && (
              <div id="analysis-results-section" className="space-y-8 pt-8 border-t border-slate-800/80 scroll-mt-20">
                <div className="text-center space-y-2">
                  <div className="inline-flex bg-accentEmerald/15 text-accentEmerald px-3 py-1 rounded-full text-xs font-bold border border-accentEmerald/30 items-center space-x-1 animate-pulse">
                    <CheckCircle2 size={12} />
                    <span>數據運算完成 (100% Client-Side Engine)</span>
                  </div>
                  <h3 className="text-3xl font-extrabold text-white tracking-tight">統計分析結果報告</h3>
                </div>

                {/* Descriptive Statistics Card */}
                <SimpleAnalysis 
                  method={selectedMethod}
                  results={results}
                  data={data}
                  headers={headers}
                  variableMapping={variableMapping}
                />

                {/* APA Standard Text Report Generator */}
                <ReportTemplate 
                  method={selectedMethod}
                  results={results}
                  variableMapping={variableMapping}
                />
              </div>
            )}

          </div>
        )}

      </main>

      {/* 3. Footer */}
      <footer className="py-8 bg-slate-950 border-t border-slate-900 text-center text-slate-500 text-xs font-semibold">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>© 2026 ai-statistics-act. 傻瓜跑統計線上實踐版. All Rights Reserved.</span>
          <span className="text-slate-600 hover:text-slate-400 transition-colors">
            Designed with Premium Glassmorphism UI
          </span>
        </div>
      </footer>

    </div>
  );
}

// Simple dynamic icons/badges
function CheckCircle2({ size = 16, className = "" }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
