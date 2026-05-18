import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import { 
  Sparkles, Award, FileSpreadsheet, Upload, Download, 
  Settings, CheckCircle2, ChevronRight, HelpCircle, 
  Printer, Brain, BarChart3, AlertCircle, Trash2, Plus,
  BookOpen, Play, Info, FileText, GraduationCap
} from 'lucide-react';
import { calculateCTT, calculateIRT2PL, calculateCDM } from '../utils/psychometricsEngine';

export default function PsychometricsSuite() {
  // 1. 預設 115 學測數學 A 模擬作答數據 (10位學生 x 5道題目)
  const [responseMatrix, setResponseMatrix] = useState([
    [1, 1, 1, 1, 1], // S1: 5分
    [1, 1, 1, 1, 0], // S2: 4分
    [1, 1, 0, 0, 0], // S3: 2分
    [0, 1, 1, 1, 1], // S4: 4分
    [1, 0, 1, 0, 0], // S5: 2分
    [1, 0, 0, 0, 0], // S6: 1分
    [1, 1, 1, 1, 0], // S7: 4分
    [0, 0, 1, 0, 0], // S8: 1分
    [0, 0, 0, 0, 0], // S9: 0分
    [1, 1, 0, 1, 1]  // S10: 4分
  ]);

  // 試題清單
  const [itemNames, setItemNames] = useState(['Q1', 'Q5', 'Q7', 'Q18', 'Q20']);
  
  // 試題詳細說明文字
  const [itemDescriptions, setItemDescriptions] = useState({
    'Q1': '代數：二元一次聯立方程組',
    'Q5': '幾何：空間直角坐標系',
    'Q7': '矩陣：二階矩陣運算與反矩陣',
    'Q18': '機率：條件機率與統計',
    'Q20': '微積分：函數極限與導數'
  });

  // 2. 認知屬性名稱設定
  const [attributeNames, setAttributeNames] = useState([
    '代數運算 (Algebra)',
    '幾何分析 (Geometry)',
    '機率統計 (Probability)',
    '矩陣向量 (Matrix)'
  ]);

  // 3. 預設 Q 矩陣 (5題 x 4屬性)
  // Q1->A2, Q5->A4, Q7->A1, Q18->A3+A4, Q20->A3
  // 配合文章對應：
  // Q1: [0, 1, 0, 0], Q5: [0, 0, 0, 1], Q7: [1, 0, 0, 0], Q18: [0, 0, 1, 1], Q20: [0, 0, 1, 0]
  const [qMatrix, setQMatrix] = useState([
    [0, 1, 0, 0], // Q1
    [0, 0, 0, 1], // Q5
    [1, 0, 0, 0], // Q7
    [0, 0, 1, 1], // Q18
    [0, 0, 1, 0]  // Q20
  ]);

  // 4. 分析結果狀態
  const [cttResults, setCttResults] = useState(null);
  const [irtResults, setIrtResults] = useState(null);
  const [cdmResults, setCdmResults] = useState(null);

  // 當前選取之展示狀態
  const [subPage, setSubPage] = useState('explanation');
  const [activeTab, setActiveTab] = useState('ctt');
  const [selectedIccItem, setSelectedIccItem] = useState('Q1');
  const [selectedStudentIdx, setSelectedStudentIdx] = useState(4); // 預設 S5 (模擬文章)

  const iccCanvasRef = useRef(null);
  const cdmRadarCanvasRef = useRef(null);

  // 執行三大心理計量模型分析
  const handleRunAnalysis = () => {
    // 執行古典測驗理論 (CTT)
    const ctt = calculateCTT(responseMatrix, itemNames);
    setCttResults(ctt);

    // 項目反應理論 (IRT 2PL)
    const irt = calculateIRT2PL(responseMatrix, itemNames);
    setIrtResults(irt);

    // 認知診斷模型 (CDM DINA)
    const cdm = calculateCDM(responseMatrix, itemNames, qMatrix, attributeNames);
    setCdmResults(cdm);
  };

  // 初始化自動執行一次
  useEffect(() => {
    handleRunAnalysis();
  }, [responseMatrix, qMatrix, itemNames, attributeNames]);

  // 繪製項目特徵曲線 (ICC Curve)
  useEffect(() => {
    if (!irtResults || !iccCanvasRef.current) return;
    const canvas = iccCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    // 設定寬高
    const width = 500;
    const height = 300;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // 背景清除
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // 取得選取題目的 2PL 參數
    const targetIdx = itemNames.indexOf(selectedIccItem);
    if (targetIdx === -1) return;
    const param = irtResults.itemDetails[targetIdx];
    const { a, b } = param;

    // 繪製座標軸 (能力軸 -3 到 +3, 機率軸 0 到 1)
    const paddingLeft = 50;
    const paddingRight = 30;
    const paddingTop = 30;
    const paddingBottom = 45;

    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom;

    // 繪製格線
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#94a3b8';

    // X軸格線與刻度 (-3 到 +3)
    for (let thetaVal = -3; thetaVal <= 3; thetaVal++) {
      const x = paddingLeft + ((thetaVal + 3) / 6) * plotWidth;
      
      // 直線
      ctx.beginPath();
      ctx.moveTo(x, paddingTop);
      ctx.lineTo(x, paddingTop + plotHeight);
      ctx.stroke();

      // 文字
      ctx.fillText(thetaVal.toString(), x - 4, paddingTop + plotHeight + 15);
    }

    // Y軸格線與刻度 (0.0 到 1.0)
    for (let probVal = 0; probVal <= 10; probVal += 2) {
      const pRatio = probVal / 10;
      const y = paddingTop + plotHeight - pRatio * plotHeight;

      // 橫線
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(paddingLeft + plotWidth, y);
      ctx.stroke();

      // 文字
      ctx.fillText(pRatio.toFixed(1), paddingLeft - 25, y + 4);
    }

    // 繪製座標軸外框
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(paddingLeft, paddingTop, plotWidth, plotHeight);

    // X 與 Y 軸標籤
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('潛在能力值 (θ)', paddingLeft + plotWidth / 2 - 40, paddingTop + plotHeight + 35);
    
    // Y 軸標籤旋轉
    ctx.save();
    ctx.translate(15, paddingTop + plotHeight / 2 + 30);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('答對機率 P(θ)', 0, 0);
    ctx.restore();

    // 2PL 公式曲線繪製
    // P(theta) = 1 / (1 + exp(-a * (theta - b)))
    ctx.beginPath();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#8b5cf6'; // 紫色曲線

    // 曲線漸層
    const gradient = ctx.createLinearGradient(paddingLeft, 0, paddingLeft + plotWidth, 0);
    gradient.addColorStop(0, '#3b82f6'); // 藍色能力低
    gradient.addColorStop(0.5, '#a855f7'); // 紫色中等
    gradient.addColorStop(1, '#ec4899'); // 粉色能力高
    ctx.strokeStyle = gradient;

    for (let px = 0; px <= plotWidth; px++) {
      const thVal = -3 + (px / plotWidth) * 6;
      const prob = 1 / (1 + Math.exp(-a * (thVal - b)));
      const py = paddingTop + plotHeight - prob * plotHeight;
      
      if (px === 0) {
        ctx.moveTo(paddingLeft + px, py);
      } else {
        ctx.lineTo(paddingLeft + px, py);
      }
    }
    ctx.stroke();

    // 標示難度參數點 b (當答對機率為 0.5 時的能力點)
    const bx = paddingLeft + ((b + 3) / 6) * plotWidth;
    const by = paddingTop + plotHeight / 2;

    if (bx >= paddingLeft && bx <= paddingLeft + plotWidth) {
      ctx.beginPath();
      ctx.arc(bx, by, 5, 0, 2 * Math.PI);
      ctx.fillStyle = '#f59e0b'; // 黃橘色圓點
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(`難度 b = ${b}`, bx + 8, by - 5);
    }

    // 在右上角標示公式與鑑別度
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '11px monospace';
    ctx.fillText(`鑑別度 a = ${a}`, paddingLeft + 15, paddingTop + 20);

  }, [irtResults, selectedIccItem, subPage]);

  // 繪製 CDM 認知診斷雷達圖 (Radar Chart)
  useEffect(() => {
    if (!cdmResults || !cdmRadarCanvasRef.current || activeTab !== 'cdm') return;
    const canvas = cdmRadarCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const width = 320;
    const height = 230;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // 背景清除
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // 中心點與半徑
    const centerX = width / 2;
    const centerY = height / 2 + 10;
    const radius = 65;

    const K = attributeNames.length; 
    if (K === 0) return;

    // 取得當前學生精熟向量
    const student = cdmResults.studentProfiles[selectedStudentIdx];
    if (!student) return;
    const studentProfile = student.profile; 

    // 取得班級平均精熟比率
    const classPercentages = cdmResults.classMasteryPercentages.map(a => a.percentage); 

    // 1. 繪製雷達圖多邊形網格 (20%, 40%, 60%, 80%, 100%)
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.font = 'bold 8px sans-serif';
    ctx.fillStyle = '#64748b';

    const levels = [0.2, 0.4, 0.6, 0.8, 1.0];
    levels.forEach(level => {
      ctx.beginPath();
      for (let i = 0; i < K; i++) {
        const angle = (i * 2 * Math.PI) / K - Math.PI / 2;
        const x = centerX + Math.cos(angle) * radius * level;
        const y = centerY + Math.sin(angle) * radius * level;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();

      // 繪製格線文字 (在頂端軸線上標註百分比)
      const topAngle = -Math.PI / 2;
      const tx = centerX + Math.cos(topAngle) * radius * level;
      const ty = centerY + Math.sin(topAngle) * radius * level;
      ctx.fillStyle = '#475569';
      ctx.fillText(`${Math.round(level * 100)}%`, tx + 4, ty + 3);
    });

    // 2. 繪製放射狀軸線與屬性標籤文字
    for (let i = 0; i < K; i++) {
      const angle = (i * 2 * Math.PI) / K - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      // 畫軸線
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.stroke();

      // 畫標籤
      const labelDistance = radius + 18;
      const lx = centerX + Math.cos(angle) * labelDistance;
      const ly = centerY + Math.sin(angle) * labelDistance;

      // 文字對齊調整
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 9px sans-serif';
      
      const cleanLabel = `A${i+1}`;
      
      let align = 'center';
      if (Math.cos(angle) > 0.1) align = 'left';
      else if (Math.cos(angle) < -0.1) align = 'right';
      
      ctx.textAlign = align;
      ctx.fillText(cleanLabel, lx, ly + 3);
    }
    ctx.textAlign = 'center'; // 恢復預設

    // 3. 繪製全班平均掌握度多邊形 (綠色填充)
    ctx.beginPath();
    for (let i = 0; i < K; i++) {
      const angle = (i * 2 * Math.PI) / K - Math.PI / 2;
      const score = classPercentages[i] / 100; 
      const x = centerX + Math.cos(angle) * radius * score;
      const y = centerY + Math.sin(angle) * radius * score;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(16, 185, 129, 0.12)'; 
    ctx.fill();
    ctx.strokeStyle = '#10b981'; 
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 4. 繪製個別學生掌握度多邊形 (紫色點與線)
    ctx.beginPath();
    for (let i = 0; i < K; i++) {
      const angle = (i * 2 * Math.PI) / K - Math.PI / 2;
      const score = studentProfile[i]; 
      const x = centerX + Math.cos(angle) * radius * score;
      const y = centerY + Math.sin(angle) * radius * score;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(139, 92, 246, 0.2)'; 
    ctx.fill();
    ctx.strokeStyle = '#a78bfa'; 
    ctx.lineWidth = 2;
    ctx.stroke();

    // 繪製學生頂點圓圈
    for (let i = 0; i < K; i++) {
      const angle = (i * 2 * Math.PI) / K - Math.PI / 2;
      const score = studentProfile[i];
      const x = centerX + Math.cos(angle) * radius * score;
      const y = centerY + Math.sin(angle) * radius * score;

      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fillStyle = score === 1 ? '#a78bfa' : '#475569';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 5. 繪製圖例 (Legend)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.fillRect(5, 5, 85, 32);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(5, 5, 85, 32);

    // 全班平均
    ctx.fillStyle = '#10b981';
    ctx.fillRect(10, 10, 8, 4);
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 8px sans-serif';
    ctx.fillText('全班平均', 48, 14);

    // 個別學生
    ctx.fillStyle = '#a78bfa';
    ctx.fillRect(10, 21, 8, 4);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(`學生S${selectedStudentIdx + 1}精熟`, 48, 25);

  }, [cdmResults, selectedStudentIdx, attributeNames, activeTab, subPage]);

  // 修改作答儲存格
  const handleMatrixCellChange = (rowIdx, colIdx, value) => {
    const val = parseInt(value, 10);
    if (isNaN(val) || (val !== 0 && val !== 1)) return;

    const newMatrix = responseMatrix.map((row, r) => 
      row.map((cell, c) => (r === rowIdx && c === colIdx) ? val : cell)
    );
    setResponseMatrix(newMatrix);
  };

  // 修改 Q 矩陣屬性關聯
  const handleQMatrixToggle = (itemIdx, attrIdx) => {
    const newQ = qMatrix.map((row, r) => 
      row.map((cell, c) => (r === itemIdx && c === attrIdx) ? (cell === 1 ? 0 : 1) : cell)
    );
    setQMatrix(newQ);
  };

  // 匯入 CSV 作答矩陣
  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      skipEmptyLines: true,
      complete: (results) => {
        const parsed = results.data;
        if (parsed.length < 2) {
          alert("CSV 格式不正確，必須包含題頭列與至少一列學生作答資料！");
          return;
        }

        // 提取題目名稱（第一列，忽略第一個 ID 欄位）
        const headers = parsed[0].slice(1);
        
        // 提取學生反應資料
        const rows = [];
        for (let i = 1; i < parsed.length; i++) {
          const rowData = parsed[i].slice(1).map(v => {
            const num = parseInt(v, 10);
            return (num === 1 || num === 0) ? num : 0;
          });
          rows.push(rowData);
        }

        setItemNames(headers);
        setResponseMatrix(rows);

        // 自動同步 Q 矩陣的大小
        const newQ = Array(headers.length).fill(null).map(() => Array(attributeNames.length).fill(0));
        setQMatrix(newQ);
        setSelectedIccItem(headers[0] || 'Q1');
        setSelectedStudentIdx(0);
        
        alert(`成功匯入 ${rows.length} 位學生在 ${headers.length} 道試題上的作答反應！`);
      }
    });
  };

  // 匯出 CSV 檔案
  const handleExportCsv = () => {
    const headerRow = ['StudentID', ...itemNames];
    const rows = responseMatrix.map((row, i) => [`S${i+1}`, ...row]);
    const csvContent = Papa.unparse([headerRow, ...rows]);

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "student_response_matrix.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 匯入 CSV Q-Matrix
  const handleQMatrixCsvUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      skipEmptyLines: true,
      complete: (results) => {
        const parsed = results.data;
        if (parsed.length < 2) {
          alert("CSV 格式不正確，必須包含題頭列與至少一列 Q-Matrix 資料！");
          return;
        }

        const headers = parsed[0];
        const uploadedAttributes = headers.slice(1).map((h, idx) => h ? h.trim() : `A${idx + 1}`);
        const numAttrs = uploadedAttributes.length;

        const newQ = [];
        const newItems = [];
        
        for (let i = 1; i < parsed.length; i++) {
          const itemName = parsed[i][0];
          if (!itemName) continue;
          
          // 取出所有二元值
          const rowData = parsed[i].slice(1, 1 + numAttrs).map(v => {
            const num = parseInt(v, 10);
            return (num === 1 || num === 0) ? num : 0;
          });
          
          while (rowData.length < numAttrs) {
            rowData.push(0);
          }
          
          newItems.push(itemName.trim());
          newQ.push(rowData);
        }

        if (newItems.length !== itemNames.length) {
          const confirmSync = window.confirm(
            `匯入的 Q-Matrix 有 ${newItems.length} 道題，但目前作答反應有 ${itemNames.length} 道題。是否要自動調整作答反應的題目數量？`
          );
          if (!confirmSync) return;
          
          const newMatrix = responseMatrix.map(row => {
            const newRow = Array(newItems.length).fill(0);
            for (let c = 0; c < Math.min(row.length, newItems.length); c++) {
              newRow[c] = row[c];
            }
            return newRow;
          });
          setResponseMatrix(newMatrix);
        }
        
        setAttributeNames(uploadedAttributes);
        setItemNames(newItems);
        setQMatrix(newQ);
        setSelectedIccItem(newItems[0] || 'Q1');
        
        alert(`成功匯入 ${newItems.length} 道試題之 Q-Matrix 屬性關聯！共解析出 ${numAttrs} 個學科屬性。`);
      }
    });
  };

  // 匯出 Q-Matrix CSV
  const handleExportQMatrixCsv = () => {
    const headerRow = ['Item', ...attributeNames];
    const rows = itemNames.map((name, i) => [name, ...qMatrix[i]]);
    const csvContent = Papa.unparse([headerRow, ...rows]);

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "q_matrix.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 新增學生列
  const handleAddStudent = () => {
    const newRow = Array(itemNames.length).fill(0);
    setResponseMatrix([...responseMatrix, newRow]);
  };

  // 刪除學生列
  const handleRemoveStudent = (idx) => {
    if (responseMatrix.length <= 2) {
      alert("學生樣本數量過低，無法進一步刪除！");
      return;
    }
    const newMatrix = responseMatrix.filter((_, i) => i !== idx);
    setResponseMatrix(newMatrix);
    if (selectedStudentIdx >= newMatrix.length) {
      setSelectedStudentIdx(newMatrix.length - 1);
    }
  };

  // 新增試題欄
  const handleAddItem = () => {
    const newQName = `Q${itemNames.length + 1}`;
    setItemNames([...itemNames, newQName]);
    setItemDescriptions({
      ...itemDescriptions,
      [newQName]: `新增的學科試題概念 ${newQName}`
    });

    const newMatrix = responseMatrix.map(row => [...row, 0]);
    setResponseMatrix(newMatrix);
    setQMatrix([...qMatrix, Array(attributeNames.length).fill(0)]);
  };

  // 刪除試題欄
  const handleRemoveItem = (colIdx) => {
    if (itemNames.length <= 2) {
      alert("試題數量過低，無法進一步刪除！");
      return;
    }
    const removedItemName = itemNames[colIdx];
    const newNames = itemNames.filter((_, idx) => idx !== colIdx);
    setItemNames(newNames);

    const newMatrix = responseMatrix.map(row => row.filter((_, idx) => idx !== colIdx));
    setResponseMatrix(newMatrix);

    const newQ = qMatrix.filter((_, idx) => idx !== colIdx);
    setQMatrix(newQ);

    if (selectedIccItem === removedItemName) {
      setSelectedIccItem(newNames[0]);
    }
  };

  // 修改認知屬性標題
  const handleAttributeNameChange = (idx, value) => {
    const newAttrs = [...attributeNames];
    newAttrs[idx] = value;
    setAttributeNames(newAttrs);
  };

  // 新增學科認知屬性
  const handleAddAttribute = () => {
    const nextIdx = attributeNames.length + 1;
    setAttributeNames([...attributeNames, `新增學科屬性 A${nextIdx}`]);
    const newQ = qMatrix.map(row => [...row, 0]);
    setQMatrix(newQ);
  };

  // 刪除最末學科認知屬性
  const handleRemoveAttribute = () => {
    if (attributeNames.length <= 1) {
      alert("必須至少保留 1 個學科屬性！");
      return;
    }
    const confirmRemove = window.confirm(`您確定要刪除最末認知屬性「${attributeNames[attributeNames.length - 1]}」嗎？這將會清除對應的勾選狀態。`);
    if (!confirmRemove) return;
    
    setAttributeNames(attributeNames.slice(0, -1));
    const newQ = qMatrix.map(row => row.slice(0, -1));
    setQMatrix(newQ);
  };

  // 列印完整 APA 學術報告
  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-fade-in print:bg-white print:text-black print:p-0">
      
      {/* 🚀 A4 列印標準樣式 CSS */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #print-academic-report-container, #print-academic-report-container * {
            visibility: visible;
          }
          #print-academic-report-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
          }
          .print-break-page {
            page-break-after: always;
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />

      {/* 頂部 Header & 導言頁面 */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-800/80 pb-6 no-print">
        <div className="space-y-1.5">
          <div className="inline-flex bg-gradient-to-r from-accentViolet/20 to-indigo-500/20 px-3 py-1 rounded-full text-xs font-bold text-accentViolet border border-accentViolet/30 items-center space-x-1">
            <Brain size={13} className="animate-pulse" />
            <span>心理計量測驗分析特別入口 (Academic Suite)</span>
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight">
            測驗三大模型分析特區
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            全面整合古典測驗理論 (CTT)、項目反應理論 (IRT) 2PL 與認知診斷模型 (CDM) DINA，提供一站式學術測驗品質檢索！
          </p>
        </div>

        <button
          onClick={handlePrintReport}
          className="mt-4 md:mt-0 flex items-center justify-center space-x-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-accentViolet to-indigo-500 hover:from-accentViolet/90 hover:to-indigo-500/90 text-white text-xs font-bold shadow-lg shadow-accentViolet/20 cursor-pointer active:scale-95 transition-all duration-200"
        >
          <Printer size={15} />
          <span>下載整份考題分析報告 (PDF)</span>
        </button>
      </div>

      {/* 子頁面切換導覽 (📖 理論模型說明 vs 🛠️ 互動分析工作區) */}
      <div className="flex bg-slate-900/40 p-1 rounded-2xl border border-slate-800/80 max-w-md no-print">
        <button
          onClick={() => setSubPage('explanation')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center space-x-2 cursor-pointer ${
            subPage === 'explanation'
              ? 'bg-gradient-to-tr from-accentViolet/25 to-indigo-500/25 text-white border border-accentViolet/35 shadow-inner'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <BookOpen size={14} />
          <span>📖 理論模型說明</span>
        </button>
        <button
          onClick={() => setSubPage('workspace')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center space-x-2 cursor-pointer ${
            subPage === 'workspace'
              ? 'bg-gradient-to-tr from-accentViolet/25 to-indigo-500/25 text-white border border-accentViolet/35 shadow-inner'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <Settings size={14} />
          <span>🛠️ 互動分析工作區</span>
        </button>
      </div>

      {subPage === 'explanation' ? (
        /* ==================== 📖 理論模型說明頁 ==================== */
        <div className="space-y-8 animate-fade-in no-print">
          {/* Media Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left: Media Player & Diagram Showcase */}
            <div className="lg:col-span-5 space-y-6">
              {/* WebP Diagram Showcase Card */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 backdrop-blur-xl shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                    <span className="text-[10px] text-slate-400 font-bold ml-2">academic-suite.webp</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-slate-850 text-slate-400 text-[9px] font-bold border border-slate-800">IMAGE</span>
                </div>
                <div className="relative rounded-2xl overflow-hidden border border-slate-800/80 bg-slate-950 group">
                  <img 
                    src="/academic-suite.webp" 
                    alt="Psychometrics Suite Interface Diagram" 
                    className="w-full h-auto object-cover transform group-hover:scale-[1.02] transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent flex items-end p-4">
                    <span className="text-2xs text-slate-300 font-semibold tracking-wide">心理計量特區高階分析儀表板架構示意圖</span>
                  </div>
                </div>
              </div>

              {/* Compressed Video Player Card */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 backdrop-blur-xl shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                  <div className="flex items-center space-x-2">
                    <Play size={14} className="text-accentViolet animate-pulse" />
                    <span className="text-[10px] text-slate-400 font-bold">動態分析系統操作展示影片</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-slate-850 text-slate-400 text-[9px] font-bold border border-slate-800">VIDEO</span>
                </div>
                <div className="relative rounded-2xl overflow-hidden border border-slate-800/80 bg-slate-950">
                  <video 
                    src="/academic-suite.mp4" 
                    controls 
                    loop 
                    muted 
                    className="w-full h-auto object-cover"
                    poster="/academic-suite.webp"
                  />
                </div>
              </div>
            </div>

            {/* Right: Math Explanations & Theory */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* CTT Card */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-xl shadow-xl space-y-4">
                <div className="flex items-center space-x-2.5 text-indigo-400 border-b border-slate-800/60 pb-3">
                  <BarChart3 size={20} />
                  <h3 className="text-lg font-black text-white">古典測驗理論 (Classical Test Theory, CTT)</h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  古典測驗理論假設觀察分數 (X) 是真分數 (T) 與測量誤差 (E) 的線性組合：<span className="font-serif italic font-bold text-slate-200">X = T + E</span>。其分析焦點在於整份試卷的信度與單一試題的難度與鑑別度。
                </p>
                
                <div className="space-y-4 pt-2">
                  <div>
                    <h4 className="text-xs font-bold text-indigo-300">1. 庫李信度 (Kuder-Richardson 20, KR-20)</h4>
                    <p className="text-[10px] text-slate-400 font-medium mb-2">適用於二元計分（0答錯/1答對）試卷的信度估算公式：</p>
                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 font-mono text-center my-3">
                      <span className="text-lg font-serif text-white tracking-wide">
                        KR<sub>20</sub> = <div className="inline-block text-center align-middle"><div className="border-b border-slate-600 pb-0.5 px-2">k</div><div className="pt-0.5 px-2">k - 1</div></div> &times; <span className="text-2xl font-light align-middle">(</span>1 - <div className="inline-block text-center align-middle"><div className="border-b border-slate-600 pb-0.5 px-2">&sum; p<sub>i</sub>q<sub>i</sub></div><div className="pt-0.5 px-2">&sigma;<sub>X</sub><sup>2</sup></div></div><span className="text-2xl font-light align-middle">)</span>
                      </span>
                    </div>
                    <ul className="text-[10px] text-slate-400 leading-relaxed space-y-1 list-disc list-inside">
                      <li><span className="font-serif italic font-bold text-slate-300">k</span>: 試卷的總題數 (Test Length)。</li>
                      <li><span className="font-serif italic font-bold text-slate-300">p<sub>i</sub></span>: 第 <span className="font-serif italic font-bold text-slate-300">i</span> 題的答對率 (Item Difficulty)。</li>
                      <li><span className="font-serif italic font-bold text-slate-300">q<sub>i</sub></span>: 第 <span className="font-serif italic font-bold text-slate-300">i</span> 題的答錯率 (<span className="font-serif italic font-bold text-slate-300">1 - p<sub>i</sub></span>)。</li>
                      <li><span className="font-serif italic font-bold text-slate-300">&sigma;<sub>X</sub><sup>2</sup></span>: 所有受試者總得分的變異數 (Total Variance)。</li>
                    </ul>
                  </div>

                  <div className="border-t border-slate-800/60 pt-4">
                    <h4 className="text-xs font-bold text-indigo-300">2. 斯皮爾曼-布朗折半信度 (Spearman-Brown Prophecy)</h4>
                    <p className="text-[10px] text-slate-400 font-medium mb-2">將試卷分為奇偶數兩半，估算整份試卷之信度校正公式：</p>
                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 font-mono text-center my-3">
                      <span className="text-lg font-serif text-white tracking-wide">
                        r<sub>xx</sub> = <div className="inline-block text-center align-middle"><div className="border-b border-slate-600 pb-0.5 px-4">2 &middot; r<sub>hh</sub></div><div className="pt-0.5 px-4">1 + r<sub>hh</sub></div></div>
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      其中 <span className="font-serif italic font-bold text-slate-300">r<sub>hh</sub></span> 為奇偶兩半試題得分的 Pearson 相關係數。
                    </p>
                  </div>

                  <div className="border-t border-slate-800/60 pt-4">
                    <h4 className="text-xs font-bold text-indigo-300">3. 高低分組鑑別度 (Item Discrimination Index, D)</h4>
                    <p className="text-[10px] text-slate-400 font-medium mb-2">衡量試題區分考生能力優劣的簡易臨床指標：</p>
                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 font-mono text-center my-3">
                      <span className="text-lg font-serif text-white tracking-wide">
                        D = P<sub>H</sub> - P<sub>L</sub>
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      其中 <span className="font-serif italic font-bold text-slate-300">P<sub>H</sub></span> 為班級高分組（得分前 27% 考生）在該題的答對率；<span className="font-serif italic font-bold text-slate-300">P<sub>L</sub></span> 為班級低分組（得分後 27% 考生）在該題的答對率。
                    </p>
                  </div>
                </div>
              </div>

              {/* IRT Card */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-xl shadow-xl space-y-4">
                <div className="flex items-center space-x-2.5 text-accentViolet border-b border-slate-800/60 pb-3">
                  <Brain size={20} />
                  <h3 className="text-lg font-black text-white">項目反應理論 (Item Response Theory, IRT)</h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  項目反應理論排除受試者樣本依賴性，將考生「潛在能力值」與試題的「特徵參數」對應到相同的數學尺度上。本平台採用經典的<b>雙參數邏輯斯模型 (2PL Model)</b>：
                </p>

                <div className="space-y-4 pt-2">
                  <div>
                    <h4 className="text-xs font-bold text-purple-300">雙參數邏輯斯模型 (2-Parameter Logistic Model, 2PL)</h4>
                    <p className="text-[10px] text-slate-400 font-medium mb-2">當能力為 &theta; 的考生，答對第 <span className="font-serif italic font-bold text-slate-300">j</span> 題之機率方程：</p>
                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 font-mono text-center my-3">
                      <span className="text-lg font-serif text-white tracking-wide">
                        P(X<sub>ij</sub> = 1 | &theta;<sub>i</sub>) = <div className="inline-block text-center align-middle"><div className="border-b border-slate-600 pb-0.5 px-4">1</div><div className="pt-0.5 px-4">1 + e<sup>-D &middot; a<sub>j</sub>(&theta;<sub>i</sub> - b<sub>j</sub>)</sup></div></div>
                      </span>
                    </div>
                    <ul className="text-[10px] text-slate-400 leading-relaxed space-y-1.5 list-disc list-inside">
                      <li><b>&theta;<sub>i</sub> (潛在能力值, Latent Ability):</b> 考生的潛在特質或數學學科能力。通常在 <code className="text-slate-300">-3.0</code> 到 <code className="text-slate-300">+3.0</code> 之間。</li>
                      <li><b>b<sub>j</sub> (難度參數, Difficulty Parameter):</b> 第 <span className="font-serif italic font-bold text-slate-300">j</span> 題的難度。其值代表當考生答對機率為 0.50 時所需具備的潛在能力值 &theta;。</li>
                      <li><b>a<sub>j</sub> (鑑別度參數, Discrimination Parameter):</b> 曲線在難度點 <span className="font-serif italic font-bold text-slate-300">b<sub>j</sub></span> 處的斜率。值越大代表該題對鄰近能力考生的區分效果越顯著。</li>
                      <li><b>D (尺度常數, Scaling Constant):</b> 一般設為 <code className="text-slate-300">1.702</code>，使邏輯斯曲線與常態累積機率曲線的差異小於 0.01。</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* CDM Card */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-xl shadow-xl space-y-4">
                <div className="flex items-center space-x-2.5 text-accentEmerald border-b border-slate-800/60 pb-3">
                  <Award size={20} />
                  <h3 className="text-lg font-black text-white">認知診斷模型 (Cognitive Diagnostic Models, CDM)</h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  不同於 IRT 提供單一的能力總分，認知診斷模型 (CDM) 透過受試者的作答反應，推導其在細分學科认知屬性上的「精熟剖面向量」。本平台採用國際主流的 <b>DINA 模型</b>（Deterministic Inputs, Noisy "And" gate model）：
                </p>

                <div className="space-y-4 pt-2">
                  <div>
                    <h4 className="text-xs font-bold text-emerald-300">1. Q 矩陣對應關係 (Q-Matrix Architecture)</h4>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Q 矩陣為 <span className="font-serif italic font-bold text-slate-300">J &times; K</span>（試題數 &times; 屬性數）的二元矩陣。<span className="font-serif italic font-bold text-slate-300">q<sub>jk</sub> = 1</span> 表示第 <span className="font-serif italic font-bold text-slate-300">j</span> 題必須掌握第 <span className="font-serif italic font-bold text-slate-300">k</span> 個屬性才能正確作答；反之為 0。
                    </p>
                  </div>

                  <div className="border-t border-slate-800/60 pt-4">
                    <h4 className="text-xs font-bold text-emerald-300">2. 潛在掌握狀態與確定性作答反應 (DINA Model Core)</h4>
                    <p className="text-[10px] text-slate-400 font-medium mb-2">定義理想上考生 <span className="font-serif italic font-bold text-slate-300">i</span> 對於試題 <span className="font-serif italic font-bold text-slate-300">j</span> 的理想反應值 &eta;<sub>ij</sub>：</p>
                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 font-mono text-center my-2">
                      <span className="text-base font-serif text-white tracking-wide">
                        &eta;<sub>ij</sub> = <span className="text-xl align-middle">&prod;</span><sub>k=1</sub><sup>K</sup> &alpha;<sub>ik</sub><sup>q<sub>jk</sub></sup>
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed mt-2">
                      若考生 <span className="font-serif italic font-bold text-slate-300">i</span> 掌握了該題所需的所有認知屬性，&eta;<sub>ij</sub> = 1；若有任何一項缺失，&eta;<sub>ij</sub> = 0。
                    </p>
                  </div>

                  <div className="border-t border-slate-800/60 pt-4">
                    <h4 className="text-xs font-bold text-emerald-300">3. 引入失誤 (Slip) 與猜測 (Guess) 的答對機率</h4>
                    <p className="text-[10px] text-slate-400 font-medium mb-2">真實情況中存在失誤與猜測，DINA 模型之真實作答機率方程為：</p>
                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 font-mono text-center my-3">
                      <span className="text-lg font-serif text-white tracking-wide">
                        P(X<sub>ij</sub> = 1 | <span className="font-bold">&alpha;</span><sub>i</sub>) = g<sub>j</sub><sup>(1 - &eta;<sub>ij</sub>)</sup> (1 - s<sub>j</sub>)<sup>&eta;<sub>ij</sub></sup>
                      </span>
                    </div>
                    <ul className="text-[10px] text-slate-400 leading-relaxed space-y-1 list-disc list-inside">
                      <li><b>s<sub>j</sub> (失誤參數, Slip):</b> 掌握了所有屬性卻因為粗心答錯的機率 <span className="font-serif italic text-slate-400">P(X<sub>ij</sub>=0|&eta;<sub>ij</sub>=1)</span>。</li>
                      <li><b>g<sub>j</sub> (猜測參數, Guess):</b> 未掌握所有屬性卻猜對該題的機率 <span className="font-serif italic text-slate-400">P(X<sub>ij</sub>=1|&eta;<sub>ij</sub>=0)</span>。</li>
                    </ul>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      ) : (
        /* ==================== 🛠️ 互動分析工作區 ==================== */
        <div className="space-y-8 animate-fade-in no-print">

        {/* 測驗理論簡介 (三合一卡片) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-5 hover:border-slate-700/80 transition-all duration-300">
          <div className="flex items-center space-x-2 text-indigo-400 mb-2">
            <BarChart3 size={18} />
            <h4 className="text-sm font-bold">古典測驗理論 (CTT)</h4>
          </div>
          <p className="text-2xs text-slate-400 leading-relaxed font-medium">
            專注於「試卷與試題的信度與難鑑別指標」。透過 **KR-20 二元信度** 及 **Spearman-Brown 折半係數**，檢驗考卷一致性，並以高低分組答對率差（鑑別度 D）精準挑出劣質題目。
          </p>
        </div>

        <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-5 hover:border-slate-700/80 transition-all duration-300">
          <div className="flex items-center space-x-2 text-accentViolet mb-2">
            <Brain size={18} />
            <h4 className="text-sm font-bold">項目反應理論 (IRT 2PL)</h4>
          </div>
          <p className="text-2xs text-slate-400 leading-relaxed font-medium">
            排除樣本依賴性，以邏輯斯對數機率推導試題。透過**雙參數 (2PL) EM 最大概似估計**，獲得不隨學生能力而變的難度 (<span className="font-serif italic font-bold text-slate-300">b</span>) 與鑑別度 (<span className="font-serif italic font-bold text-slate-300">a</span>) 參數，並繪製 **項目特徵曲線 (ICC)**，精確評估學生潛在能力 <span className="font-serif italic font-bold text-indigo-400">θ</span>。
          </p>
        </div>

        <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-5 hover:border-slate-700/80 transition-all duration-300">
          <div className="flex items-center space-x-2 text-accentEmerald mb-2">
            <Award size={18} />
            <h4 className="text-sm font-bold">認知診斷模型 (CDM DINA)</h4>
          </div>
          <p className="text-2xs text-slate-400 leading-relaxed font-medium">
            精細診斷學習弱點的革命性工具。透過作答反應與 **Q 矩陣** 對比，以 **DINA 模型** 搜尋概似度最高的潛在屬性掌握向量 <span className="font-serif italic font-bold text-purple-400">α</span> = [1, 1, 0, 0]，提供針對性補救教學指引。
          </p>
        </div>
      </div>

      {/* 編輯面板區 (學生作答矩陣與 Q-Matrix 分離為獨立全寬版面) */}
      <div className="flex flex-col space-y-8 no-print">
        
        {/* 學生二元作答反應矩陣 (0/1) - 全寬大版面 */}
        <div className="bg-slate-900/60 rounded-3xl p-6 border border-slate-800/80 backdrop-blur-xl shadow-xl flex flex-col space-y-4 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800/60 pb-4">
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="text-indigo-400" size={18} />
              <div>
                <h3 className="text-base font-bold text-white">學生二元作答反應矩陣 (0 / 1)</h3>
                <span className="text-4xs text-slate-400 font-medium">請輸入 1 代表答對，0 代表答錯。可線上雙擊編輯儲存格或增減行列。</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <label className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer">
                <Upload size={13} />
                <span>匯入 CSV</span>
                <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
              </label>
              <button
                onClick={handleExportCsv}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
              >
                <Download size={13} />
                <span>匯出 CSV</span>
              </button>
            </div>
          </div>

          {/* 線上數據網格 */}
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/80 max-h-[400px]">
            <table className="w-full text-left border-collapse text-xs font-medium">
              <thead className="sticky top-0 bg-slate-900 text-slate-300 font-bold border-b border-slate-800 z-10">
                <tr>
                  <th className="p-3 text-center w-20">學號 ID</th>
                  {itemNames.map((name, idx) => (
                    <th key={name} className="p-3 text-center group min-w-16 relative">
                      <div className="flex flex-col items-center">
                        <span className="text-slate-200 font-black">{name}</span>
                        {/* 雙擊修改題名提示 */}
                        <span className="text-[8px] text-slate-500 font-semibold group-hover:text-indigo-400 transition-colors">
                          雙擊修改
                        </span>
                      </div>
                    </th>
                  ))}
                  <th className="p-3 text-center w-16">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {responseMatrix.map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-3 text-center font-bold bg-slate-900/20 text-slate-200 border-r border-slate-850">
                      S{rowIdx + 1}
                    </td>
                    {row.map((cell, colIdx) => (
                      <td key={colIdx} className="p-2 text-center border-r border-slate-850/40">
                        <input
                          type="text"
                          value={cell}
                          onChange={(e) => handleMatrixCellChange(rowIdx, colIdx, e.target.value)}
                          className="w-8 h-8 text-center bg-slate-900 hover:bg-slate-850 focus:bg-slate-950 text-slate-200 border border-slate-800 focus:border-indigo-500 rounded-lg outline-none font-bold text-2xs transition-colors"
                        />
                      </td>
                    ))}
                    <td className="p-2 text-center">
                      <button
                        onClick={() => handleRemoveStudent(rowIdx)}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors border border-red-500/10"
                        title="刪除學生"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 表格操作按鈕 */}
          <div className="flex items-center space-x-2 pt-2">
            <button
              onClick={handleAddStudent}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-bold border border-indigo-500/20 cursor-pointer active:scale-95 transition-all"
            >
              <Plus size={13} />
              <span>新增學生列 (Row)</span>
            </button>

            <button
              onClick={handleAddItem}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/20 cursor-pointer active:scale-95 transition-all"
            >
              <Plus size={13} />
              <span>新增試題欄 (Column)</span>
            </button>
          </div>
        </div>

        {/* Q-Matrix 認知屬性映射面板 - 全寬大版面 */}
        <div className="bg-slate-900/60 rounded-3xl p-6 border border-slate-800/80 backdrop-blur-xl shadow-xl flex flex-col space-y-4 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800/60 pb-4">
            <div className="flex items-center space-x-2">
              <Settings className="text-accentEmerald" size={18} />
              <div>
                <h3 className="text-base font-bold text-white">Q-Matrix 認知屬性映射面板</h3>
                <span className="text-4xs text-slate-400 font-medium">勾選表示該試題需要精熟該認知屬性（適用於 CDM DINA 認知診斷模型）。</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <label className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer">
                <Upload size={13} className="text-accentEmerald" />
                <span>匯入 Q-Matrix CSV</span>
                <input type="file" accept=".csv" onChange={handleQMatrixCsvUpload} className="hidden" />
              </label>
              <button
                onClick={handleExportQMatrixCsv}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
              >
                <Download size={13} className="text-accentEmerald" />
                <span>匯出 Q-Matrix CSV</span>
              </button>
            </div>
          </div>

          {/* 屬性名稱自訂欄位 */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <label className="text-4xs font-bold text-slate-400 uppercase tracking-wider block">自定義認知屬性說明文字 (無須加前綴，系統將自動套用)</label>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleAddAttribute}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-accentEmerald text-xs font-bold border border-accentEmerald/20 transition-all duration-300 cursor-pointer"
                >
                  <Plus size={12} />
                  <span>新增認知屬性</span>
                </button>
                <button
                  onClick={handleRemoveAttribute}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold border border-rose-500/20 transition-all duration-300 cursor-pointer"
                >
                  <Trash2 size={12} />
                  <span>刪除最末屬性</span>
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {attributeNames.map((name, idx) => (
                <div key={idx} className="flex items-center space-x-2 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5">
                  <span className="text-5xs font-black text-accentEmerald w-4 bg-accentEmerald/10 rounded px-1 py-0.5 text-center">A{idx+1}</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handleAttributeNameChange(idx, e.target.value)}
                    className="bg-transparent border-none text-slate-200 text-4xs font-bold outline-none flex-grow py-0.5"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Q 矩陣 Checkbox 編輯網格 */}
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/80 max-h-[350px]">
            <table className="w-full text-left border-collapse text-xs font-medium">
              <thead className="sticky top-0 bg-slate-900 text-slate-300 font-bold border-b border-slate-800 z-10">
                <tr>
                  <th className="p-3 text-center w-24">試題 ID</th>
                  {attributeNames.map((name, idx) => (
                    <th key={idx} className="p-3 text-center" title={`A${idx+1}: ${name}`}>
                      <div className="flex flex-col items-center">
                        <span className="text-slate-100 font-extrabold">A{idx+1}</span>
                        <span className="text-[9px] text-slate-500 font-bold truncate max-w-[160px] mt-0.5">
                          {name}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {itemNames.map((name, itemIdx) => (
                  <tr key={name} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-3 text-center bg-slate-900/20 text-slate-200 font-bold border-r border-slate-850">
                      {name}
                    </td>
                    {attributeNames.map((_, attrIdx) => {
                      const isChecked = qMatrix[itemIdx] && qMatrix[itemIdx][attrIdx] === 1;
                      return (
                        <td key={attrIdx} className="p-3 text-center border-r border-slate-850/40">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleQMatrixToggle(itemIdx, attrIdx)}
                            className="w-4 h-4 rounded text-accentEmerald border-slate-800 bg-slate-900 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* 三大成果看板主卡片 */}
      <div className="bg-slate-900/60 rounded-3xl border border-slate-800/80 shadow-2xl overflow-hidden backdrop-blur-xl no-print">
        
        {/* 卡片標題 Tab 欄位 */}
        <div className="flex border-b border-slate-800 bg-slate-900/40 p-1">
          <button
            onClick={() => setActiveTab('ctt')}
            className={`flex-1 py-3.5 rounded-2xl text-xs font-bold transition-all duration-300 flex items-center justify-center space-x-2 cursor-pointer ${
              activeTab === 'ctt'
                ? 'bg-gradient-to-tr from-accentViolet/25 to-indigo-500/25 text-white border border-accentViolet/35 shadow-inner'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <BarChart3 size={15} />
            <span>CTT 古典理論指標</span>
          </button>
          
          <button
            onClick={() => setActiveTab('irt')}
            className={`flex-1 py-3.5 rounded-2xl text-xs font-bold transition-all duration-300 flex items-center justify-center space-x-2 cursor-pointer ${
              activeTab === 'irt'
                ? 'bg-gradient-to-tr from-accentViolet/25 to-indigo-500/25 text-white border border-accentViolet/35 shadow-inner'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Brain size={15} />
            <span>IRT 2PL 難度鑑別度</span>
          </button>

          <button
            onClick={() => setActiveTab('cdm')}
            className={`flex-1 py-3.5 rounded-2xl text-xs font-bold transition-all duration-300 flex items-center justify-center space-x-2 cursor-pointer ${
              activeTab === 'cdm'
                ? 'bg-gradient-to-tr from-accentViolet/25 to-indigo-500/25 text-white border border-accentViolet/35 shadow-inner'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Award size={15} />
            <span>CDM DINA 認知診斷</span>
          </button>
        </div>

        {/* Tab 內容渲染 */}
        <div className="p-6 md:p-8 space-y-6">
          
          {/* CTT 面板 */}
          {activeTab === 'ctt' && cttResults && (
            <div className="space-y-6 animate-fade-in">
              {/* 頂部四個信度與統計總覽卡片 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 text-center">
                  <span className="text-4xs font-bold text-slate-500 block uppercase tracking-wider">班級平均分</span>
                  <span className="text-xl font-extrabold text-white block mt-1">{(cttResults.meanScore).toFixed(2)} / {itemNames.length}</span>
                </div>
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 text-center">
                  <span className="text-4xs font-bold text-slate-500 block uppercase tracking-wider">庫李信度 (KR-20)</span>
                  <span className="text-xl font-extrabold text-accentViolet block mt-1">{(cttResults.kr20).toFixed(3)}</span>
                  <span className="text-5xs font-semibold text-slate-400 mt-0.5 block">二元計分標準信度指標</span>
                </div>
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 text-center">
                  <span className="text-4xs font-bold text-slate-500 block uppercase tracking-wider">Cronbach\'s Alpha</span>
                  <span className="text-xl font-extrabold text-indigo-400 block mt-1">{(cttResults.cronbachAlpha).toFixed(3)}</span>
                  <span className="text-5xs font-semibold text-slate-400 mt-0.5 block">全體一致性係數</span>
                </div>
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 text-center">
                  <span className="text-4xs font-bold text-slate-500 block uppercase tracking-wider">折半信度 (S-B 校正)</span>
                  <span className="text-xl font-extrabold text-accentEmerald block mt-1">{(cttResults.splitHalf).toFixed(3)}</span>
                  <span className="text-5xs font-semibold text-slate-400 mt-0.5 block">奇偶題項信度估算</span>
                </div>
              </div>

              {/* 試題難度與鑑別度學術表格 */}
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-white flex items-center space-x-1.5">
                  <CheckCircle2 size={14} className="text-accentViolet" />
                  <span>試題難度與高低分組鑑別度分析表 (APA Standard)</span>
                </h4>
                <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/40">
                  <table className="w-full text-left border-collapse text-2xs font-semibold">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800 text-slate-300">
                        <th className="p-3 text-center">題號</th>
                        <th className="p-3 text-left">試題概念描述</th>
                        <th className="p-3 text-center">難度 p 值 (答對率)</th>
                        <th className="p-3 text-center">高分組答對率 (P_H)</th>
                        <th className="p-3 text-center">低分組答對率 (P_L)</th>
                        <th className="p-3 text-center text-accentViolet">鑑別度 D 值</th>
                        <th className="p-3 text-center">試題篩選結論</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-200">
                      {cttResults.itemDetails.map((item) => (
                        <tr key={item.item} className="hover:bg-slate-900/30 transition-colors">
                          <td className="p-3 text-center font-extrabold text-slate-100">{item.item}</td>
                          <td className="p-3 text-left text-slate-400 font-medium">{itemDescriptions[item.item] || '未設定描述'}</td>
                          <td className="p-3 text-center font-bold">{(item.difficulty).toFixed(2)}</td>
                          <td className="p-3 text-center font-medium">{(item.highCorrectRate).toFixed(2)}</td>
                          <td className="p-3 text-center font-medium">{(item.lowCorrectRate).toFixed(2)}</td>
                          <td className="p-3 text-center font-extrabold text-accentViolet">{(item.discrimination).toFixed(2)}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-5xs font-black ${
                              item.discrimination >= 0.30 
                                ? 'bg-accentEmerald/15 text-accentEmerald border border-accentEmerald/30' 
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {item.verdict}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 學術解讀指引 */}
              <div className="bg-slate-950/60 rounded-2xl border border-slate-800 p-4 space-y-2">
                <span className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                  <AlertCircle size={13} className="text-accentViolet" />
                  <span>學術解讀與篩選指標指引</span>
                </span>
                <ul className="text-5xs text-slate-400 leading-relaxed space-y-1 list-disc list-inside">
                  <li><b>難度 (Difficulty Index, p)：</b> 一般介於 <code className="text-slate-300">0.30 - 0.70</code> 之間最優，本班在 <code className="text-slate-300">Q20</code> 難度值較低，代表該題為本次測驗之高難度壓軸關卡。</li>
                  <li><b>鑑別度 (Discrimination Index, D)：</b> <code className="text-slate-300">D &gt;= 0.40</code> 屬極佳試題；若 <code className="text-slate-300">D &lt; 0.20</code> 代表題目無法有效區分出高低分組，需進行題目內容與選項誘答力的修訂。</li>
                  <li><b>二元計分信度 (KR-20)：</b> KR-20 係數代表本卷的內部一致性。當其 <code className="text-slate-300">&gt;= 0.70</code> 代表該測驗具有優異的測量信賴度，可供學術論文與常態測驗使用。</li>
                </ul>
              </div>
            </div>
          )}

          {/* IRT 面板 */}
          {activeTab === 'irt' && irtResults && (
            <div className="space-y-8 animate-fade-in">
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* 左側：試題參數表 */}
                <div className="lg:col-span-5 space-y-4">
                  <h4 className="text-sm font-bold text-white flex items-center space-x-1.5">
                    <CheckCircle2 size={14} className="text-indigo-400" />
                    <span>2PL 試題特徵參數表</span>
                  </h4>
                  <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/40">
                    <table className="w-full text-left border-collapse text-2xs font-semibold">
                      <thead>
                        <tr className="bg-slate-900 border-b border-slate-800 text-slate-300">
                          <th className="p-3 text-center">題號</th>
                          <th className="p-3 text-center text-accentViolet">鑑別度參數 a</th>
                          <th className="p-3 text-center text-amber-500">難度參數 b</th>
                          <th className="p-3 text-center">評估診斷</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-200">
                        {irtResults.itemDetails.map((item) => (
                          <tr 
                            key={item.item} 
                            onClick={() => setSelectedIccItem(item.item)}
                            className={`cursor-pointer hover:bg-slate-900/40 transition-colors ${
                              selectedIccItem === item.item ? 'bg-indigo-500/10' : ''
                            }`}
                          >
                            <td className="p-3 text-center font-extrabold text-slate-100 flex items-center justify-center space-x-1.5">
                              <span>{item.item}</span>
                              {selectedIccItem === item.item && <ChevronRight size={10} className="text-accentViolet animate-bounce-right" />}
                            </td>
                            <td className="p-3 text-center font-bold text-accentViolet">{item.a}</td>
                            <td className="p-3 text-center font-bold text-amber-500">{item.b}</td>
                            <td className="p-3 text-center">
                              <span className="text-5xs font-bold text-slate-400">
                                {item.a > 1.5 ? '高敏感鑑別' : '一般鑑別'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* 學生能力分數 θ 排名 */}
                  <div className="space-y-2">
                    <span className="text-4xs font-bold text-slate-400 block uppercase tracking-wider">學生能力 (θ) 估算與學術排名</span>
                    <div className="overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/40 max-h-[160px] text-3xs font-semibold">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 sticky top-0">
                          <tr>
                            <th className="p-2 text-center">學術名次</th>
                            <th className="p-2 text-center">學生代碼</th>
                            <th className="p-2 text-center">答對題數</th>
                            <th className="p-2 text-center text-accentEmerald">能力估計值 θ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300">
                          {irtResults.sortedStudents.map((st, rankIdx) => (
                            <tr key={st.studentId} className="hover:bg-slate-900/30">
                              <td className="p-2 text-center font-bold">{rankIdx + 1}</td>
                              <td className="p-2 text-center font-bold">{st.studentId}</td>
                              <td className="p-2 text-center">{st.score}</td>
                              <td className="p-2 text-center font-extrabold text-accentEmerald">{st.theta >= 0 ? `+${st.theta.toFixed(2)}` : st.theta.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* 右側：ICC 圖形畫布 */}
                <div className="lg:col-span-7 bg-slate-950/40 border border-slate-800 rounded-3xl p-6 flex flex-col items-center space-y-4">
                  <div className="w-full flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-white flex items-center space-x-1">
                        <HelpCircle size={12} className="text-accentViolet" />
                        <span>項目特徵曲線 ICC (Item Characteristic Curve)</span>
                      </h4>
                      <span className="text-5xs text-slate-400 block font-medium">選定特定試題，即刻調用 2PL 方程式繪製單題機率對應圖</span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <label className="text-5xs font-bold text-slate-500">切換題號：</label>
                      <select
                        value={selectedIccItem}
                        onChange={(e) => setSelectedIccItem(e.target.value)}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-5xs font-extrabold cursor-pointer focus:border-accentViolet outline-none"
                      >
                        {itemNames.map(name => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Canvas 畫布 */}
                  <div className="relative rounded-2xl border border-slate-800 overflow-hidden bg-slate-950">
                    <canvas ref={iccCanvasRef}></canvas>
                  </div>
                  
                  <div className="text-5xs text-slate-500 leading-relaxed text-center font-medium">
                    * 曲線反映該試題在不同數學能力（<span className="font-serif italic font-bold text-indigo-400">θ</span> 從 -3 到 +3）的答對機率。當學生能力與難度 <span className="font-serif italic font-bold text-slate-300">b</span> 相等時，答對機率精確為 0.5。斜率大小代表鑑別度 <span className="font-serif italic font-bold text-slate-300">a</span>。
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* CDM 面板 */}
          {activeTab === 'cdm' && cdmResults && (
            <div className="space-y-8 animate-fade-in">
              
              {/* 頂部：班級屬性精熟比率 */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-white flex items-center space-x-1.5">
                  <CheckCircle2 size={14} className="text-accentEmerald" />
                  <span>全班認知屬性整體精熟度分析 (Mastery Percentages)</span>
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {cdmResults.classMasteryPercentages.map((attr, idx) => (
                    <div key={attr.attribute} className="bg-slate-950/40 border border-slate-800 rounded-2xl p-4 flex flex-col space-y-2">
                      <span className="text-4xs font-bold text-slate-300 truncate">A{idx + 1}: {attr.attribute}</span>
                      
                      {/* 自訂進度條 */}
                      <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                        <div 
                          className="bg-gradient-to-r from-accentEmerald to-indigo-500 h-full rounded-full"
                          style={{ width: `${attr.percentage}%` }}
                        ></div>
                      </div>

                      <div className="flex items-center justify-between text-5xs font-bold">
                        <span className="text-slate-500">掌握率</span>
                        <span className="text-accentEmerald">{attr.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 下半部分：個別學生診斷 */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* 學生列表選擇 */}
                <div className="lg:col-span-5 space-y-3">
                  <span className="text-4xs font-bold text-slate-400 block uppercase tracking-wider">選擇學生查看個別診斷</span>
                  <div className="overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/40 max-h-[300px] text-2xs font-semibold">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 sticky top-0">
                        <tr>
                          <th className="p-2.5 text-center">學生代碼</th>
                          <th className="p-2.5 text-center text-accentEmerald">精熟向量 [A1,A2,A3,A4]</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-200">
                        {cdmResults.studentProfiles.map((st, idx) => (
                          <tr 
                            key={st.studentId}
                            onClick={() => setSelectedStudentIdx(idx)}
                            className={`cursor-pointer hover:bg-slate-900/40 transition-colors ${
                              selectedStudentIdx === idx ? 'bg-emerald-500/10' : ''
                            }`}
                          >
                            <td className="p-2.5 text-center font-bold flex items-center justify-center space-x-1.5">
                              <span>{st.studentId}</span>
                              {selectedStudentIdx === idx && <ChevronRight size={10} className="text-accentEmerald animate-bounce-right" />}
                            </td>
                            <td className="p-2.5 text-center font-bold text-accentEmerald">{st.profileString}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 點選學生的詳細屬性圖表與補救教學建議 */}
                <div className="lg:col-span-7 bg-slate-950/40 border border-slate-800 rounded-3xl p-6 flex flex-col space-y-5">
                  <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-white flex items-center space-x-1.5">
                        <Award size={13} className="text-accentEmerald" />
                        <span>學生 S{selectedStudentIdx + 1} 認知屬性診斷報告</span>
                      </h4>
                      <span className="text-5xs text-slate-400 font-medium block">基於 DINA 模型最大概似狀態向量檢索</span>
                    </div>

                    <span className="px-2.5 py-1 rounded-xl bg-accentEmerald/15 text-accentEmerald border border-accentEmerald/30 text-5xs font-black">
                      診斷狀態: {cdmResults.studentProfiles[selectedStudentIdx]?.profileString}
                    </span>
                  </div>

                  {/* 屬性掌握詳情與雷達圖對照 (雙欄佈局) */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    
                    {/* 左側：精熟掌握度清單 */}
                    <div className="md:col-span-5 space-y-2.5">
                      <span className="text-4xs font-bold text-slate-400 uppercase block tracking-wider">認知屬性掌握</span>
                      <div className="space-y-2">
                        {attributeNames.map((name, k) => {
                          const isMastered = cdmResults.studentProfiles[selectedStudentIdx]?.profile[k] === 1;
                          return (
                            <div key={name} className="flex items-center justify-between bg-slate-950/80 border border-slate-800/80 rounded-xl px-3 py-2 text-3xs font-semibold">
                              <span className="text-slate-200 truncate max-w-[110px]" title={`A${k+1}: ${name}`}>
                                A{k+1}: {name}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[8px] font-black ${
                                isMastered 
                                  ? 'bg-accentEmerald/10 text-accentEmerald border border-accentEmerald/20' 
                                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
                              }`}>
                                {isMastered ? '精熟' : '未精熟'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 右側：Canvas 雷達圖 */}
                    <div className="md:col-span-7 flex flex-col items-center justify-center">
                      <div className="relative rounded-2xl border border-slate-800/60 overflow-hidden bg-slate-950/80 p-2 shadow-inner">
                        <canvas ref={cdmRadarCanvasRef}></canvas>
                      </div>
                      <span className="text-[9px] text-slate-500 font-bold mt-2">
                        全班平均掌握度 (綠) vs 個別學生成就向量 (紫)
                      </span>
                    </div>

                  </div>

                  {/* 專屬 AI 診斷與補救方針 */}
                  <div className="bg-accentEmerald/5 border border-accentEmerald/20 rounded-2xl p-4 space-y-1.5">
                    <span className="text-3xs font-extrabold text-accentEmerald flex items-center space-x-1">
                      <Sparkles size={11} className="animate-spin-slow" />
                      <span>個別化學習補救方針 (Remedial Action Plan)</span>
                    </span>
                    <p className="text-4xs text-slate-300 leading-relaxed font-bold">
                      {cdmResults.studentProfiles[selectedStudentIdx]?.advice}
                    </p>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  )}

      {/* ====================================================================== */}
      {/* 4. A4 印表級 APA 學術測驗分析報告 container (Hidden on screen, shown in print) */}
      {/* ====================================================================== */}
      <div id="print-academic-report-container" className="hidden print:block p-10 bg-white text-black font-sans leading-relaxed text-sm">
        
        {/* 第一頁：封面與研究概述 */}
        <div className="print-break-page flex flex-col justify-between min-h-[1050px] pb-10">
          <div className="space-y-8">
            <div className="border-b-4 border-black pb-4 text-center">
              <h1 className="text-3xl font-black uppercase tracking-widest text-black">
                大考試卷測驗學術診斷分析報告
              </h1>
              <p className="text-base font-bold text-gray-700 mt-2">
                古典測驗理論 (CTT) · 項目反應理論 (IRT) · 認知診斷模型 (CDM) 聯合診斷
              </p>
            </div>

            <div className="my-10 space-y-4">
              <h3 className="text-lg font-bold border-b border-black pb-1">一、 研究背景與設計</h3>
              <p className="text-xs text-gray-800 leading-relaxed">
                本報告採用教育與心理計量學三大核心模型 (CTT / IRT / CDM)，對該測驗試卷進行全方位的項目分析與考生能力鑑定。本測驗包含 <b>{itemNames.length} 道典型學術試題</b>（試題代碼：{itemNames.join('、')}），受測樣本數為 <b>{responseMatrix.length} 位考生</b>。其中，針對認知診斷模型 (CDM) 引入了 <b>{attributeNames.length} 個核心學術認知屬性</b>，藉此獲得比傳統分數更為精準的認知精熟剖面分析，為後續教育決策與適性教學補救提供精確指引。
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold border-b border-black pb-1">二、 測驗信度統計概述</h3>
              <p className="text-xs text-gray-800 leading-relaxed">
                測驗的一致性是測量效力的基石。在本二元作答反應矩陣中，信度指標分析如下：
              </p>
              
              {/* 信度三線表 */}
              <table className="w-full text-center border-t-2 border-b-2 border-black border-collapse text-xs font-semibold my-4">
                <thead>
                  <tr className="border-b border-black bg-gray-100">
                    <th className="p-2">信度估計方法</th>
                    <th className="p-2">信度係數值</th>
                    <th className="p-2">學術評價</th>
                  </tr>
                </thead>
                <tbody>
                  {cttResults && (
                    <>
                      <tr>
                        <td className="p-2 font-bold">庫李信度 (KR-20)</td>
                        <td className="p-2">{(cttResults.kr20).toFixed(3)}</td>
                        <td className="p-2">{cttResults.kr20 >= 0.70 ? '內部一致性極佳' : '內部一致性普通'}</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold">Cronbach\'s Alpha 一致性係數</td>
                        <td className="p-2">{(cttResults.cronbachAlpha).toFixed(3)}</td>
                        <td className="p-2">{cttResults.cronbachAlpha >= 0.70 ? '符合學術標準' : '尚可'}</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold">斯皮爾曼-布朗折半校正信度</td>
                        <td className="p-2">{(cttResults.splitHalf).toFixed(3)}</td>
                        <td className="p-2">{cttResults.splitHalf >= 0.70 ? '折半穩定性優異' : '折半穩定性普通'}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="text-center text-xs text-gray-500 font-bold border-t border-gray-300 pt-3">
            報告產出日期：{new Date().toLocaleDateString('zh-TW')} · 線上智慧統計分析平台 (ai-statistics-act)
          </div>
        </div>

        {/* 第二頁：CTT 與 IRT 項目分析 */}
        <div className="print-break-page flex flex-col justify-between min-h-[1050px] pb-10">
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-bold border-b border-black pb-1">三、 試題分析報告：CTT 與 IRT 參數雙向比對</h3>
              <p className="text-xs text-gray-800 leading-relaxed mt-2">
                古典測驗理論 (CTT) 與項目反應理論 (IRT) 之雙參數邏輯斯模型 (2PL) 對應指標如下表所示。本表展現每道試題難度及鑑別力指標之高度學術價值：
              </p>

              {/* 雙向三線表 */}
              <table className="w-full text-center border-t-2 border-b-2 border-black border-collapse text-xs font-semibold my-4">
                <thead>
                  <tr className="border-b border-black bg-gray-100">
                    <th className="p-2">題號</th>
                    <th className="p-2 text-left">試題測量概念</th>
                    <th className="p-2">CTT 難度 (p)</th>
                    <th className="p-2">CTT 鑑別度 (D)</th>
                    <th className="p-2">IRT 鑑別度 (a)</th>
                    <th className="p-2">IRT 難度 (b)</th>
                    <th className="p-2">項目品質評判</th>
                  </tr>
                </thead>
                <tbody>
                  {cttResults && irtResults && cttResults.itemDetails.map((item, idx) => {
                    const irtItem = irtResults.itemDetails[idx];
                    return (
                      <tr key={item.item}>
                        <td className="p-2 font-bold">{item.item}</td>
                        <td className="p-2 text-left text-gray-600">{itemDescriptions[item.item] || '未設定描述'}</td>
                        <td className="p-2">{(item.difficulty).toFixed(2)}</td>
                        <td className="p-2 font-bold">{(item.discrimination).toFixed(2)}</td>
                        <td className="p-2">{(irtItem?.a ?? 0).toFixed(2)}</td>
                        <td className="p-2">{(irtItem?.b ?? 0).toFixed(2)}</td>
                        <td className="p-2 font-bold">{item.verdict}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold border-b border-black pb-1">四、 項目反應理論 (IRT) 考生能力估計</h3>
              <p className="text-xs text-gray-800 leading-relaxed">
                利用雙參數邏輯斯模型 (2PL)，將考生原始答對分數轉換為潛在數學能力值 (<span className="font-serif italic font-bold text-black">θ</span>)，以最大概似法估計（加上貝氏 MAP 先前權重校正），考生能力與相對排名如下表所示：
              </p>
              
              {/* 學生能力三線表 */}
              <table className="w-full text-center border-t-2 border-b-2 border-black border-collapse text-xs font-semibold my-4">
                <thead>
                  <tr className="border-b border-black bg-gray-100">
                    <th className="p-2">學術排名</th>
                    <th className="p-2">考生代號</th>
                    <th className="p-2">原始得分</th>
                    <th className="p-2">潛在能力值 (θ)</th>
                    <th className="p-2">學習狀態判定</th>
                  </tr>
                </thead>
                <tbody>
                  {irtResults && irtResults.sortedStudents.map((st, idx) => (
                    <tr key={st.studentId}>
                      <td className="p-2 font-bold">{idx + 1}</td>
                      <td className="p-2">{st.studentId}</td>
                      <td className="p-2">{st.score}</td>
                      <td className="p-2 font-bold">{st.theta >= 0 ? `+${st.theta.toFixed(2)}` : st.theta.toFixed(2)}</td>
                      <td className="p-2">
                        {st.theta >= 1.0 ? '優異 (Highly Advanced)' : st.theta >= -0.5 ? '中等偏上 (Competent)' : '需高度補強 (Remedial Required)'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="text-center text-xs text-gray-500 font-bold border-t border-gray-300 pt-3">
            報告產出日期：{new Date().toLocaleDateString('zh-TW')} · 線上智慧統計分析平台 (ai-statistics-act)
          </div>
        </div>

        {/* 第三頁：認知診斷分析報告 */}
        <div className="print-break-page flex flex-col justify-between min-h-[1050px] pb-10">
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-bold border-b border-black pb-1">五、 認知診斷模型 (CDM) DINA 診斷報告</h3>
              <p className="text-xs text-gray-800 leading-relaxed mt-2">
                認知診斷模型能夠對考生的認知屬性進行二元診斷（1: 精熟, 0: 未精熟）。以下為全體考生的屬性掌握向量診斷表：
              </p>

              {/* 學生 CDM 三線表 */}
              <table className="w-full text-center border-t-2 border-b-2 border-black border-collapse text-xs font-semibold my-4">
                <thead>
                  <tr className="border-b border-black bg-gray-100">
                    <th className="p-2">學生代號</th>
                    <th className="p-2">精熟屬性向量 [{attributeNames.map((_, idx) => `A${idx+1}`).join(', ')}]</th>
                    <th className="p-2 text-left">學習診斷與精熟特徵</th>
                    <th className="p-2 text-left">課後補救教學建議</th>
                  </tr>
                </thead>
                <tbody>
                  {cdmResults && cdmResults.studentProfiles.map((st) => (
                    <tr key={st.studentId}>
                      <td className="p-2 font-bold">{st.studentId}</td>
                      <td className="p-2 font-bold text-gray-800">{st.profileString}</td>
                      <td className="p-2 text-left text-gray-600 font-medium">
                        {st.profile.reduce((sum, v) => sum + v, 0) === attributeNames.length 
                          ? '完全精熟各向度概念' 
                          : `已掌握 ${st.profile.reduce((sum, v) => sum + v, 0)} 個學科向度`}
                      </td>
                      <td className="p-2 text-left text-xs text-gray-600 font-bold">{st.advice}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold border-b border-black pb-1">六、 教師整體班級補救教學指引</h3>
              <p className="text-xs text-gray-800 leading-relaxed">
                全體學生在各學科屬性上的整體精熟率統計如下，可作為授課教師調整後續複習與出題重心的依據：
              </p>

              {/* 班級精熟比率表 */}
              <table className="w-full text-center border-t-2 border-b-2 border-black border-collapse text-xs font-semibold my-4">
                <thead>
                  <tr className="border-b border-black bg-gray-100">
                    <th className="p-2">學科認知屬性</th>
                    <th className="p-2">班級掌握比率</th>
                    <th className="p-2 text-left">教師教學建議方針</th>
                  </tr>
                </thead>
                <tbody>
                  {cdmResults && cdmResults.classMasteryPercentages.map((attr, idx) => (
                    <tr key={attr.attribute}>
                      <td className="p-2 font-bold text-left">A{idx + 1}: {attr.attribute}</td>
                      <td className="p-2 font-extrabold">{attr.percentage}%</td>
                      <td className="p-2 text-left text-gray-600 font-medium">
                        {attr.percentage >= 70 
                          ? '多數學生已精熟，課堂可以進行更深度的進階難題解析。' 
                          : attr.percentage >= 40
                          ? '部分學生存在概念盲點，應安排專題小組輔導或進行課堂概念回顧。'
                          : '該屬性精熟度低！屬於班級整體重災區，建議教師重新撥出課堂時數進行基礎奠定與觀念重講。'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="text-center text-xs text-gray-500 font-bold border-t border-gray-300 pt-3">
            報告產出日期：{new Date().toLocaleDateString('zh-TW')} · 線上智慧統計分析平台 (ai-statistics-act)
          </div>
        </div>

      </div>

    </div>
  );
}
