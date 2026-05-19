import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { 
  Upload, Download, Plus, Trash2, Settings2, 
  Play, RefreshCw 
} from 'lucide-react';

export default function DataGrid({ 
  data, 
  setData, 
  headers, 
  setHeaders, 
  variableMapping, 
  setVariableMapping, 
  selectedMethod,
  onRunAnalysis 
}) {
  const [editingCell, setEditingCell] = useState(null);
  const [editingHeader, setEditingHeader] = useState(null);
  const fileInputRef = useRef(null);

  // File Upload Handling (CSV / TXT)
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length > 0) {
          const parsedHeaders = Object.keys(results.data[0]);
          const parsedData = results.data.map(row => 
            parsedHeaders.map(h => row[h] === undefined ? null : row[h])
          );
          setHeaders(parsedHeaders);
          setData(parsedData);
          
          // Reset variable mapping to empty
          setVariableMapping({ x: '', y: '', w: '', group: '', pre: '', post: '' });
        }
      }
    });
  };

  // Export Grid to CSV
  const handleExportCSV = () => {
    const csvRows = data.map(row => {
      const rowObj = {};
      headers.forEach((h, i) => {
        rowObj[h] = row[i];
      });
      return rowObj;
    });

    const csvString = Papa.unparse({
      fields: headers,
      data: csvRows
    });

    const blob = new Blob(["\ufeff" + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'ai_stats_data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Add / Remove Rows and Columns
  const addRow = () => {
    setData(prev => [...prev, Array(headers.length).fill(null)]);
  };

  const removeRow = (index) => {
    if (data.length <= 1) return;
    setData(prev => prev.filter((_, i) => i !== index));
  };

  const addColumn = () => {
    const newColName = `Var${headers.length + 1}`;
    setHeaders(prev => [...prev, newColName]);
    setData(prev => prev.map(row => [...row, null]));
  };

  const removeColumn = (index) => {
    if (headers.length <= 1) return;
    const colName = headers[index];
    setHeaders(prev => prev.filter((_, i) => i !== index));
    setData(prev => prev.map(row => row.filter((_, i) => i !== index)));
    
    // Clear variable mappings if the deleted column was mapped
    setVariableMapping(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(key => {
        if (updated[key] === colName) updated[key] = '';
      });
      return updated;
    });
  };

  // Double-Click Cell Edit Handlers
  const handleCellBlur = (rowIndex, colIndex, val) => {
    const trimmed = val.trim();
    const finalVal = (trimmed === '' || isNaN(trimmed)) ? (trimmed || null) : parseFloat(trimmed);
    setData(prev => {
      const newData = prev.map(r => [...r]);
      newData[rowIndex][colIndex] = finalVal;
      return newData;
    });
    setEditingCell(null);
  };

  const handleHeaderBlur = (colIndex, val) => {
    const oldName = headers[colIndex];
    let newName = val.trim();
    if (!newName) newName = `Var${colIndex + 1}`;
    
    // Update headers
    setHeaders(prev => {
      const next = [...prev];
      next[colIndex] = newName;
      return next;
    });

    // Update variable mappings
    setVariableMapping(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(key => {
        if (updated[key] === oldName) updated[key] = newName;
      });
      return updated;
    });
    setEditingHeader(null);
  };

  // Reset grid back to default blank structure
  const resetGrid = () => {
    setHeaders(['X', 'Y', 'Group']);
    setData([
      [10, 20, 1],
      [12, 22, 1],
      [15, 25, 2],
      [18, 30, 2],
      [14, 28, 2]
    ]);
    setVariableMapping({ x: 'X', y: 'Y', w: '', group: 'Group', pre: '', post: '' });
  };

  // Variable selector renderer based on selected method
  const renderVariableSelector = () => {
    const selectClass = "w-full mt-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-accentViolet text-slate-100 text-sm outline-none transition-colors";

    return (
      <div className="space-y-4">
        {/* Independent Samples t-test / ANOVA */}
        {(selectedMethod === 'ind-t' || selectedMethod === 'oneway-anova') && (
          <>
            <div>
              <label className="text-xs font-bold text-slate-400 block">分組自變項 (類別 IV)</label>
              <select
                value={variableMapping.group || ''}
                onChange={(e) => setVariableMapping(prev => ({ ...prev, group: e.target.value }))}
                className={selectClass}
              >
                <option value="">-- 選擇欄位 --</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 block">分析結果依變項 (連續 DV)</label>
              <select
                value={variableMapping.y || ''}
                onChange={(e) => setVariableMapping(prev => ({ ...prev, y: e.target.value }))}
                className={selectClass}
              >
                <option value="">-- 選擇欄位 --</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </>
        )}

        {/* Paired Samples t-test */}
        {selectedMethod === 'dep-t' && (
          <>
            <div>
              <label className="text-xs font-bold text-slate-400 block">前測數值 (Pre-test)</label>
              <select
                value={variableMapping.pre || ''}
                onChange={(e) => setVariableMapping(prev => ({ ...prev, pre: e.target.value }))}
                className={selectClass}
              >
                <option value="">-- 選擇欄位 --</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 block">後測數值 (Post-test)</label>
              <select
                value={variableMapping.post || ''}
                onChange={(e) => setVariableMapping(prev => ({ ...prev, post: e.target.value }))}
                className={selectClass}
              >
                <option value="">-- 選擇欄位 --</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </>
        )}

        {/* Correlation */}
        {selectedMethod === 'correlation' && (
          <>
            <div>
              <label className="text-xs font-bold text-slate-400 block">變項 1 (連續型 X)</label>
              <select
                value={variableMapping.x || ''}
                onChange={(e) => setVariableMapping(prev => ({ ...prev, x: e.target.value }))}
                className={selectClass}
              >
                <option value="">-- 選擇欄位 --</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 block">變項 2 (連續型 Y)</label>
              <select
                value={variableMapping.y || ''}
                onChange={(e) => setVariableMapping(prev => ({ ...prev, y: e.target.value }))}
                className={selectClass}
              >
                <option value="">-- 選擇欄位 --</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </>
        )}

        {/* Regression */}
        {selectedMethod === 'regression' && (
          <>
            <div>
              <label className="text-xs font-bold text-slate-400 block">自變項 (X)</label>
              <select
                value={variableMapping.x || ''}
                onChange={(e) => setVariableMapping(prev => ({ ...prev, x: e.target.value }))}
                className={selectClass}
              >
                <option value="">-- 選擇欄位 --</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 block">依變項 (Y)</label>
              <select
                value={variableMapping.y || ''}
                onChange={(e) => setVariableMapping(prev => ({ ...prev, y: e.target.value }))}
                className={selectClass}
              >
                <option value="">-- 選擇欄位 --</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </>
        )}

        {/* Moderation / Mediation */}
        {(selectedMethod === 'moderation' || selectedMethod === 'mediation') && (
          <>
            <div>
              <label className="text-xs font-bold text-slate-400 block">自變項 (X)</label>
              <select
                value={variableMapping.x || ''}
                onChange={(e) => setVariableMapping(prev => ({ ...prev, x: e.target.value }))}
                className={selectClass}
              >
                <option value="">-- 選擇欄位 --</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 block">
                {selectedMethod === 'moderation' ? '調節變項 (W)' : '中介變項 (M)'}
              </label>
              <select
                value={variableMapping.w || ''}
                onChange={(e) => setVariableMapping(prev => ({ ...prev, w: e.target.value }))}
                className={selectClass}
              >
                <option value="">-- 選擇欄位 --</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 block">依變項 (Y)</label>
              <select
                value={variableMapping.y || ''}
                onChange={(e) => setVariableMapping(prev => ({ ...prev, y: e.target.value }))}
                className={selectClass}
              >
                <option value="">-- 選擇欄位 --</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </>
        )}

        {/* Chi-Square Test */}
        {selectedMethod === 'chisquare' && (
          <>
            <div>
              <label className="text-xs font-bold text-slate-400 block">類別變項 A (欄位 X)</label>
              <select
                value={variableMapping.x || ''}
                onChange={(e) => setVariableMapping(prev => ({ ...prev, x: e.target.value }))}
                className={selectClass}
              >
                <option value="">-- 選擇欄位 --</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 block">類別變項 B (欄位 Y)</label>
              <select
                value={variableMapping.y || ''}
                onChange={(e) => setVariableMapping(prev => ({ ...prev, y: e.target.value }))}
                className={selectClass}
              >
                <option value="">-- 選擇欄位 --</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </>
        )}

        {/* Reliability Analysis Checklist */}
        {selectedMethod === 'reliability' && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 block mb-1">選擇信度分析題目欄位 (可多選)：</label>
            <div className="max-h-48 overflow-y-auto space-y-2 bg-slate-900 border border-slate-800 rounded-xl p-3">
              {headers.map(h => {
                const checked = (variableMapping.reliabilityItems || []).includes(h);
                return (
                  <label key={h} className="flex items-center space-x-2 text-xs font-semibold text-slate-300 cursor-pointer hover:text-white">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const nextItems = e.target.checked
                          ? [...(variableMapping.reliabilityItems || []), h]
                          : (variableMapping.reliabilityItems || []).filter(item => item !== h);
                        setVariableMapping(prev => ({ ...prev, reliabilityItems: nextItems }));
                      }}
                      className="rounded border-slate-800 text-accentViolet focus:ring-accentViolet bg-slate-950"
                    />
                    <span>{h}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Advanced Repeated Measures ANOVA mappings */}
        {['mixed-anova', 'oneway-dep-anova', 'multi-dep-anova'].includes(selectedMethod) && (
          <>
            {['mixed-anova', 'multi-dep-anova'].includes(selectedMethod) && (
              <div>
                <label className="text-xs font-bold text-slate-400 block">組間自變項 (Between IV)</label>
                <select
                  value={variableMapping.group || ''}
                  onChange={(e) => setVariableMapping(prev => ({ ...prev, group: e.target.value }))}
                  className={selectClass}
                >
                  <option value="">-- 選擇欄位 --</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="text-xs font-bold text-slate-400 block">時間點 1 (如 Pre-test)</label>
              <select
                value={variableMapping.pre || ''}
                onChange={(e) => setVariableMapping(prev => ({ ...prev, pre: e.target.value }))}
                className={selectClass}
              >
                <option value="">-- 選擇欄位 --</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 block">時間點 2 (如 Post-test)</label>
              <select
                value={variableMapping.post || ''}
                onChange={(e) => setVariableMapping(prev => ({ ...prev, post: e.target.value }))}
                className={selectClass}
              >
                <option value="">-- 選擇欄位 --</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </>
        )}

        {/* Advanced R-only non-repeated methods (EFA, SEM, Logistic) */}
        {['efa', 'sem', 'logistic', 'multi-ind-anova'].includes(selectedMethod) && (
          <>
            {selectedMethod === 'efa' ? (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 block mb-1">選擇 EFA 分析題目欄位 (可多選)：</label>
                <div className="max-h-48 overflow-y-auto space-y-2 bg-slate-900 border border-slate-800 rounded-xl p-3">
                  {headers.map(h => {
                    const checked = (variableMapping.reliabilityItems || []).includes(h);
                    return (
                      <label key={h} className="flex items-center space-x-2 text-xs font-semibold text-slate-300 cursor-pointer hover:text-white">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const nextItems = e.target.checked
                              ? [...(variableMapping.reliabilityItems || []), h]
                              : (variableMapping.reliabilityItems || []).filter(item => item !== h);
                            setVariableMapping(prev => ({ ...prev, reliabilityItems: nextItems }));
                          }}
                          className="rounded border-slate-800 text-accentViolet focus:ring-accentViolet bg-slate-950"
                        />
                        <span>{h}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-xs font-bold text-slate-400 block">自變項/預測項 (X)</label>
                  <select
                    value={variableMapping.x || ''}
                    onChange={(e) => setVariableMapping(prev => ({ ...prev, x: e.target.value }))}
                    className={selectClass}
                  >
                    <option value="">-- 選擇欄位 --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                {selectedMethod !== 'logistic' && (
                  <div>
                    <label className="text-xs font-bold text-slate-400 block">第二變項 (W)</label>
                    <select
                      value={variableMapping.w || ''}
                      onChange={(e) => setVariableMapping(prev => ({ ...prev, w: e.target.value }))}
                      className={selectClass}
                    >
                      <option value="">-- 選擇欄位 --</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="text-xs font-bold text-slate-400 block">依變項/結果項 (Y)</label>
                  <select
                    value={variableMapping.y || ''}
                    onChange={(e) => setVariableMapping(prev => ({ ...prev, y: e.target.value }))}
                    className={selectClass}
                  >
                    <option value="">-- 選擇欄位 --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </>
            )}
          </>
        )}
      </div>
    );
  };

  const getMethodBadge = () => {
    switch(selectedMethod) {
      case 'ind-t': return '獨立樣本 t 檢定';
      case 'dep-t': return '相依樣本 t 檢定';
      case 'correlation': return 'Pearson 相關分析';
      case 'regression': return '複迴歸分析';
      case 'mediation': return '中介效果分析';
      case 'moderation': return '調節效果 / 交互作用分析';
      case 'chisquare': return '卡方獨立性檢定';
      case 'reliability': return '問卷信度分析 (Cronbach\'s Alpha)';
      case 'oneway-anova': return '單因子獨立樣本 ANOVA';
      case 'oneway-dep-anova': return '單因子相依樣本 ANOVA [R]';
      case 'multi-ind-anova': return '多因子獨立樣本 ANOVA [R]';
      case 'multi-dep-anova': return '多因子相依樣本 ANOVA [R]';
      case 'mixed-anova': return '多因子混合設計 ANOVA [R]';
      case 'logistic': return '邏吉斯迴歸分析 [R]';
      case 'efa': return '探索性因素分析 EFA [R]';
      case 'sem': return '結構方程模型 SEM / CFA [R]';
      default: return '未指定 / 其他進階分析';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 my-6">
      
      {/* 1. Left Panel: Control / Mapping Box */}
      <div className="lg:col-span-1 glass-card p-6 flex flex-col justify-between space-y-6">
        <div>
          <div className="flex items-center space-x-2 text-accentEmerald mb-3">
            <Settings2 size={18} />
            <h3 className="font-bold text-sm text-slate-200">變項映射設定</h3>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 mb-4">
            <span className="text-[10px] uppercase font-bold text-accentViolet tracking-widest block">當前分析模式</span>
            <span className="text-sm font-extrabold text-white block mt-0.5">{getMethodBadge()}</span>
          </div>

          {renderVariableSelector()}
        </div>

        <div className="space-y-3 pt-6 border-t border-slate-800">
          <button
            onClick={onRunAnalysis}
            className="w-full btn-primary flex items-center justify-center space-x-2 shadow-accentViolet/10 py-3"
          >
            <Play size={16} />
            <span>開始統計分析</span>
          </button>
          
          <button
            onClick={resetGrid}
            className="w-full btn-secondary flex items-center justify-center space-x-2 py-2"
          >
            <RefreshCw size={14} />
            <span>回復範例數值</span>
          </button>
        </div>
      </div>

      {/* 2. Right Panel: Spreadsheet Editor */}
      <div className="lg:col-span-3 flex flex-col space-y-4">
        
        {/* Editor Actions bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/40 p-4 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
          
          {/* File Upload / Import */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => fileInputRef.current.click()}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer"
            >
              <Upload size={14} />
              <span>匯入 CSV / TXT 檔案</span>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".csv,.txt" 
              className="hidden" 
            />
            <span className="text-[10px] text-slate-500 italic max-w-[150px] truncate">
              支援拖曳或上傳 CSV/TXT 檔案
            </span>
          </div>

          {/* Grid manipulations */}
          <div className="flex items-center space-x-2">
            <button
              onClick={addColumn}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-2 rounded-xl text-xs font-semibold flex items-center justify-center transition-all cursor-pointer"
              title="新增變項 (列)"
            >
              <Plus size={16} />
            </button>
            <button
              onClick={addRow}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <Plus size={14} />
              <span>新增樣本 (列)</span>
            </button>
            
            <button
              onClick={handleExportCSV}
              className="bg-accentEmerald/10 hover:bg-accentEmerald/20 border border-accentEmerald/30 text-accentEmerald px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer"
            >
              <Download size={14} />
              <span>下載為 CSV 檔</span>
            </button>
          </div>

        </div>

        {/* DataGrid Spreadsheet Container */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto max-h-[480px]">
            <table className="w-full text-center border-collapse">
              
              {/* Header Row */}
              <thead>
                <tr className="bg-slate-900/80 border-b border-slate-800">
                  <th className="w-12 py-3 px-2 border-r border-slate-800 text-xs font-black text-slate-500 uppercase tracking-widest bg-slate-950/20">
                    ID
                  </th>
                  {headers.map((h, colIdx) => (
                    <th 
                      key={colIdx} 
                      className="min-w-[120px] py-3 px-2 border-r border-slate-800 text-sm font-bold text-slate-200 relative group"
                    >
                      {editingHeader === colIdx ? (
                        <input
                          autoFocus
                          type="text"
                          defaultValue={h}
                          onBlur={(e) => handleHeaderBlur(colIdx, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleHeaderBlur(colIdx, e.target.value);
                          }}
                          className="bg-slate-800 border border-accentViolet text-white px-2 py-0.5 rounded outline-none text-center text-sm w-full"
                        />
                      ) : (
                        <div className="flex items-center justify-center space-x-1">
                          <span 
                            onDoubleClick={() => setEditingHeader(colIdx)}
                            className="cursor-pointer hover:text-accentViolet transition-colors px-2 py-0.5 rounded border border-transparent hover:border-slate-800"
                            title="雙擊重新命名變項"
                          >
                            {h}
                          </span>
                          <button
                            onClick={() => removeColumn(colIdx)}
                            className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-0.5 rounded transition-opacity cursor-pointer ml-1"
                            title="刪除此變項"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </th>
                  ))}
                  <th className="w-12 bg-slate-950/20"></th>
                </tr>
              </thead>

              {/* Data Rows */}
              <tbody>
                {data.map((row, rowIdx) => (
                  <tr 
                    key={rowIdx} 
                    className="border-b border-slate-800/60 hover:bg-slate-800/20 transition-colors"
                  >
                    {/* Row Index */}
                    <td className="py-2.5 px-2 border-r border-slate-800 text-xs font-mono text-slate-600 bg-slate-900/10">
                      {rowIdx + 1}
                    </td>

                    {/* Dynamic Columns */}
                    {headers.map((h, colIdx) => {
                      const isEditing = editingCell?.row === rowIdx && editingCell?.col === colIdx;
                      return (
                        <td 
                          key={colIdx} 
                          className="py-2 px-1 border-r border-slate-800/60 text-sm font-medium text-slate-300 min-h-[36px]"
                        >
                          {isEditing ? (
                            <input
                              autoFocus
                              type="text"
                              defaultValue={row[colIdx] === null ? '' : row[colIdx]}
                              onBlur={(e) => handleCellBlur(rowIdx, colIdx, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCellBlur(rowIdx, colIdx, e.target.value);
                              }}
                              className="w-full bg-slate-800 text-center text-sm text-white px-1 py-0.5 rounded border border-accentViolet outline-none"
                            />
                          ) : (
                            <div 
                              onDoubleClick={() => setEditingCell({ row: rowIdx, col: colIdx })}
                              className="w-full h-full min-h-[24px] cursor-pointer hover:bg-slate-800/30 flex items-center justify-center rounded px-2"
                              title="雙擊修改數值"
                            >
                              {row[colIdx] === null ? <span className="text-slate-700 italic">.</span> : row[colIdx]}
                            </div>
                          )}
                        </td>
                      );
                    })}

                    {/* Delete Row button */}
                    <td className="py-2 px-2 text-center">
                      <button
                        onClick={() => removeRow(rowIdx)}
                        className="text-slate-600 hover:text-red-400 p-1 rounded transition-colors cursor-pointer"
                        title="刪除此行"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>

            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
