import { useState } from 'react';
import Papa from 'papaparse';
import { 
  Upload, Sparkles, Info, FileText, 
  CheckCircle2, Settings, FileSearch, 
  ArrowRight, Activity, Database
} from 'lucide-react';

export default function DiagnosticSuite({ onImportAndAnalyze }) {
  // CSV Data States
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvRows, setCsvRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Column configuration states
  const [columnRoles, setColumnRoles] = useState({}); // { colName: 'x' | 'y' | 'm' | 'ignore' }
  const [columnTypes, setColumnTypes] = useState({}); // { colName: 'continuous' | 'categorical' }

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      processFile(file);
    } else {
      alert('請上傳副檔名為 .csv 的數據檔案！');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      processFile(file);
    }
  };

  // Parse CSV file content
  const processFile = (file) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      Papa.parse(text, {
        header: false,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data.length < 2) {
            alert('CSV 數據太少，必須至少包含標頭列與一列以上的數據列！');
            return;
          }
          const rawHeaders = results.data[0].map(h => String(h || '').trim());
          const rawRows = results.data.slice(1);
          initializeData(rawHeaders, rawRows);
        },
        error: (err) => {
          alert('解析 CSV 檔案失敗：' + err.message);
        }
      });
    };
    reader.readAsText(file, 'UTF-8');
  };

  // Initialize data and run smart auto-detection of column types
  const initializeData = (headers, rows) => {
    setCsvHeaders(headers);
    setCsvRows(rows);

    const initialRoles = {};
    const initialTypes = {};

    headers.forEach((header, idx) => {
      // Analyze unique values in this column for type auto-detection
      const colValues = rows.map(r => r[idx]).filter(v => v !== null && v !== undefined && v !== '');
      const uniqueValues = [...new Set(colValues)];
      const allNumbers = colValues.every(v => typeof v === 'number');

      // Smart auto-detection rules
      let detectedType = 'continuous';
      if (!allNumbers || uniqueValues.length <= 5) {
        detectedType = 'categorical';
      }
      initialTypes[header] = detectedType;

      // Smart role initial mapping rules
      const lowerHeader = header.toLowerCase();
      if (idx === headers.length - 1 || lowerHeader.includes('score') || lowerHeader.includes('分數') || lowerHeader.includes('y')) {
        initialRoles[header] = 'y'; // Last column or named "score" default to Y
        if (uniqueValues.length <= 5 && !allNumbers) {
          initialTypes[header] = 'categorical';
        } else {
          initialTypes[header] = 'continuous';
        }
      } else if (lowerHeader.includes('group') || lowerHeader.includes('組別') || lowerHeader.includes('gender') || lowerHeader.includes('性別') || lowerHeader.includes('x')) {
        initialRoles[header] = 'x';
        initialTypes[header] = 'categorical';
      } else if (lowerHeader.includes('id') || lowerHeader.includes('編號') || lowerHeader.includes('姓名')) {
        initialRoles[header] = 'ignore';
      } else {
        initialRoles[header] = idx < headers.length - 1 ? 'x' : 'ignore';
      }
    });

    setColumnRoles(initialRoles);
    setColumnTypes(initialTypes);
  };

  // Load standard academic mock dataset
  const loadMockDataset = (type) => {
    let headers = [];
    let rows = [];
    let name = '';

    if (type === 'academic') {
      name = '大學生學習壓力與學術表現研究.csv';
      headers = ['學生編號', '性別', '學習壓力級別', '統計學前測', '統計學後測', '學習動機分數', '期末考試成績'];
      rows = [
        ['S001', '男', '高壓力', 45, 78, 65, 82],
        ['S002', '女', '中壓力', 52, 85, 72, 88],
        ['S003', '女', '低壓力', 60, 92, 88, 95],
        ['S004', '男', '高壓力', 41, 70, 58, 75],
        ['S005', '男', '中壓力', 48, 80, 69, 81],
        ['S006', '女', '高壓力', 38, 72, 54, 73],
        ['S007', '女', '低壓力', 58, 89, 82, 91],
        ['S008', '男', '低壓力', 62, 94, 90, 96],
        ['S009', '男', '中壓力', 50, 82, 70, 84],
        ['S010', '女', '中壓力', 51, 84, 75, 86]
      ];
    } else if (type === 'satisfaction') {
      name = '線上教學滿意度調查數據.csv';
      headers = ['填答者編號', '教學平台', '滿意度評分', '使用頻率', '學習成效滿意', '推薦意願'];
      rows = [
        ['R01', 'Zoom', 4.5, '每天使用', '滿意', '非常推薦'],
        ['R02', 'Teams', 3.8, '每週數次', '普通', '推薦'],
        ['R03', 'Meet', 4.2, '每天使用', '滿意', '非常推薦'],
        ['R04', 'Zoom', 4.8, '每天使用', '非常滿意', '非常推薦'],
        ['R05', 'Teams', 3.2, '偶爾使用', '不滿意', '普通'],
        ['R06', 'Meet', 3.9, '每週數次', '普通', '推薦'],
        ['R07', 'Zoom', 4.1, '每週數次', '滿意', '推薦'],
        ['R08', 'Teams', 3.5, '偶爾使用', '普通', '普通'],
        ['R09', 'Meet', 4.6, '每天使用', '非常滿意', '非常推薦'],
        ['R10', 'Zoom', 4.3, '每週數次', '滿意', '推薦']
      ];
    }

    setFileName(name);
    initializeData(headers, rows);
  };

  // Toggle role of a column
  const toggleColumnRole = (header, role) => {
    setColumnRoles(prev => ({
      ...prev,
      [header]: role
    }));
  };

  // Toggle type of a column
  const toggleColumnType = (header, type) => {
    setColumnTypes(prev => ({
      ...prev,
      [header]: type
    }));
  };

  // Smart heuristic recommendation engine
  const getRecommendations = () => {
    if (csvHeaders.length === 0) return [];

    // Extract categories
    const xCols = csvHeaders.filter(h => columnRoles[h] === 'x');
    const yCols = csvHeaders.filter(h => columnRoles[h] === 'y');
    const mCols = csvHeaders.filter(h => columnRoles[h] === 'm');

    const numX = xCols.length;
    const numY = yCols.length;
    const numM = mCols.length;

    const xCategorical = xCols.filter(h => columnTypes[h] === 'categorical');
    const xContinuous = xCols.filter(h => columnTypes[h] === 'continuous');

    const yCategorical = yCols.filter(h => columnTypes[h] === 'categorical');
    const yContinuous = yCols.filter(h => columnTypes[h] === 'continuous');

    const suggestions = [];

    // 1. Independent Samples t-test
    (() => {
      let score = 0;
      let reason = '需要設定一個類別型自變項 X（包含 2 個組別）與一個連續型依變項 Y。';
      
      if (numX === 1 && numY === 1) {
        if (columnTypes[xCols[0]] === 'categorical' && columnTypes[yCols[0]] === 'continuous') {
          const idx = csvHeaders.indexOf(xCols[0]);
          const uniqueVals = [...new Set(csvRows.map(r => r[idx]).filter(v => v !== null && v !== ''))];
          if (uniqueVals.length === 2) {
            score = 100;
            reason = `自變項「${xCols[0]}」為類別變項且包含 ${uniqueVals.length} 個組別（即：${uniqueVals.join('、')}），依變項「${yCols[0]}」為連續變項，完美契合！`;
          } else {
            score = 80;
            reason = `自變項「${xCols[0]}」為類別變項但包含 ${uniqueVals.length} 個組別（t 檢定適用於 2 組；如為 3 組以上建議改用單因子 ANOVA）。`;
          }
        }
      } else if (numX > 1 && numY === 1 && xCategorical.length === 1 && yContinuous.length === 1) {
        score = 60;
        reason = `您選擇了多個自變項，但如果只探討其中的類別型自變項「${xCategorical[0]}」與連續型依變項「${yContinuous[0]}」之差異，可選用獨立樣本 t 檢定。`;
      }

      suggestions.push({
        id: 'ind-t',
        title: '獨立樣本 t 檢定 (Independent Samples t-test)',
        unit: 'Unit 3 基礎統計',
        score,
        reason,
        setup: {
          method: 'ind-t',
          mapping: {
            group: xCols[0] || '',
            y: yCols[0] || '',
            reliabilityItems: []
          }
        }
      });
    })();

    // 2. One-Way ANOVA
    (() => {
      let score = 0;
      let reason = '需要設定一個類別型自變項 X（包含 3 個或更多組別）與一個連續型依變項 Y。';

      if (numX === 1 && numY === 1) {
        if (columnTypes[xCols[0]] === 'categorical' && columnTypes[yCols[0]] === 'continuous') {
          const idx = csvHeaders.indexOf(xCols[0]);
          const uniqueVals = [...new Set(csvRows.map(r => r[idx]).filter(v => v !== null && v !== ''))];
          if (uniqueVals.length >= 3) {
            score = 100;
            reason = `自變項「${xCols[0]}」包含 ${uniqueVals.length} 個組別（即：${uniqueVals.slice(0, 3).join('、')}...），且依變項「${yCols[0]}」為連續數值，ANOVA 為標準多組比較方案，完美契合！`;
          } else if (uniqueVals.length === 2) {
            score = 85;
            reason = `自變項「${xCols[0]}」為類別變項，包含 2 個組別（即：${uniqueVals.join('、')}）。雖然 ANOVA 仍可執行，但此時與獨立樣本 t 檢定等價。`;
          }
        }
      } else if (numX > 1 && numY === 1 && xCategorical.length === 1 && yContinuous.length === 1) {
        score = 70;
        reason = `若您只針對類別型自變項「${xCategorical[0]}」對連續型依變項「${yContinuous[0]}」進行單重變異數分析，可選用單因子 ANOVA。`;
      }

      suggestions.push({
        id: 'oneway-anova',
        title: '單因子獨立樣本變異數分析 (One-way ANOVA)',
        unit: 'Unit 16 多組比較',
        score,
        reason,
        setup: {
          method: 'oneway-anova',
          mapping: {
            group: xCols[0] || '',
            y: yCols[0] || '',
            reliabilityItems: []
          }
        }
      });
    })();

    // 3. Dependent Samples t-test
    (() => {
      let score = 0;
      let reason = '需要比較同一個群體在兩個不同欄位（如前測 vs 後測）的數值差異。';

      if (numX === 0 && numY === 2) {
        if (columnTypes[yCols[0]] === 'continuous' && columnTypes[yCols[1]] === 'continuous') {
          score = 100;
          reason = `您設定了兩個連續型依變項：「${yCols[0]}」與「${yCols[1]}」，且無自變項。此配置完美契合配對/前後測的相依樣本 t 檢定！`;
        }
      } else if (numX === 0 && numY > 2 && yContinuous.length >= 2) {
        score = 80;
        reason = `您選取了 ${numY} 個連續依變項，可挑選其中的「${yContinuous[0]}」與「${yContinuous[1]}」進行成對前後測比較。`;
      } else if (numX === 1 && columnTypes[xCols[0]] === 'categorical' && numY === 2) {
        score = 65;
        reason = `您有 2 個連續欄位，如果這代表配對量度，可忽略自變項並直接使用相依樣本 t 檢定進行比較。`;
      }

      suggestions.push({
        id: 'dep-t',
        title: '相依樣本 t 檢定 (Dependent/Paired t-test)',
        unit: 'Unit 4 前後測對比',
        score,
        reason,
        setup: {
          method: 'dep-t',
          mapping: {
            pre: yCols[0] || '',
            post: yCols[1] || '',
            reliabilityItems: []
          }
        }
      });
    })();

    // 4. Pearson Correlation
    (() => {
      let score = 0;
      let reason = '需要設定一個連續型自變項 X 與一個連續型依變項 Y，以檢驗兩者線性相關。';

      if (numX === 1 && numY === 1) {
        if (columnTypes[xCols[0]] === 'continuous' && columnTypes[yCols[0]] === 'continuous') {
          score = 100;
          reason = `自變項「${xCols[0]}」與依變項「${yCols[0]}」皆為連續數值欄位，Pearson 相關分析可完美揭示其線性相關係數與顯著性！`;
        }
      } else if (numX >= 1 && numY >= 1 && xContinuous.length >= 1 && yContinuous.length >= 1) {
        score = 85;
        reason = `可分析連續自變項「${xContinuous[0]}」與連續依變項「${yContinuous[0]}」兩者間之相關係數。`;
      }

      suggestions.push({
        id: 'correlation',
        title: 'Pearson 相關分析 (Pearson Correlation)',
        unit: 'Unit 5 關聯性分析',
        score,
        reason,
        setup: {
          method: 'correlation',
          mapping: {
            x: xCols[0] || '',
            y: yCols[0] || '',
            reliabilityItems: []
          }
        }
      });
    })();

    // 5. Multiple Linear Regression
    (() => {
      let score = 0;
      let reason = '需要設定一個或多個自變項 X (以連續型為主) 與一個連續型依變項 Y。';

      if (numX >= 1 && numY === 1) {
        if (columnTypes[yCols[0]] === 'continuous') {
          if (xContinuous.length === numX) {
            score = 100;
            reason = `有 ${numX} 個連續自變項（即：${xCols.join('、')}）與 1 個連續依變項「${yCols[0]}」，是進行複迴歸分析分析預測力（R-square）的最佳配置！`;
          } else {
            score = 90;
            reason = `有 ${numX} 個自變項（其中包含類別變項，建議將類別變項虛擬化處理）與 1 個連續型依變項「${yCols[0]}」，適合執行複迴歸分析。`;
          }
        }
      } else if (numX >= 1 && numY > 1 && yContinuous.length >= 1) {
        score = 75;
        reason = `有多個自變項與多個依變項，如果只鎖定其中單一連續型依變項「${yContinuous[0]}」，可執行線性迴歸。`;
      }

      suggestions.push({
        id: 'regression',
        title: '複迴歸分析 (Multiple Linear Regression)',
        unit: 'Unit 6 & 8 預測力分析',
        score,
        reason,
        setup: {
          method: 'regression',
          mapping: {
            x: xCols[0] || '',
            y: yCols[0] || '',
            reliabilityItems: []
          }
        }
      });
    })();

    // 6. Mediation Analysis
    (() => {
      let score = 0;
      let reason = '探討自變項 X 如何透過中介變項 M 影響依變項 Y。請將一欄設為 X，一欄設為 Y，另一欄設為 M (中介變項) 且均應為連續變項。';

      if (numX === 1 && numY === 1 && numM === 1) {
        if (columnTypes[xCols[0]] === 'continuous' && columnTypes[yCols[0]] === 'continuous' && columnTypes[mCols[0]] === 'continuous') {
          score = 100;
          reason = `自變項「${xCols[0]}」、中介變項「${mCols[0]}」與依變項「${yCols[0]}」皆設定為連續數值，是中介路徑效果分析 (Sobel/Bootstrap) 的完美設定！`;
        } else {
          score = 85;
          reason = `具備自變項、中介變項與依變項，但請注意中介分析在變項皆為連續尺度時效果最為理想。`;
        }
      } else if (numX >= 2 && numY === 1 && numM === 0) {
        // Guessing if one X can act as mediator
        score = 50;
        reason = `如果您的自變項中包含潛在的中介因子（例如將「${xCols[1] || ''}」改設定為中介變項 M），即可啟動中介效果檢定。`;
      }

      suggestions.push({
        id: 'mediation',
        title: '中介效果分析 (Mediation Analysis)',
        unit: 'Unit 7 因果路徑',
        score,
        reason,
        setup: {
          method: 'mediation',
          mapping: {
            x: xCols[0] || '',
            y: yCols[0] || '',
            w: mCols[0] || '', // Maps M to parameter 'w'
            reliabilityItems: []
          }
        }
      });
    })();

    // 7. Moderation Analysis
    (() => {
      let score = 0;
      let reason = '探討調節變項 W 是否會影響自變項 X 對依變項 Y 的預測關係。請設定自變項 X、依變項 Y 與中介/調節變項 M/W。';

      if (numX === 1 && numY === 1 && numM === 1) {
        score = 95;
        reason = `自變項「${xCols[0]}」、調節變項「${mCols[0]}」與依變項「${yCols[0]}」皆已設定，調節效果分析可檢定兩者交互作用乘積項 (X * W) 是否顯著，完美契合！`;
      } else if (numX >= 2 && numY === 1 && numM === 0) {
        score = 60;
        reason = `有多個自變項。如果其中一個是調節因子（如將「${xCols[1] || ''}」改設為調節變項 M/W），即可執行交互作用與調節效果分析。`;
      }

      suggestions.push({
        id: 'moderation',
        title: '調節效果 / 交互作用分析 (Moderation Analysis)',
        unit: 'Unit 9-12 交互作用',
        score,
        reason,
        setup: {
          method: 'moderation',
          mapping: {
            x: xCols[0] || '',
            y: yCols[0] || '',
            w: mCols[0] || '', // Maps W to parameter 'w'
            reliabilityItems: []
          }
        }
      });
    })();

    // 8. Chi-Square Test of Independence
    (() => {
      let score = 0;
      let reason = '需要設定一個類別型自變項 X 與一個類別型依變項 Y，用以檢定兩類別屬性間之關聯性。';

      if (numX === 1 && numY === 1) {
        if (columnTypes[xCols[0]] === 'categorical' && columnTypes[yCols[0]] === 'categorical') {
          score = 100;
          reason = `自變項「${xCols[0]}」與依變項「${yCols[0]}」皆為類別型變項，卡方獨立性檢定（交叉表與機率比例分析）是唯一標準首選，完美契合！`;
        }
      } else if (numX >= 1 && numY >= 1 && xCategorical.length >= 1 && yCategorical.length >= 1) {
        score = 85;
        reason = `可針對類別型自變項「${xCategorical[0]}」與類別型依變項「${yCategorical[0]}」進行交叉表卡方顯著性檢定。`;
      }

      suggestions.push({
        id: 'chisquare',
        title: '卡方獨立性檢定 (Chi-Square Independence Test)',
        unit: 'Unit 13 交叉表與類別數據',
        score,
        reason,
        setup: {
          method: 'chisquare',
          mapping: {
            x: xCols[0] || '',
            y: yCols[0] || '',
            reliabilityItems: []
          }
        }
      });
    })();

    // 9. Cronbach's Alpha Reliability
    (() => {
      let score = 0;
      let reason = '評估多個連續變項在測量同一屬性時的內部一致性。請不設自變項，並選擇 2 個以上連續型變項作為 Y。';

      if (numX === 0 && numY >= 2) {
        if (yContinuous.length === numY) {
          score = 100;
          reason = `您選取了 ${numY} 個連續型依變項（即問卷的題目：${yCols.join('、')}）且無自變項，這正是評估問卷信度（Cronbach's Alpha）最標準的輸入模式，完美契合！`;
        } else {
          score = 85;
          reason = `您選取了 ${numY} 個依變項且無自變項，信度分析可用以計算這些欄位的一致性指標。`;
        }
      } else if (numX >= 2 && numY === 0) {
        score = 70;
        reason = `若您選取了多個自變項，只要將它們改設定為依變項 Y 且將 X 清空，即可進行問卷信度檢定。`;
      }

      suggestions.push({
        id: 'reliability',
        title: "問卷信度分析 (Cronbach's Alpha)",
        unit: 'Unit 14 問卷信度分析',
        score,
        reason,
        setup: {
          method: 'reliability',
          mapping: {
            reliabilityItems: yCols
          }
        }
      });
    })();

    // Sort suggestions: perfect match (100) first, then by score descending
    return suggestions.sort((a, b) => b.score - a.score);
  };

  const activeRecommendations = getRecommendations();

  // Execute the killer One-Click Import & Analyze feature
  const handleImportClick = (rec) => {
    if (csvRows.length === 0) return;

    // Convert CSV rows to the structure expected by App.jsx data grid:
    // data is an array of arrays representing rows, matching the order of headers
    const formattedData = csvRows.map(row => {
      return csvHeaders.map((header, idx) => {
        const val = row[idx];
        return val === undefined ? '' : val;
      });
    });

    // Invoke callback to pass CSV schema, dataset, selected stats method, and variable mapping to SPSS editor!
    onImportAndAnalyze(
      csvHeaders,
      formattedData,
      rec.setup.method,
      rec.setup.mapping
    );
  };

  return (
    <div className="space-y-8 animate-fade-in print:bg-white print:text-black">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-800/80 pb-6">
        <div className="space-y-1.5">
          <div className="inline-flex bg-gradient-to-r from-accentViolet/20 to-indigo-500/20 px-3 py-1 rounded-full text-xs font-bold text-accentViolet border border-accentViolet/30 items-center space-x-1">
            <Activity size={13} className="animate-pulse" />
            <span>智能決策分析模組 (Smart Advisor)</span>
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight">
            萬能統計診斷分析
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            直接上傳您自備的 CSV 數據或點載學術範本，設定自變項與依變項，AI 演算法即時檢索引導最符合該數據結構的學術檢定！
          </p>
        </div>

        {/* Quick select mock dataset buttons */}
        <div className="mt-4 md:mt-0 flex items-center space-x-2 flex-wrap gap-y-2">
          <span className="text-2xs font-bold text-slate-400 mr-1 flex items-center">
            <Database size={12} className="text-accentViolet mr-1" />
            無資料？載入學術範例：
          </span>
          <button
            onClick={() => loadMockDataset('academic')}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-xs font-semibold cursor-pointer active:scale-95 transition-all"
          >
            學習壓力與成績
          </button>
          <button
            onClick={() => loadMockDataset('satisfaction')}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-xs font-semibold cursor-pointer active:scale-95 transition-all"
          >
            教學滿意度調查
          </button>
        </div>
      </div>

      {/* Grid Container: Dropzone on left, dynamic recommendations on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Hand: Upload zone and Column Configurations (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Dropzone Card */}
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative rounded-3xl border-2 border-dashed p-6 text-center backdrop-blur-xl transition-all duration-300 ${
              isDragging 
                ? 'border-accentViolet bg-accentViolet/5 scale-[1.01] shadow-lg shadow-accentViolet/5' 
                : csvHeaders.length > 0
                  ? 'border-slate-800/80 bg-slate-900/30'
                  : 'border-slate-800/80 hover:border-slate-700/80 bg-slate-900/40 hover:bg-slate-900/50'
            }`}
          >
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              id="csv-file-picker"
              className="hidden"
            />
            
            <label htmlFor="csv-file-picker" className="cursor-pointer block space-y-4">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-accentViolet/10 to-indigo-500/10 border border-accentViolet/25 flex items-center justify-center text-accentViolet transform group-hover:scale-105 transition-all duration-300">
                <Upload size={22} className="animate-bounce" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-white">
                  {fileName ? `當前檔案：${fileName}` : '拖曳您的 CSV 檔案至此處'}
                </h4>
                <p className="text-3xs text-slate-400 font-medium leading-relaxed max-w-xs mx-auto">
                  {fileName 
                    ? `成功載入 ${csvHeaders.length} 個變項欄位，${csvRows.length} 筆樣本數據列。`
                    : '支援 UTF-8 編碼 CSV 格式，系統將在客戶端本地解析，數據絕對安全不外流。'
                  }
                </p>
              </div>
              
              {!fileName && (
                <span className="inline-block px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 text-xs font-bold hover:text-white hover:border-slate-700 transition-colors">
                  選擇 CSV 檔案
                </span>
              )}
            </label>
          </div>

          {/* Column Settings Dashboard */}
          {csvHeaders.length > 0 && (
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 backdrop-blur-xl shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                <div className="flex items-center space-x-2">
                  <Settings size={15} className="text-accentViolet" />
                  <h3 className="text-sm font-extrabold text-white">設定欄位變項角色與屬性</h3>
                </div>
                <span className="text-[10px] text-slate-400 font-semibold font-mono">變項總數: {csvHeaders.length}</span>
              </div>

              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {csvHeaders.map((header) => {
                  const role = columnRoles[header] || 'ignore';
                  const type = columnTypes[header] || 'continuous';

                  return (
                    <div 
                      key={header} 
                      className={`p-3.5 rounded-2xl border transition-all duration-200 ${
                        role === 'x' 
                          ? 'border-accentViolet/30 bg-accentViolet/5 shadow-inner' 
                          : role === 'y'
                            ? 'border-accentEmerald/30 bg-accentEmerald/5 shadow-inner'
                            : role === 'm'
                              ? 'border-indigo-500/30 bg-indigo-500/5 shadow-inner'
                              : 'border-slate-800 bg-slate-950/40 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4 mb-2.5">
                        <div className="flex items-center space-x-2 overflow-hidden">
                          <FileText size={13} className={role === 'x' ? 'text-accentViolet' : role === 'y' ? 'text-accentEmerald' : 'text-slate-400'} />
                          <span className="text-xs font-extrabold text-white tracking-tight truncate" title={header}>
                            {header}
                          </span>
                        </div>
                        
                        {/* Type Toggle Badge */}
                        <button
                          onClick={() => toggleColumnType(header, type === 'continuous' ? 'categorical' : 'continuous')}
                          className={`px-2 py-0.5 rounded text-[9px] font-black border uppercase tracking-wider cursor-pointer active:scale-95 transition-all ${
                            type === 'continuous'
                              ? 'bg-slate-900 text-indigo-400 border-indigo-500/30'
                              : 'bg-slate-900 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {type === 'continuous' ? '連續型 (Scale)' : '類別型 (Nominal)'}
                        </button>
                      </div>

                      {/* Role selection buttons group */}
                      <div className="grid grid-cols-4 gap-1.5">
                        <button
                          onClick={() => toggleColumnRole(header, 'x')}
                          className={`py-1 rounded-xl text-[10px] font-bold cursor-pointer transition-all ${
                            role === 'x'
                              ? 'bg-accentViolet text-white font-extrabold shadow-sm'
                              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                          }`}
                        >
                          設為 X
                        </button>
                        <button
                          onClick={() => toggleColumnRole(header, 'y')}
                          className={`py-1 rounded-xl text-[10px] font-bold cursor-pointer transition-all ${
                            role === 'y'
                              ? 'bg-accentEmerald text-white font-extrabold shadow-sm'
                              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                          }`}
                        >
                          設為 Y
                        </button>
                        <button
                          onClick={() => toggleColumnRole(header, 'm')}
                          className={`py-1 rounded-xl text-[10px] font-bold cursor-pointer transition-all ${
                            role === 'm'
                              ? 'bg-indigo-600 text-white font-extrabold shadow-sm'
                              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                          }`}
                        >
                          中介/調節
                        </button>
                        <button
                          onClick={() => toggleColumnRole(header, 'ignore')}
                          className={`py-1 rounded-xl text-[10px] font-bold cursor-pointer transition-all ${
                            role === 'ignore'
                              ? 'bg-slate-800 text-slate-200 font-extrabold'
                              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                          }`}
                        >
                          忽略
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Right Hand: Recommendation engine results sorted (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {csvHeaders.length === 0 ? (
            /* Upload Prompt view when empty */
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-8 md:p-12 text-center backdrop-blur-xl flex flex-col items-center justify-center space-y-4 h-full min-h-[350px]">
              <div className="p-4 rounded-full bg-gradient-to-tr from-accentViolet/5 to-indigo-500/5 border border-slate-800 flex items-center justify-center text-slate-500">
                <FileSearch size={32} className="animate-pulse" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-extrabold text-white">等待載入 CSV 數據進行診斷</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                  請先在左方區域上傳您要分析的統計表格（CSV）或直接點選上方的「載入學術範例」，系統將自動激活統計分析引擎！
                </p>
              </div>
            </div>
          ) : (
            /* Recommendations List view */
            <div className="space-y-5">
              
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                <div className="flex items-center space-x-2">
                  <Sparkles size={16} className="text-accentViolet" />
                  <h3 className="text-sm font-extrabold text-white">適合此資料的統計方法推薦</h3>
                </div>
                <span className="text-[10px] text-slate-400 font-semibold font-mono">共診斷 {activeRecommendations.length} 個分析模型</span>
              </div>

              {activeRecommendations.map((rec) => {
                const isPerfect = rec.score === 100;
                const isHigh = rec.score >= 80;

                return (
                  <div 
                    key={rec.id}
                    className={`bg-slate-900/60 border rounded-3xl p-5 md:p-6 backdrop-blur-xl shadow-xl transition-all duration-300 hover:scale-[1.005] ${
                      isPerfect 
                        ? 'border-accentEmerald/40 hover:border-accentEmerald/60' 
                        : isHigh 
                          ? 'border-accentViolet/30 hover:border-accentViolet/50' 
                          : 'border-slate-800/80 opacity-60 hover:opacity-90'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="space-y-2">
                        {/* Title and Badge */}
                        <div className="flex items-center space-x-2.5 flex-wrap gap-y-1.5">
                          <span className={`text-[9px] px-2 py-0.5 rounded font-black border uppercase tracking-wider ${
                            isPerfect
                              ? 'bg-accentEmerald/15 text-accentEmerald border-accentEmerald/30'
                              : isHigh
                                ? 'bg-accentViolet/15 text-accentViolet border-accentViolet/30'
                                : 'bg-slate-900 text-slate-500 border-slate-800'
                          }`}>
                            {rec.unit}
                          </span>

                          <span className={`text-[9px] px-2 py-0.5 rounded font-black border uppercase tracking-wider ${
                            isPerfect
                              ? 'bg-accentEmerald/20 text-accentEmerald border-accentEmerald/40 shadow-inner'
                              : isHigh
                                ? 'bg-accentViolet/20 text-accentViolet border-accentViolet/40'
                                : 'bg-slate-950/80 text-slate-500 border-slate-900'
                          }`}>
                            推薦度: {rec.score}% {isPerfect ? '完美契合' : isHigh ? '高度適合' : rec.score > 0 ? '可用方案' : '條件未符'}
                          </span>
                        </div>

                        <h4 className="text-base font-extrabold text-white tracking-tight">
                          {rec.title}
                        </h4>
                      </div>

                      {/* Import action button (Only enabled if score > 0) */}
                      {rec.score > 0 && (
                        <button
                          onClick={() => handleImportClick(rec)}
                          className="flex items-center justify-center space-x-1.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-accentViolet to-indigo-600 hover:from-accentViolet/90 hover:to-indigo-600/90 text-white text-xs font-bold shadow-md shadow-accentViolet/10 cursor-pointer active:scale-95 transition-all self-start sm:self-center"
                        >
                          <span>一鍵導入並分析</span>
                          <ArrowRight size={13} className="animate-pulse" />
                        </button>
                      )}
                    </div>

                    {/* Reasoning description card */}
                    <div className="mt-4 p-3.5 rounded-2xl bg-slate-950/50 border border-slate-850/80 flex items-start space-x-2.5">
                      {isPerfect ? (
                        <CheckCircle2 size={15} className="text-accentEmerald mt-0.5 flex-shrink-0" />
                      ) : (
                        <Info size={15} className="text-slate-400 mt-0.5 flex-shrink-0" />
                      )}
                      <p className="text-3xs text-slate-300 font-medium leading-relaxed">
                        {rec.reason}
                      </p>
                    </div>

                    {/* Visual SPSS Layout schema mapping */}
                    {rec.score > 0 && (
                      <div className="mt-3.5 flex items-center space-x-2 flex-wrap gap-y-1.5 text-[10px] text-slate-400 font-semibold px-1">
                        <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mr-1">變項對應：</span>
                        {Object.entries(rec.setup.mapping).map(([key, val]) => {
                          if (!val) return null;
                          const formattedKey = key === 'group' ? '分組組別' : key === 'y' ? '依變項' : key === 'pre' ? '前測' : key === 'post' ? '後測' : key === 'w' ? '中介/調節' : key === 'x' ? '自變項' : '分析欄位';
                          return (
                            <span key={key} className="inline-flex items-center bg-slate-950 border border-slate-800 rounded-lg px-2 py-0.5 mr-1.5">
                              <span className="text-[9px] text-slate-500 font-bold mr-1">{formattedKey}:</span>
                              <span className="text-slate-200 text-[9px] font-extrabold">{Array.isArray(val) ? `${val.length} 個項目` : val}</span>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
