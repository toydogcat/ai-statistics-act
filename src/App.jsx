import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import MethodWizard from './components/MethodWizard';
import DataGrid from './components/DataGrid';
import SimpleAnalysis from './components/SimpleAnalysis';
import ReportTemplate from './components/ReportTemplate';
import PsychometricsSuite from './components/PsychometricsSuite';
import DiagnosticSuite from './components/DiagnosticSuite';

import { 
  calculateIndependentT, 
  calculateDependentT, 
  calculateCorrelation, 
  calculateOneWayANOVA, 
  calculateMultipleRegression, 
  calculateModeration,
  calculateChiSquare,
  calculateMediation,
  calculateReliability
} from './utils/statsEngine';

import { generateRScript } from './utils/rCodeGenerator';

import { 
  Sparkles, HelpCircle, Layers, ArrowDown, BookOpen, Brain, ChevronRight
} from 'lucide-react';

export default function App() {
  const [activePage, setActivePage] = useState('home');
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const audioRef = useRef(null);

  const handleImportFromDiagnostic = (csvHeaders, csvRows, targetMethod, targetMapping) => {
    setHeaders(csvHeaders);
    setData(csvRows);
    setSelectedMethod(targetMethod);
    setVariableMapping(targetMapping);
    setActivePage('editor');
    setTimeout(() => {
      handleRunAnalysis();
    }, 200);
  };

  useEffect(() => {
    audioRef.current = new Audio('./Degrees_of_Clarity.mp3');
    audioRef.current.loop = true;
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const toggleMusic = () => {
    if (!audioRef.current) return;
    if (isMusicPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => {
        console.error("Failed to play background music:", err);
      });
    }
    setIsMusicPlaying(!isMusicPlaying);
  };

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
    post: '',
    reliabilityItems: ['X', 'Y']
  });

  const [selectedMethod, setSelectedMethod] = useState('ind-t');
  const [results, setResults] = useState(null);

  // When a method is selected via the wizard
  const handleSelectMethodFromWizard = (methodId) => {
    setSelectedMethod(methodId);
    setResults(null); // Clear previous results
    
    // Auto map values based on selected method
    if (methodId === 'ind-t' || methodId === 'oneway-anova') {
      setVariableMapping({ x: '', y: 'Y', w: '', group: 'Group', pre: '', post: '', reliabilityItems: ['X', 'Y'] });
    } else if (methodId === 'dep-t') {
      setVariableMapping({ x: '', y: '', w: '', group: '', pre: 'X', post: 'Y', reliabilityItems: ['X', 'Y'] });
    } else if (methodId === 'correlation' || methodId === 'regression') {
      setVariableMapping({ x: 'X', y: 'Y', w: '', group: '', pre: '', post: '', reliabilityItems: ['X', 'Y'] });
    } else if (methodId === 'moderation' || methodId === 'mediation') {
      setVariableMapping({ x: 'X', y: 'Y', w: 'Group', group: '', pre: '', post: '', reliabilityItems: ['X', 'Y'] });
    } else if (methodId === 'chisquare') {
      setVariableMapping({ x: 'Group', y: 'Y', w: '', group: '', pre: '', post: '', reliabilityItems: ['X', 'Y'] });
    } else if (methodId === 'reliability') {
      setVariableMapping({ x: '', y: '', w: '', group: '', pre: '', post: '', reliabilityItems: ['X', 'Y'] });
    } else {
      // For R templates, initialize generic mappings so nothing fails
      setVariableMapping({ x: 'X', y: 'Y', w: 'Group', group: 'Group', pre: 'X', post: 'Y', reliabilityItems: ['X', 'Y'] });
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
    const isClientJSMethod = ['ind-t', 'dep-t', 'correlation', 'oneway-anova', 'regression', 'moderation', 'mediation', 'chisquare', 'reliability'].includes(selectedMethod);

    if (isClientJSMethod) {
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
            return val.length;
          }
          return val;
        });

        res = calculateModeration(xCol, cleanW, yCol, variableMapping.x, variableMapping.w);
      }

      else if (selectedMethod === 'mediation') {
        const xCol = getColData(variableMapping.x);
        const mCol = getColData(variableMapping.w); // mediator mapped to w
        const yCol = getColData(variableMapping.y);
        if (!variableMapping.x || !variableMapping.w || !variableMapping.y) {
          alert("請設定自變項、中介變項與依變項！");
          return;
        }
        res = calculateMediation(xCol, mCol, yCol);
      }

      else if (selectedMethod === 'chisquare') {
        const xCol = getColData(variableMapping.x);
        const yCol = getColData(variableMapping.y);
        if (!variableMapping.x || !variableMapping.y) {
          alert("請設定兩個要交叉分析的類別型欄位變項！");
          return;
        }
        res = calculateChiSquare(xCol, yCol);
      }

      else if (selectedMethod === 'reliability') {
        const items = variableMapping.reliabilityItems || [];
        if (items.length < 2) {
          alert("請至少選擇兩個欄位進行問卷信度分析！");
          return;
        }
        const columnsData = items.map(h => getColData(h));
        res = calculateReliability(columnsData);
      }
    } else {
      // Advanced R method generator
      const rScript = generateRScript(selectedMethod, variableMapping, headers);
      res = {
        isRTemplate: true,
        method: selectedMethod,
        rScript
      };
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
      <Navbar activePage={activePage} setActivePage={setActivePage} isMusicPlaying={isMusicPlaying} toggleMusic={toggleMusic} />

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
                線上智慧統計分析平台
              </h2>
              <p className="text-base text-slate-400 leading-relaxed font-medium">
                結合《給論文寫作者的統計指南》方法論。無須繁雜的軟體操作與艱深代碼，只需三步：上傳數據、選定變項，一鍵獲得精美的 <strong>APA 統計表</strong>與<strong>標準論述報告</strong>。
              </p>
            </div>

            {/* 心理計量學三大模型特別入口卡片 */}
            <div className="max-w-4xl mx-auto bg-gradient-to-r from-indigo-950/70 via-slate-900/60 to-purple-950/70 border border-purple-500/30 hover:border-purple-400/50 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden group transition-all duration-300">
              <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-purple-500/20 transition-all"></div>
              
              <div className="flex items-center space-x-4">
                <div className="bg-purple-500/10 text-purple-400 p-4 rounded-2xl border border-purple-500/25 group-hover:scale-105 transition-transform duration-300">
                  <Brain size={28} className="animate-pulse text-purple-400" />
                </div>
                <div className="space-y-1.5">
                  <span className="text-5xs font-black text-purple-400 uppercase tracking-widest block">心理計量考題分析特別入口</span>
                  <h3 className="text-base font-extrabold text-white group-hover:text-purple-300 transition-colors">
                    大考三大測驗理論分析線上版 (CTT / IRT / CDM)
                  </h3>
                  <p className="text-4xs text-slate-400 leading-relaxed font-medium max-w-2xl">
                    專為學術研究與大考測驗分析打造。結合古典測驗理論 (CTT) KR-20 二元信度、項目反應理論 (IRT) 雙參數 2PL 項目反應特徵曲線 (ICC) 與認知診斷模型 (CDM) DINA 精熟檢索，一鍵產出 A4 APA 印表級大考分析報告。
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setActivePage('psychometrics');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex items-center space-x-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-900/40 cursor-pointer active:scale-95 transition-all flex-shrink-0"
              >
                <span>進入測驗分析特區</span>
                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
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
                  <span>給論文寫作者的統計指南 (基礎篇)</span>
                </a>
                <span className="text-slate-700">|</span>
                <a href="#/book2" className="hover:text-accentEmerald transition-colors flex items-center space-x-1">
                  <BookOpen size={14} />
                  <span>給論文寫作者的進階統計指南 (進階篇)</span>
                </a>
              </div>
            </div>

          </div>
        ) : activePage === 'psychometrics' ? (
          /* PSYCHOMETRICS SUITE: Special psychometrics portal */
          <PsychometricsSuite />
        ) : activePage === 'diagnostic' ? (
          /* DIAGNOSTIC SUITE: Smart advisor portal */
          <DiagnosticSuite onImportAndAnalyze={handleImportFromDiagnostic} />
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
                  <option value="correlation">Pearson 相關分析 (Unit 5)</option>
                  <option value="regression">複迴歸分析 (Unit 6 & 8)</option>
                  <option value="mediation">中介效果分析 (Unit 7)</option>
                  <option value="moderation">調節效果 / 交互作用分析 (Unit 9-12)</option>
                  <option value="chisquare">卡方獨立性檢定 (Unit 13)</option>
                  <option value="reliability">問卷信度分析 (Cronbach's Alpha)</option>
                  <option value="oneway-anova">單因子獨立樣本 ANOVA (Unit 16)</option>
                  <option value="oneway-dep-anova">單因子相依樣本 ANOVA (Unit 17) [R]</option>
                  <option value="multi-ind-anova">多因子獨立樣本 ANOVA (Unit 18, 21) [R]</option>
                  <option value="multi-dep-anova">多因子相依樣本 ANOVA (Unit 19, 22) [R]</option>
                  <option value="mixed-anova">多因子混合設計 ANOVA (Unit 20, 23, 24) [R]</option>
                  <option value="logistic">邏吉斯迴歸分析 (Unit 29) [R]</option>
                  <option value="efa">探索性因素分析 EFA (Unit 14, 15) [R]</option>
                  <option value="sem">結構方程模型 SEM / CFA (Unit 35-39) [R]</option>
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
                    <span>{results.isRTemplate ? "R 語言學術分析腳本已生成 (R-Code Generated)" : "數據運算完成 (100% Client-Side Engine)"}</span>
                  </div>
                  <h3 className="text-3xl font-extrabold text-white tracking-tight">
                    {results.isRTemplate ? "進階統計學術 R 語言語法" : "統計分析結果報告"}
                  </h3>
                </div>

                {results.isRTemplate ? (
                  <div className="bg-slate-900/60 rounded-3xl p-6 md:p-8 border border-slate-800/80 backdrop-blur-xl shadow-2xl space-y-6">
                    <div className="flex items-start space-x-3 bg-accentViolet/10 border border-accentViolet/20 rounded-2xl p-4">
                      <Sparkles className="text-accentViolet mt-0.5 flex-shrink-0" size={18} />
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-slate-100">
                          進階多變量統計 R 語法客製化生成
                        </h4>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          此分析方法屬於進階多變量統計學術模型。我們已根據您在上方 <b>SPSS 數據網格</b>中實際配置的欄位對應（例如自變項、依變項等），動態生成了以下 R 語言學術腳本。您只需複製該腳本至 RStudio 或直接在本地 R 環境執行，即可獲得完整的學術統計檢定與變異數分析。
                        </p>
                      </div>
                    </div>

                    <div className="relative rounded-2xl border border-slate-800 overflow-hidden bg-slate-950 font-mono text-xs">
                      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-slate-400 font-sans font-medium">
                        <span>r_analysis_script.R</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(results.rScript);
                            alert("R 語言語法已複製至剪貼簿！");
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-all text-2xs cursor-pointer"
                        >
                          複製 R 代碼
                        </button>
                      </div>
                      <pre className="p-4 overflow-x-auto text-slate-300 select-all leading-relaxed whitespace-pre max-h-96">
                        {results.rScript}
                      </pre>
                    </div>

                    <div className="p-4 bg-slate-950/40 rounded-2xl border border-slate-800/50 space-y-3">
                      <h5 className="text-xs font-bold text-slate-200 flex items-center space-x-1">
                        <BookOpen size={13} className="text-accentViolet" />
                        <span>學術報告指南與詮釋</span>
                      </h5>
                      <ul className="text-2xs text-slate-400 space-y-1.5 list-disc list-inside leading-relaxed">
                        <li><b>數據格式轉換：</b> 重複測量或相依樣本分析通常需要寬格式與長格式（Long-format）的轉換，腳本中已自動包含以 <code className="text-accentViolet">reshape()</code> 進行受試者識別與格式整理的語法。</li>
                        <li><b>變異數同質性與球形檢定：</b> 執行 <code className="text-accentViolet">ezANOVA()</code> 後，請特別注意輸出報告中的 <code className="text-accentViolet">Mauchly\'s Test</code>。若 <code className="text-slate-300">p &lt; .05</code> 代表違反球形假設，需採用 <code className="text-slate-300">Greenhouse-Geisser (GG)</code> 校正後的結果。</li>
                        <li><b>交互作用詮釋：</b> 當二因子交互作用顯著時，直接詮釋主效果是不精確的，必須進一步執行「單純主效果檢定」（Simple Main Effects），本腳本已為您自動寫好分層分析的 R 語法。</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            )}

          </div>
        )}

      </main>

      {/* 3. Footer */}
      <footer className="py-8 bg-slate-950 border-t border-slate-900 text-center text-slate-500 text-xs font-semibold">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col items-center md:items-start gap-1">
            <span>© 2026 ai-statistics-act. 智慧統計線上實踐版. All Rights Reserved.</span>
            <span className="text-slate-600 hover:text-slate-400 transition-colors text-[10px]">
              Designed with Premium Glassmorphism UI
            </span>
          </div>
          
          {/* Vercount 訪客流量統計器 */}
          <div className="flex items-center gap-5 text-[10px] font-mono text-slate-500 tracking-wider bg-slate-900/40 border border-slate-800/60 rounded-xl px-4 py-2 shadow-inner">
            <span id="busuanzi_container_site_pv" className="flex items-center gap-2">
              <span className="text-cyan-500/70 text-xs">👁️</span> 
              <span className="uppercase text-slate-400 font-bold">總瀏覽量:</span>
              <span id="busuanzi_value_site_pv" className="text-cyan-400 font-extrabold">...</span>
            </span>
            <span className="w-px h-3 bg-slate-800" />
            <span id="busuanzi_container_site_uv" className="flex items-center gap-2">
              <span className="text-pink-500/70 text-xs">👤</span> 
              <span className="uppercase text-slate-400 font-bold">訪客數:</span>
              <span id="busuanzi_value_site_uv" className="text-pink-400 font-extrabold">...</span>
            </span>
          </div>
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
