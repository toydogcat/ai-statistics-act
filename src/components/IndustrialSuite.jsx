import { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import { 
  calculateSPC, 
  calculatePCA, 
  calculateGageRR, 
  calculateSamplingPlan,
  calculateHotellingT2,
  calculateDoubleSamplingPlan,
  calculateFactorialDOE
} from '../utils/industrialEngine';
import { 
  Activity, Settings, Award, AlertTriangle, FileText, 
  Database, RefreshCw, BarChart2, Plus, Trash2, ShieldAlert,
  Layout, Upload, HelpCircle
} from 'lucide-react';

// --- Static Mock Datasets ---
const MOCK_DATASETS = {
  bearing: {
    name: "軸承外徑量測數據 (計量型 X-bar & R/s, PCA)",
    description: "20 組子群，每組 5 個觀測值（Subgroup Size = 5），用於監控精密軸承外徑尺寸（規格：12.00 ± 0.05 mm）。",
    subgroupSize: 5,
    chartType: "xbar-r",
    usl: 12.05,
    lsl: 11.95,
    target: 12.00,
    data: [
      12.01, 12.02, 11.99, 12.00, 12.01, // Subgroup 1
      12.03, 12.01, 12.02, 11.98, 12.01, // Subgroup 2
      11.99, 12.00, 12.01, 11.97, 11.99, // Subgroup 3
      12.02, 12.04, 12.01, 12.00, 12.03, // Subgroup 4
      12.00, 11.99, 12.02, 12.01, 12.00, // Subgroup 5
      12.01, 12.03, 12.00, 12.02, 12.01, // Subgroup 6
      11.98, 12.00, 11.99, 12.01, 12.00, // Subgroup 7
      12.03, 12.02, 12.04, 12.01, 12.02, // Subgroup 8
      12.00, 12.01, 11.99, 11.98, 12.00, // Subgroup 9
      12.01, 12.02, 12.01, 12.03, 12.02, // Subgroup 10
      12.04, 12.03, 12.05, 12.02, 12.03, // Subgroup 11 (slightly high)
      12.02, 12.01, 12.00, 12.01, 12.02, // Subgroup 12
      11.99, 11.98, 11.97, 12.00, 11.99, // Subgroup 13
      12.01, 12.02, 12.00, 12.01, 12.00, // Subgroup 14
      12.00, 11.99, 12.01, 12.02, 12.01, // Subgroup 15
      12.02, 12.03, 12.01, 12.02, 12.04, // Subgroup 16
      11.99, 12.00, 11.98, 12.01, 12.00, // Subgroup 17
      12.01, 12.02, 12.03, 12.00, 12.01, // Subgroup 18
      12.05, 12.06, 12.04, 12.03, 12.05, // Subgroup 19 (Violating UCL!)
      12.01, 12.02, 11.99, 12.00, 12.01  // Subgroup 20
    ]
  },
  wafer: {
    name: "半導體晶圓不良數統計 (計數型 p/np 管制圖)",
    description: "20 個晶圓批次，每批次抽樣檢驗 100 片（Subgroup Size = 100），統計發現的瑕疵晶圓數量。",
    subgroupSize: 100,
    chartType: "p",
    usl: null,
    lsl: null,
    target: null,
    data: [4, 6, 3, 5, 2, 8, 14, 5, 4, 3, 2, 1, 6, 7, 5, 4, 3, 5, 15, 4] // Batch 7 (14) and 19 (15) are high
  },
  fabric: {
    name: "織物表面瑕疵統計 (計數型 c/u 管制圖)",
    description: "20 卷固定長度織物，抽樣面積相同（Subgroup Size = 1），計算每卷織物上的瑕疵缺點總數。",
    subgroupSize: 1,
    chartType: "c",
    usl: null,
    lsl: null,
    target: null,
    data: [3, 2, 1, 4, 0, 8, 2, 1, 3, 2, 5, 1, 0, 2, 3, 4, 2, 1, 9, 3] // Roll 6 (8) and 19 (9) are high
  },
  chemicals: {
    name: "化學製程濃度監控 (進階 EWMA/CUSUM)",
    description: "Douglas C. Montgomery《統計品質管制》範例：針對化學濃度微小位移進行監控，適用於偵測 1 sigma 以內的製程偏移。",
    subgroupSize: 1,
    chartType: "ewma",
    usl: null,
    lsl: null,
    target: 10.0,
    data: [
      9.45, 7.99, 9.29, 11.66, 12.16, 10.18, 8.04, 11.46, 9.20, 10.34,
      9.03, 11.47, 10.51, 9.40, 10.08, 9.37, 10.62, 10.31, 10.00, 10.45,
      10.88, 11.02, 11.50, 12.05, 11.90, 12.20, 12.50, 12.30, 12.80, 13.10 // Shifts after point 20
    ]
  },
  piston: {
    name: "活塞環厚度量具 R&R 研究數據 (量具重複性與再現性)",
    description: "經典 AIAG 量具研究數據：3 名操作員（Operator A, B, C）對 10 個零件（Part 1-10）進行 3 次試驗（Trial 1-3）的測量值。",
    data: [
      // Operator A
      { operator: "A", part: "1", trial: 1, val: 10.02 },
      { operator: "A", part: "1", trial: 2, val: 10.01 },
      { operator: "A", part: "1", trial: 3, val: 10.02 },
      { operator: "A", part: "2", trial: 1, val: 10.04 },
      { operator: "A", part: "2", trial: 2, val: 10.03 },
      { operator: "A", part: "2", trial: 3, val: 10.05 },
      { operator: "A", part: "3", trial: 1, val: 9.98 },
      { operator: "A", part: "3", trial: 2, val: 9.99 },
      { operator: "A", part: "3", trial: 3, val: 9.98 },
      { operator: "A", part: "4", trial: 1, val: 10.01 },
      { operator: "A", part: "4", trial: 2, val: 10.00 },
      { operator: "A", part: "4", trial: 3, val: 10.01 },
      { operator: "A", part: "5", trial: 1, val: 10.03 },
      { operator: "A", part: "5", trial: 2, val: 10.03 },
      { operator: "A", part: "5", trial: 3, val: 10.02 },
      { operator: "A", part: "6", trial: 1, val: 10.02 },
      { operator: "A", part: "6", trial: 2, val: 10.01 },
      { operator: "A", part: "6", trial: 3, val: 10.02 },
      { operator: "A", part: "7", trial: 1, val: 10.00 },
      { operator: "A", part: "7", trial: 2, val: 9.99 },
      { operator: "A", part: "7", trial: 3, val: 10.01 },
      { operator: "A", part: "8", trial: 1, val: 9.97 },
      { operator: "A", part: "8", trial: 2, val: 9.98 },
      { operator: "A", part: "8", trial: 3, val: 9.97 },
      { operator: "A", part: "9", trial: 1, val: 10.05 },
      { operator: "A", part: "9", trial: 2, val: 10.04 },
      { operator: "A", part: "9", trial: 3, val: 10.06 },
      { operator: "A", part: "10", trial: 1, val: 10.01 },
      { operator: "A", part: "10", trial: 2, val: 10.02 },
      { operator: "A", part: "10", trial: 3, val: 10.01 },

      // Operator B
      { operator: "B", part: "1", trial: 1, val: 10.01 },
      { operator: "B", part: "1", trial: 2, val: 10.02 },
      { operator: "B", part: "1", trial: 3, val: 10.01 },
      { operator: "B", part: "2", trial: 1, val: 10.03 },
      { operator: "B", part: "2", trial: 2, val: 10.02 },
      { operator: "B", part: "2", trial: 3, val: 10.03 },
      { operator: "B", part: "3", trial: 1, val: 9.99 },
      { operator: "B", part: "3", trial: 2, val: 9.98 },
      { operator: "B", part: "3", trial: 3, val: 9.99 },
      { operator: "B", part: "4", trial: 1, val: 10.02 },
      { operator: "B", part: "4", trial: 2, val: 10.01 },
      { operator: "B", part: "4", trial: 3, val: 10.01 },
      { operator: "B", part: "5", trial: 1, val: 10.04 },
      { operator: "B", part: "5", trial: 2, val: 10.03 },
      { operator: "B", part: "5", trial: 3, val: 10.03 },
      { operator: "B", part: "6", trial: 1, val: 10.01 },
      { operator: "B", part: "6", trial: 2, val: 10.00 },
      { operator: "B", part: "6", trial: 3, val: 10.01 },
      { operator: "B", part: "7", trial: 1, val: 9.99 },
      { operator: "B", part: "7", trial: 2, val: 10.00 },
      { operator: "B", part: "7", trial: 3, val: 9.99 },
      { operator: "B", part: "8", trial: 1, val: 9.98 },
      { operator: "B", part: "8", trial: 2, val: 9.97 },
      { operator: "B", part: "8", trial: 3, val: 9.98 },
      { operator: "B", part: "9", trial: 1, val: 10.04 },
      { operator: "B", part: "9", trial: 2, val: 10.05 },
      { operator: "B", part: "9", trial: 3, val: 10.04 },
      { operator: "B", part: "10", trial: 1, val: 10.00 },
      { operator: "B", part: "10", trial: 2, val: 10.01 },
      { operator: "B", part: "10", trial: 3, val: 10.00 },

      // Operator C
      { operator: "C", part: "1", trial: 1, val: 10.02 },
      { operator: "C", part: "1", trial: 2, val: 10.02 },
      { operator: "C", part: "1", trial: 3, val: 10.01 },
      { operator: "C", part: "2", trial: 1, val: 10.04 },
      { operator: "C", part: "2", trial: 2, val: 10.04 },
      { operator: "C", part: "2", trial: 3, val: 10.03 },
      { operator: "C", part: "3", trial: 1, val: 9.98 },
      { operator: "C", part: "3", trial: 2, val: 9.99 },
      { operator: "C", part: "3", trial: 3, val: 9.99 },
      { operator: "C", part: "4", trial: 1, val: 10.01 },
      { operator: "C", part: "4", trial: 2, val: 10.01 },
      { operator: "C", part: "4", trial: 3, val: 10.02 },
      { operator: "C", part: "5", trial: 1, val: 10.03 },
      { operator: "C", part: "5", trial: 2, val: 10.02 },
      { operator: "C", part: "5", trial: 3, val: 10.03 },
      { operator: "C", part: "6", trial: 1, val: 10.02 },
      { operator: "C", part: "6", trial: 2, val: 10.01 },
      { operator: "C", part: "6", trial: 3, val: 10.02 },
      { operator: "C", part: "7", trial: 1, val: 10.00 },
      { operator: "C", part: "7", trial: 2, val: 10.00 },
      { operator: "C", part: "7", trial: 3, val: 10.00 },
      { operator: "C", part: "8", trial: 1, val: 9.97 },
      { operator: "C", part: "8", trial: 2, val: 9.98 },
      { operator: "C", part: "8", trial: 3, val: 9.97 },
      { operator: "C", part: "9", trial: 1, val: 10.05 },
      { operator: "C", part: "9", trial: 2, val: 10.04 },
      { operator: "C", part: "9", trial: 3, val: 10.05 },
      { operator: "C", part: "10", trial: 1, val: 10.01 },
      { operator: "C", part: "10", trial: 2, val: 10.02 },
      { operator: "C", part: "10", trial: 3, val: 10.01 }
    ]
  },
  multivariate: {
    name: "多維電子元件監控 (Hotelling T2)",
    description: "同時監控電阻 (x1) 與電容 (x2)。單獨看可能正常，但在多維空間中可能偏離中心。",
    data: [
      [10.1, 5.2], [10.2, 5.1], [10.0, 5.3], [10.5, 5.5], [10.1, 5.2],
      [10.3, 5.4], [10.2, 5.2], [10.1, 5.1], [10.4, 5.3], [10.2, 5.2],
      [10.8, 5.9], [10.9, 6.1], [11.5, 6.5], [10.2, 5.2]
    ]
  },
  doe: {
    name: "化學產率優化實驗 (2^2 Factorial)",
    description: "因子 A (溫度) 與因子 B (壓力)。找出對產率影響最顯著的關鍵因素。",
    factors: [{name: '溫度'}, {name: '壓力'}],
    data: [
      {run: [-1, -1], response: 40},
      {run: [1, -1], response: 55},
      {run: [-1, 1], response: 42},
      {run: [1, 1], response: 60}
    ]
  },
  sampling: {
    name: "電子零件進料檢驗 (Sampling Plan)",
    description: "針對大批量進料 (N=5000) 的抽樣計畫。設定 AQL 與 LTPD 門檻以評估風險。",
    N: 5000,
    n1: 80,
    c1: 2,
    isDouble: true,
    n2: 80,
    c2: 5
  }
};

export default function IndustrialSuite() {
  const [activeTab, setActiveTab] = useState('spc'); // 'spc' | 'multivariate' | 'pca' | 'grr' | 'sampling' | 'doe'
  
  // --- SPC & PCA State ---
  const [spcChartType, setSpcChartType] = useState('xbar-r'); 
  const [subgroupSize, setSubgroupSize] = useState(5);
  const [usl, setUsl] = useState(12.05);
  const [lsl, setLsl] = useState(11.95);
  const [pcaTarget, setPcaTarget] = useState(12.00);
  const [pcaSubgroupSize, setPcaSubgroupSize] = useState(5);

  // Advanced parameters for EWMA / CUSUM
  const [lambda, setLambda] = useState(0.1);
  const [delta, setDelta] = useState(1.0);

  // --- Multivariate State ---
  const [mvValues, setMvValues] = useState([[10.1, 5.2], [10.2, 5.1], [10.0, 5.3], [10.5, 5.5], [10.1, 5.2]]);

  // --- Sampling Plan State ---
  const [sampN, setSampN] = useState(1000);
  const [samp_n, setSamp_n] = useState(50);
  const [samp_c, setSamp_c] = useState(2);
  const [isDoubleSampling, setIsDoubleSampling] = useState(false);
  const [samp_n2, setSamp_n2] = useState(50);
  const [samp_c2, setSamp_c2] = useState(4);
  
  // --- DOE State ---
  const [doeFactors, setDoeFactors] = useState([{name: '溫度'}, {name: '壓力'}]);
  const [doeData, setDoeData] = useState([
    {run: [-1, -1], response: 40},
    {run: [1, -1], response: 55},
    {run: [-1, 1], response: 42},
    {run: [1, 1], response: 60}
  ]);

  // Custom manual data lists
  const [spcRawInput, setSpcRawInput] = useState('');
  const [spcValues, setSpcValues] = useState([]);
  
  // --- Gage R&R State ---
  const [grrRows, setGrrRows] = useState([]);
  const [newOp, setNewOp] = useState('A');
  const [newPart, setNewPart] = useState('1');
  const [newTrial, setNewTrial] = useState(1);
  const [newVal, setNewVal] = useState('');

  // --- Canvas Refs ---
  const spcPrimaryCanvasRef = useRef(null);
  const spcSecondaryCanvasRef = useRef(null);
  const pcaHistogramCanvasRef = useRef(null);
  const samplingCanvasRef = useRef(null);
  const multivariateCanvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Initialize with bearing dataset on mount
  useEffect(() => {
    loadMockDataset('bearing');
  }, []);

  // Redraw canvases when values, parameters, or tabs change
  useEffect(() => {
    if (activeTab === 'spc') {
      drawSPCOnCanvas();
    } else if (activeTab === 'pca') {
      drawPCAHistogram();
    } else if (activeTab === 'sampling') {
      drawSamplingOC();
    } else if (activeTab === 'multivariate') {
      drawMultivariateT2();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, spcValues, spcChartType, subgroupSize, usl, lsl, pcaTarget, pcaSubgroupSize, lambda, delta, sampN, samp_n, samp_c, isDoubleSampling, samp_n2, samp_c2, mvValues]);

  // Load a mock dataset helper
  function loadMockDataset(key) {
    const ds = MOCK_DATASETS[key];
    if (!ds) return;

    if (key === 'piston') {
      setGrrRows(ds.data);
      setActiveTab('grr');
    } else if (key === 'multivariate') {
      setMvValues(ds.data);
      setActiveTab('multivariate');
    } else if (key === 'doe') {
      setDoeFactors(ds.factors);
      setDoeData(ds.data);
      setActiveTab('doe');
    } else if (key === 'sampling') {
      setSampN(ds.N);
      setSamp_n(ds.n1);
      setSamp_c(ds.c1);
      setIsDoubleSampling(ds.isDouble);
      setSamp_n2(ds.n2);
      setSamp_c2(ds.c2);
      setActiveTab('sampling');
    } else {
      setSpcValues(ds.data);
      setSpcRawInput(ds.data.join(', '));
      setSubgroupSize(ds.subgroupSize);
      setPcaSubgroupSize(ds.subgroupSize);
      setSpcChartType(ds.chartType);
      if (ds.usl !== null && ds.usl !== undefined) {
        setUsl(ds.usl);
        setLsl(ds.lsl);
        setPcaTarget(ds.target);
      } else if (ds.target !== null && ds.target !== undefined) {
        setPcaTarget(ds.target);
      }
      setActiveTab('spc');
    }
  }

  function handleUpdateSpcValues() {
    const vals = spcRawInput
      .split(/[\s,;\n]+/)
      .map(v => parseFloat(v))
      .filter(v => !isNaN(v));
    setSpcValues(vals);
  }

  function handleCsvUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data;
        if (rows.length === 0) return;

        if (activeTab === 'spc' || activeTab === 'pca') {
          const vals = rows.flat().map(v => parseFloat(v)).filter(v => !isNaN(v));
          setSpcValues(vals);
          setSpcRawInput(vals.join(', '));
        } else if (activeTab === 'multivariate') {
          const matrix = rows.map(r => r.map(v => parseFloat(v)).filter(v => !isNaN(v))).filter(r => r.length > 0);
          if (matrix.length > 0) setMvValues(matrix);
        } else if (activeTab === 'grr') {
          const grrData = rows.map(r => ({
            operator: r[0],
            part: r[1],
            trial: parseInt(r[2]),
            val: parseFloat(r[3])
          })).filter(r => !isNaN(r.val));
          if (grrData.length > 0) setGrrRows(grrData);
        } else if (activeTab === 'doe') {
          const doe = rows.map(r => ({
            run: r.slice(0, -1).map(v => parseFloat(v)),
            response: parseFloat(r[r.length - 1])
          })).filter(r => !isNaN(r.response));
          if (doe.length > 0) setDoeData(doe);
        }
      }
    });
    e.target.value = '';
  }

  // --- 0. Draw Multivariate T2 Chart ---
  function drawMultivariateT2() {
    const res = calculateHotellingT2(mvValues);
    if (!res || res.error) return;

    const canvas = multivariateCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.clientWidth || 600;
    const height = 300;
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    const pts = res.primary.points;
    const paddingLeft = 55;
    const paddingRight = 85;
    const paddingTop = 40;
    const paddingBottom = 40;
    const graphWidth = width - paddingLeft - paddingRight;
    const graphHeight = height - paddingTop - paddingBottom;

    const minY = 0;
    const maxY = Math.max(res.primary.ucl, ...pts.map(p => p.val)) * 1.2;

    const getX = (idx) => paddingLeft + (idx / (pts.length - 1 || 1)) * graphWidth;
    const getY = (val) => paddingTop + graphHeight - ((val - minY) / (maxY - minY)) * graphHeight;

    // Draw UCL
    const yUcl = getY(res.primary.ucl);
    ctx.strokeStyle = '#f43f5e';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(paddingLeft, yUcl);
    ctx.lineTo(width - paddingRight, yUcl);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#f43f5e';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText(`UCL: ${res.primary.ucl.toFixed(2)}`, width - paddingRight + 5, yUcl + 3);

    // Draw Line
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    pts.forEach((p, i) => {
      const x = getX(i);
      const y = getY(p.val);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw Points
    pts.forEach((p) => {
      const x = getX(pts.indexOf(p));
      const y = getY(p.val);
      ctx.fillStyle = p.out ? '#ef4444' : '#6366f1';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText("Hotelling T² 管制圖 (多變量分析)", paddingLeft, 25);
  }

  // --- 1. Draw SPC Control Charts on programmatically program-scaled Canvases ---
  function drawSPCOnCanvas() {
    if (spcValues.length === 0) return;
    const res = calculateSPC(spcValues, spcChartType, subgroupSize, { lambda, delta });
    if (!res || res.error) return;

    function renderSingle(canvas, pInfo) {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const width = canvas.parentElement.clientWidth || 600;
      const height = 220;
      const dpr = window.devicePixelRatio || 1;
      
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);

      // Clean Canvas with transparent fill
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#0f172a'; // slate-900 background
      ctx.fillRect(0, 0, width, height);

      const pts = pInfo.points;
      if (pts.length === 0) return;

      const paddingLeft = 55;
      const paddingRight = 85;
      const paddingTop = 30;
      const paddingBottom = 30;

      const graphWidth = width - paddingLeft - paddingRight;
      const graphHeight = height - paddingTop - paddingBottom;

      // Extract values to scale y-axis
      const validVals = pts.map(p => p.val).filter(v => v !== null && v !== undefined);
      if (spcChartType === 'cusum') {
        pts.forEach(p => { if (p.valLow !== undefined) validVals.push(p.valLow); });
      }
      const allYLimits = [pInfo.ucl, pInfo.cl, pInfo.lcl, ...validVals].filter(v => v !== null && v !== undefined);
      let minY = Math.min(...allYLimits);
      let maxY = Math.max(...allYLimits);

      // Add a 10% padding buffer to Y limits
      const buffer = (maxY - minY) * 0.15 || 1.0;
      minY -= buffer;
      maxY += buffer;

      const getX = (idx) => paddingLeft + (idx / (pts.length - 1 || 1)) * graphWidth;
      const getY = (val) => {
        if (val === null || val === undefined) return 0;
        return paddingTop + graphHeight - ((val - minY) / (maxY - minY)) * graphHeight;
      };

      // Draw grid lines
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= 4; i++) {
        const yVal = minY + (i / 4) * (maxY - minY);
        const y = getY(yVal);
        ctx.beginPath();
        ctx.moveTo(paddingLeft, y);
        ctx.lineTo(width - paddingRight, y);
        ctx.stroke();

        // Draw left axis tick labels
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(yVal.toFixed(3), paddingLeft - 8, y + 3);
      }

      // Draw horizontal control limit lines
      const drawLimitLine = (yVal, label, color, isDashed = true) => {
        if (yVal === null || yVal === undefined) return;
        const y = getY(yVal);
        ctx.strokeStyle = color;
        ctx.lineWidth = isDashed ? 1.5 : 2;
        if (isDashed) {
          ctx.setLineDash([4, 4]);
        } else {
          ctx.setLineDash([]);
        }
        ctx.beginPath();
        ctx.moveTo(paddingLeft, y);
        ctx.lineTo(width - paddingRight, y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label on the right margin
        ctx.fillStyle = color;
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`${label}: ${yVal.toFixed(3)}`, width - paddingRight + 6, y + 3);
      };

      drawLimitLine(pInfo.ucl, "UCL", '#f43f5e', true);  // Rose-500
      drawLimitLine(pInfo.cl, "CL", '#10b981', false);   // Emerald-500
      drawLimitLine(pInfo.lcl, "LCL", '#f43f5e', true);

      // Draw process lines
      ctx.strokeStyle = '#6366f1'; // Indigo-500
      ctx.lineWidth = 2;
      ctx.beginPath();
      let first = true;
      pts.forEach((p, idx) => {
        if (p.val === null) return;
        const x = getX(idx);
        const y = getY(p.val);
        if (first) {
          ctx.moveTo(x, y);
          first = false;
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // If CUSUM, draw the lower line as well
      if (spcChartType === 'cusum' && pts[0].valLow !== undefined) {
        ctx.strokeStyle = '#ec4899'; // Pink-500
        ctx.lineWidth = 2;
        ctx.beginPath();
        first = true;
        pts.forEach((p, idx) => {
          if (p.valLow === null) return;
          const x = getX(idx);
          const y = getY(p.valLow);
          if (first) {
            ctx.moveTo(x, y);
            first = false;
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.stroke();
      }

      // Draw data points
      pts.forEach((p, idx) => {
        if (p.val === null) return;
        const x = getX(idx);
        const y = getY(p.val);

        if (p.out) {
          // Out of control glow red point
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#ef4444';
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0; // Reset shadow
          
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else {
          // Normal blue point
          ctx.fillStyle = '#6366f1';
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Draw valLow points for CUSUM
        if (spcChartType === 'cusum' && p.valLow !== undefined) {
          const yLow = getY(p.valLow);
          ctx.fillStyle = '#ec4899';
          ctx.beginPath();
          ctx.arc(x, yLow, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });

      // Draw Title on chart top-left
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(pInfo.title, paddingLeft, 18);
    }

    if (res.primary) {
      renderSingle(spcPrimaryCanvasRef.current, res.primary);
    }
    if (res.secondary) {
      renderSingle(spcSecondaryCanvasRef.current, res.secondary);
    }
  }

  // --- 2. Draw OC Curve for Acceptance Sampling ---
  function drawSamplingOC() {
    const res = samplingResults;
    if (!res) return;

    const canvas = samplingCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.clientWidth || 600;
    const height = 300;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    const paddingLeft = 60;
    const paddingRight = 40;
    const paddingTop = 40;
    const paddingBottom = 50;

    const graphWidth = width - paddingLeft - paddingRight;
    const graphHeight = height - paddingTop - paddingBottom;

    const pts = res.defectRates;
    const getX = (p) => paddingLeft + (p / 0.15) * graphWidth;
    const getY = (pa) => paddingTop + graphHeight - (pa * graphHeight);

    // Draw Grid
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 5; i++) {
      // Horizontal lines (Pa)
      const pa = i / 5;
      const y = getY(pa);
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(width - paddingRight, y);
      ctx.stroke();
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(pa.toFixed(1), paddingLeft - 8, y + 3);

      // Vertical lines (p)
      const p = (i / 5) * 0.15;
      const x = getX(p);
      ctx.beginPath();
      ctx.moveTo(x, paddingTop);
      ctx.lineTo(x, paddingTop + graphHeight);
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillText(p.toFixed(2), x, paddingTop + graphHeight + 15);
    }

    // Draw OC Curve
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    pts.forEach((pt, idx) => {
      const x = getX(pt.p);
      const y = getY(pt.pa);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Highlights: AQL and LTPD
    const drawHighlight = (pVal, paVal, label, color) => {
      const x = getX(pVal);
      const y = getY(paVal);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(x, y);
      ctx.lineTo(x, paddingTop + graphHeight);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(`${label} (${(pVal * 100).toFixed(1)}%)`, x, y - 10);
    };

    if (res.aql > 0) drawHighlight(res.aql, 0.95, "AQL", '#10b981');
    if (res.ltpd > 0) drawHighlight(res.ltpd, 0.10, "LTPD", '#f43f5e');

    // Axes Labels
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("批次不合格率 (p)", paddingLeft + graphWidth / 2, height - 10);
    ctx.save();
    ctx.translate(15, paddingTop + graphHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("允收機率 (Pa)", 0, 0);
    ctx.restore();

    ctx.textAlign = 'left';
    ctx.fillText(
      isDoubleSampling 
        ? `雙次抽樣 OC (n1=${samp_n}, c1=${samp_c}, n2=${samp_n2}, c2=${samp_c2})`
        : `單次抽樣 OC (n=${samp_n}, c=${samp_c})`, 
      paddingLeft, 25
    );
  }

  // --- 3. Draw Process Capability Histogram & Normal Distribution Overlay ---
  function drawPCAHistogram() {
    if (spcValues.length === 0 || usl === null || lsl === null) return;
    const res = calculatePCA(spcValues, usl, lsl, pcaTarget, pcaSubgroupSize);
    if (!res) return;

    const canvas = pcaHistogramCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.clientWidth || 600;
    const height = 280;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0f172a'; // slate-900
    ctx.fillRect(0, 0, width, height);

    const paddingLeft = 55;
    const paddingRight = 55;
    const paddingTop = 40;
    const paddingBottom = 40;

    const graphWidth = width - paddingLeft - paddingRight;
    const graphHeight = height - paddingTop - paddingBottom;

    // Standard histogram grouping
    const numBins = 10;
    const minVal = Math.min(...spcValues);
    const maxVal = Math.max(...spcValues);
    const binWidth = (maxVal - minVal) / numBins || 0.01;

    const bins = Array(numBins).fill(0);
    spcValues.forEach(v => {
      let binIdx = Math.floor((v - minVal) / binWidth);
      if (binIdx >= numBins) binIdx = numBins - 1;
      if (binIdx < 0) binIdx = 0;
      bins[binIdx]++;
    });

    const maxBinCount = Math.max(...bins) || 1;

    // Define X-axis bounds (must encompass LSL and USL as well for standard quality control views)
    const bounds = [minVal, maxVal, lsl, usl, pcaTarget].filter(v => v !== null && v !== undefined);
    let minX = Math.min(...bounds);
    let maxX = Math.max(...bounds);
    const xBuffer = (maxX - minX) * 0.15 || 1.0;
    minX -= xBuffer;
    maxX += xBuffer;

    const getX = (val) => paddingLeft + ((val - minX) / (maxX - minX)) * graphWidth;
    const getY = (count) => paddingTop + graphHeight - (count / maxBinCount) * graphHeight;

    // Draw Histogram bars
    ctx.fillStyle = 'rgba(99, 102, 241, 0.25)'; // indigo transparent
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 1;

    for (let i = 0; i < numBins; i++) {
      const binMin = minVal + i * binWidth;
      const binMax = binMin + binWidth;
      const x1 = getX(binMin);
      const x2 = getX(binMax);
      const y = getY(bins[i]);

      ctx.fillRect(x1, y, x2 - x1, paddingTop + graphHeight - y);
      ctx.strokeRect(x1, y, x2 - x1, paddingTop + graphHeight - y);
    }

    // Draw spec limit lines USL, LSL, Target
    const drawSpecLine = (xVal, label, color) => {
      if (xVal === null || xVal === undefined) return;
      const x = getX(xVal);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x, paddingTop);
      ctx.lineTo(x, paddingTop + graphHeight);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label at top
      ctx.fillStyle = color;
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${label}: ${xVal.toFixed(3)}`, x, paddingTop - 8);
    };

    drawSpecLine(lsl, "LSL", '#f43f5e'); // Rose-500
    drawSpecLine(usl, "USL", '#f43f5e');
    drawSpecLine(pcaTarget, "Target", '#10b981'); // Emerald-500

    // Draw Process Mean line
    const xMean = getX(res.mean);
    ctx.strokeStyle = '#a855f7'; // Purple-500
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(xMean, paddingTop);
    ctx.lineTo(xMean, paddingTop + graphHeight);
    ctx.stroke();

    ctx.fillStyle = '#a855f7';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`μ: ${res.mean.toFixed(3)}`, xMean, paddingTop + graphHeight + 12);

    // Overlay Normal distribution curve (Within-group capability)
    // f(x) = (1 / (sigma * sqrt(2*pi))) * exp(-0.5 * ((x - mu)/sigma)^2)
    const mu = res.mean;
    const sigma = res.withinSD;

    if (sigma > 0) {
      const normalCurvePoints = [];
      const numPoints = 120;
      const step = (maxX - minX) / numPoints;

      for (let i = 0; i <= numPoints; i++) {
        const xVal = minX + i * step;
        const exponent = -0.5 * Math.pow((xVal - mu) / sigma, 2);
        const yDensity = (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
        normalCurvePoints.push({ x: xVal, y: yDensity });
      }

      const maxDensity = Math.max(...normalCurvePoints.map(p => p.y)) || 1.0;
      
      ctx.strokeStyle = '#ec4899'; // Pink-500
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      
      normalCurvePoints.forEach((p, idx) => {
        const x = getX(p.x);
        // Scale density curve to match histogram height
        const y = paddingTop + graphHeight - (p.y / maxDensity) * graphHeight;
        if (idx === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    }

    // Label bottom axis
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("測量值分佈與規格界限 (常態分布擬合曲線)", width / 2, height - 8);
  }

  // --- 3. Gage R&R State Modifiers ---
  const handleAddGrrRow = () => {
    const val = parseFloat(newVal);
    if (isNaN(val)) {
      alert("請輸入有效的量測數值！");
      return;
    }
    setGrrRows([
      ...grrRows,
      { operator: newOp, part: newPart, trial: parseInt(newTrial), val }
    ]);
    setNewVal('');
  };

  const handleClearGrr = () => {
    setGrrRows([]);
  };

  // --- Compute Results for active selections ---
  const spcResults = spcValues.length > 0 ? calculateSPC(spcValues, spcChartType, subgroupSize, { lambda, delta }) : null;
  const pcaResults = spcValues.length > 0 ? calculatePCA(spcValues, usl, lsl, pcaTarget, pcaSubgroupSize) : null;
  const grrResults = grrRows.length > 0 ? calculateGageRR(grrRows) : null;
  const samplingResults = isDoubleSampling 
    ? calculateDoubleSamplingPlan(sampN, samp_n, samp_c, null, samp_n2, samp_c2)
    : calculateSamplingPlan(sampN, samp_n, samp_c);

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Page Header banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950/60 to-purple-950 border border-slate-800 p-6 md:p-8 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-accentViolet/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex items-center space-x-4">
          <div className="bg-accentViolet/10 border border-accentViolet/25 text-accentViolet p-4 rounded-2xl">
            <Activity size={32} className="animate-spin-slow" />
          </div>
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-white tracking-tight">工業統計與製程管制特區 (SPC & Quality Suite)</h2>
            <p className="text-xs text-slate-400 font-medium">
              基於 Douglas C. Montgomery 教授《統計品質管制》聖經理論設計。支援 Variables & Attributes 智慧管制圖、製程能力 Cp/Cpk 及量具 R&R 分析。
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleCsvUpload}
            accept=".csv"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-2 px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-bold transition-all shadow-xl backdrop-blur-md group"
          >
            <Upload size={18} className="text-accentViolet group-hover:scale-110 transition-transform" />
            <span>上傳自定義 CSV 數據</span>
          </button>
          
          {/* Dataset Quick Injector Dashboard */}
          <div className="flex flex-wrap gap-2 justify-center">
          <button
            onClick={() => loadMockDataset('bearing')}
            className="flex items-center space-x-1 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold cursor-pointer active:scale-95 transition-all"
          >
            <Database size={13} className="text-accentViolet" />
            <span>軸承外徑 (計量 SPC)</span>
          </button>
          <button
            onClick={() => loadMockDataset('wafer')}
            className="flex items-center space-x-1 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold cursor-pointer active:scale-95 transition-all"
          >
            <Database size={13} className="text-accentEmerald" />
            <span>晶圓不良 (計數 p/np)</span>
          </button>
          <button
            onClick={() => loadMockDataset('fabric')}
            className="flex items-center space-x-1 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold cursor-pointer active:scale-95 transition-all"
          >
            <Database size={13} className="text-accentCyan" />
            <span>織物瑕疵 (計數 c/u)</span>
          </button>
          <button
            onClick={() => loadMockDataset('chemicals')}
            className="flex items-center space-x-1 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold cursor-pointer active:scale-95 transition-all"
          >
            <Database size={13} className="text-amber-400" />
            <span>化學濃度 (EWMA/CUSUM)</span>
          </button>
          <button
            onClick={() => loadMockDataset('piston')}
            className="flex items-center space-x-1 px-3.5 py-2 rounded-xl bg-purple-950/40 hover:bg-purple-900/40 border border-purple-500/25 text-purple-200 text-xs font-semibold cursor-pointer active:scale-95 transition-all"
          >
            <Award size={13} className="text-purple-400" />
            <span>量具 R&R 數據</span>
          </button>
          <button
            onClick={() => loadMockDataset('multivariate')}
            className="flex items-center space-x-1 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold cursor-pointer active:scale-95 transition-all"
          >
            <Activity size={13} className="text-accentViolet" />
            <span>多變量監控 (Hotelling)</span>
          </button>
          <button
            onClick={() => loadMockDataset('doe')}
            className="flex items-center space-x-1 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold cursor-pointer active:scale-95 transition-all"
          >
            <Plus size={13} className="text-blue-400" />
            <span>DOE 產率實驗</span>
          </button>
          <button
            onClick={() => loadMockDataset('sampling')}
            className="flex items-center space-x-1 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold cursor-pointer active:scale-95 transition-all"
          >
            <Layout size={13} className="text-amber-500" />
            <span>抽樣檢驗計畫</span>
          </button>
        </div>
      </div>
      </div>

      {/* Tabs System */}
      <div className="flex border-b border-slate-800/80 gap-4">
        <button
          onClick={() => setActiveTab('spc')}
          className={`pb-4 px-2 text-sm font-extrabold transition-all border-b-2 cursor-pointer ${
            activeTab === 'spc'
              ? 'border-accentViolet text-accentViolet'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          1. 統計製程管制圖 (Control Charts)
        </button>
        <button
          onClick={() => setActiveTab('pca')}
          className={`pb-4 px-2 text-sm font-extrabold transition-all border-b-2 cursor-pointer ${
            activeTab === 'pca'
              ? 'border-accentViolet text-accentViolet'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          2. 製程能力分析 (Cp/Cpk Capability)
        </button>
        <button
          onClick={() => setActiveTab('multivariate')}
          className={`pb-4 px-2 text-sm font-extrabold transition-all border-b-2 cursor-pointer ${
            activeTab === 'multivariate'
              ? 'border-accentViolet text-accentViolet'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          3. 多變量管制圖 (Multivariate)
        </button>
        <button
          onClick={() => setActiveTab('grr')}
          className={`pb-4 px-2 text-sm font-extrabold transition-all border-b-2 cursor-pointer ${
            activeTab === 'grr'
              ? 'border-accentViolet text-accentViolet'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          4. 量具 R&R 分析 (Gage R&R)
        </button>
        <button
          onClick={() => setActiveTab('sampling')}
          className={`pb-4 px-2 text-sm font-extrabold transition-all border-b-2 cursor-pointer ${
            activeTab === 'sampling'
              ? 'border-accentViolet text-accentViolet'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          5. 抽樣檢驗計畫 (Sampling)
        </button>
        <button
          onClick={() => setActiveTab('doe')}
          className={`pb-4 px-2 text-sm font-extrabold transition-all border-b-2 cursor-pointer ${
            activeTab === 'doe'
              ? 'border-accentViolet text-accentViolet'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          6. 實驗設計 (DOE)
        </button>
      </div>

      {/* Main Tab Render Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Input Configuration (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {(activeTab === 'spc' || activeTab === 'pca') ? (
            /* SPC & PCA input dashboard */
            <div className="glass-card p-6 space-y-6">
              <h3 className="text-sm font-extrabold text-white flex items-center space-x-2">
                <Settings size={15} className="text-accentViolet" />
                <span>管制與規格配置參數</span>
              </h3>

              {/* Chart selector */}
              <div className="space-y-1.5">
                <label className="text-2xs font-bold text-slate-400 uppercase tracking-wider block">管制圖類型 (SPC Type)</label>
                <select
                  value={spcChartType}
                  onChange={(e) => setSpcChartType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-semibold focus:border-accentViolet outline-none transition-all"
                >
                  <option value="xbar-r">平均值-全距管制圖 (X-bar & R Chart)</option>
                  <option value="xbar-s">平均值-標準差管制圖 (X-bar & s Chart)</option>
                  <option value="imr">個別值-移動全距管制圖 (I-MR Chart)</option>
                  <option value="ewma">EWMA 管制圖 (偵測微小位移)</option>
                  <option value="cusum">CUSUM 累計和管制圖 (偵測微小位移)</option>
                  <option value="p">不良率管制圖 (p Chart)</option>
                  <option value="np">不良數管制圖 (np Chart)</option>
                  <option value="c">缺點數管制圖 (c Chart)</option>
                  <option value="u">單位缺點數管制圖 (u Chart)</option>
                </select>
                <p className="text-[10px] text-slate-500 leading-tight">
                  {spcChartType.startsWith('xbar') ? "適用於計量型數據（如長度、重量）。n>1 時選用。" : 
                   spcChartType === 'imr' ? "適用於生產緩慢或破壞性檢驗，n=1。" :
                   ['p', 'np'].includes(spcChartType) ? "監控不良品比例或數量（二項分佈）。" :
                   ['c', 'u'].includes(spcChartType) ? "監控缺點總數或單位缺點數（卜瓦松分佈）。" :
                   "進階統計方法，對 0.5σ - 1.5σ 的微小偏移極為敏感。"}
                </p>
              </div>

              {/* Advanced Parameters for EWMA/CUSUM */}
              {(spcChartType === 'ewma' || spcChartType === 'cusum') && (
                <div className="p-3.5 bg-indigo-950/20 border border-indigo-500/25 rounded-2xl space-y-3 animate-slide-up">
                  <div className="flex items-center justify-between">
                    <h4 className="text-2xs font-bold text-indigo-300 uppercase tracking-widest">進階位移監控參數</h4>
                    <div className="group relative">
                      <HelpCircle size={12} className="text-slate-500 cursor-help" />
                      <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-[9px] text-slate-400 leading-relaxed">
                        <b>λ (Lambda)</b>: 權重，越小對歷史數據記憶越久，適合偵測極小位移。<br/>
                        <b>δ (Delta)</b>: 預期偏離中心多少個標準差。
                      </div>
                    </div>
                  </div>
                  
                  {spcChartType === 'ewma' && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 flex justify-between">
                        <span>權重係數 (λ)</span>
                        <span className="text-indigo-400">{lambda.toFixed(2)}</span>
                      </label>
                      <input
                        type="range"
                        min="0.05"
                        max="0.5"
                        step="0.05"
                        value={lambda}
                        onChange={(e) => setLambda(parseFloat(e.target.value))}
                        className="w-full accent-accentViolet"
                      />
                    </div>
                  )}

                  {spcChartType === 'cusum' && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 flex justify-between">
                        <span>預期位移 (δσ)</span>
                        <span className="text-indigo-400">{delta.toFixed(1)} σ</span>
                      </label>
                      <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.1"
                        value={delta}
                        onChange={(e) => setDelta(parseFloat(e.target.value))}
                        className="w-full accent-accentViolet"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Subgroup input */}
              <div className="space-y-1.5">
                <label className="text-2xs font-bold text-slate-400 uppercase tracking-wider block">
                  {['p', 'np', 'u'].includes(spcChartType) ? "批次檢驗個數 (Lot Size)" : "子群大小 (Subgroup Size n)"}
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={subgroupSize}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 5;
                    setSubgroupSize(val);
                    setPcaSubgroupSize(val);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-semibold focus:border-accentViolet outline-none transition-all"
                />
                <span className="text-[10px] text-slate-500 block">
                  {spcChartType === 'imr' ? "I-MR 固定子群大小為 1" : "計量型 X-bar 管制圖子群通常為 2 至 10。"}
                </span>
              </div>

              {/* Specs for PCA */}
              <div className="border-t border-slate-800/80 pt-4 space-y-4">
                <h4 className="text-xs font-bold text-slate-300">製程能力規格極限 (Specs)</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-2xs font-bold text-slate-400 block">規格下限 (LSL)</label>
                    <input
                      type="number"
                      step="any"
                      value={lsl}
                      onChange={(e) => setLsl(parseFloat(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-semibold focus:border-accentViolet outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-2xs font-bold text-slate-400 block">規格上限 (USL)</label>
                    <input
                      type="number"
                      step="any"
                      value={usl}
                      onChange={(e) => setUsl(parseFloat(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-semibold focus:border-accentViolet outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-2xs font-bold text-slate-400 block">規格中心 (Target)</label>
                    <input
                      type="number"
                      step="any"
                      value={pcaTarget}
                      onChange={(e) => setPcaTarget(parseFloat(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-semibold focus:border-accentViolet outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-2xs font-bold text-slate-400 block">分析子組大小</label>
                    <input
                      type="number"
                      min="1"
                      value={pcaSubgroupSize}
                      onChange={(e) => setPcaSubgroupSize(parseInt(e.target.value) || 5)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-semibold focus:border-accentViolet outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Spreadsheet text input */}
              <div className="border-t border-slate-800/80 pt-4 space-y-2">
                <label className="text-2xs font-bold text-slate-400 uppercase tracking-wider block">編輯數值序列 (CSV 格式)</label>
                <textarea
                  value={spcRawInput}
                  onChange={(e) => setSpcRawInput(e.target.value)}
                  placeholder="輸入數值，用逗號 or 空格分隔..."
                  rows={4}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono outline-none focus:border-accentViolet transition-all resize-none"
                />
                <button
                  onClick={handleUpdateSpcValues}
                  className="w-full flex items-center justify-center space-x-1.5 py-2.5 rounded-xl bg-gradient-to-r from-accentViolet to-indigo-600 hover:from-accentViolet/90 hover:to-indigo-600/90 text-white text-xs font-bold shadow-lg shadow-indigo-900/30 cursor-pointer transition-all active:scale-95"
                >
                  <RefreshCw size={13} />
                  <span>更新測量數據</span>
                </button>
              </div>

            </div>
          ) : activeTab === 'multivariate' ? (
            <div className="glass-card p-6 space-y-6">
              <h3 className="text-sm font-extrabold text-white flex items-center space-x-2">
                <Settings size={15} className="text-accentViolet" />
                <span>多變量配置參數</span>
              </h3>
              <div className="space-y-4">
                <label className="text-2xs font-bold text-slate-400 uppercase tracking-wider block">輸入多維數據 (x1, x2, ...)</label>
                <textarea
                  value={mvValues.map(v => v.join(',')).join('\n')}
                  onChange={(e) => {
                    const rows = e.target.value.split('\n').map(r => r.split(',').map(v => parseFloat(v)).filter(v => !isNaN(v))).filter(r => r.length > 0);
                    setMvValues(rows);
                  }}
                  rows={8}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono outline-none focus:border-accentViolet transition-all resize-none"
                  placeholder="10.1, 5.2&#10;10.2, 5.1..."
                />
              </div>
            </div>
          ) : activeTab === 'grr' ? (
            /* Gage R&R data input panel */
            <div className="glass-card p-6 space-y-6">
              <h3 className="text-sm font-extrabold text-white flex items-center space-x-2">
                <Settings size={15} className="text-accentViolet" />
                <span>Gage R&R 量具數據收集</span>
              </h3>

              <div className="p-3 bg-slate-950/50 rounded-2xl border border-slate-800/60 space-y-2 text-2xs text-slate-400 leading-relaxed">
                <p>量具重現性與再現性研究（AIAG）要求：輸入多個人員對多個相同零件多次量測的值，以評估測量系統的變異。</p>
              </div>

              <div className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-2xs font-bold text-slate-400 block">操作人員 (Operator)</label>
                    <select
                      value={newOp}
                      onChange={(e) => setNewOp(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-semibold focus:border-accentViolet outline-none transition-all"
                    >
                      <option value="A">操作員 A (Appraiser A)</option>
                      <option value="B">操作員 B (Appraiser B)</option>
                      <option value="C">操作員 C (Appraiser C)</option>
                    </select>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-2xs font-bold text-slate-400 block">零件編號 (Part ID)</label>
                    <input
                      type="text"
                      value={newPart}
                      onChange={(e) => setNewPart(e.target.value)}
                      placeholder="如 1, 2..."
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-semibold focus:border-accentViolet outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-2xs font-bold text-slate-400 block">試驗次數 (Trial)</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={newTrial}
                      onChange={(e) => setNewTrial(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-semibold focus:border-accentViolet outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-2xs font-bold text-slate-400 block">量測數值 (Value)</label>
                    <input
                      type="number"
                      step="any"
                      value={newVal}
                      onChange={(e) => setNewVal(e.target.value)}
                      placeholder="如 10.02"
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-semibold focus:border-accentViolet outline-none transition-all"
                    />
                  </div>
                </div>

                <button
                  onClick={handleAddGrrRow}
                  className="w-full flex items-center justify-center space-x-1.5 py-2.5 rounded-xl bg-gradient-to-r from-accentViolet to-indigo-600 hover:from-accentViolet/90 hover:to-indigo-600/90 text-white text-xs font-bold shadow-lg shadow-indigo-900/30 cursor-pointer transition-all active:scale-95"
                >
                  <Plus size={14} />
                  <span>新增量測列</span>
                </button>
              </div>

              {/* Data list view table */}
              <div className="border-t border-slate-800/80 pt-4 space-y-2">
                <div className="flex items-center justify-between text-2xs font-bold text-slate-400 uppercase">
                  <span>當前已輸入列數：{grrRows.length}</span>
                  <button onClick={handleClearGrr} className="text-rose-400 hover:text-rose-300 flex items-center space-x-0.5 cursor-pointer">
                    <Trash2 size={12} />
                    <span>清空</span>
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto border border-slate-850 rounded-xl bg-slate-950 text-3xs font-semibold font-mono divide-y divide-slate-900">
                  {grrRows.length === 0 ? (
                    <div className="p-4 text-center text-slate-600 font-sans">無數據。請點選上方量具 R&R 實驗按鈕載入範例。</div>
                  ) : (
                    grrRows.map((r, idx) => (
                      <div key={idx} className="flex justify-between items-center px-3 py-2 text-slate-300">
                        <span>人: {r.operator} | 零件: {r.part} | 次: {r.trial}</span>
                        <div className="flex items-center space-x-3">
                          <span className="font-bold text-white">{r.val}</span>
                          <button
                            onClick={() => {
                              const newRows = [...grrRows];
                              newRows.splice(idx, 1);
                              setGrrRows(newRows);
                            }}
                            className="text-rose-500 hover:text-rose-400 cursor-pointer"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          ) : activeTab === 'doe' ? (
            <div className="glass-card p-6 space-y-6">
              <h3 className="text-sm font-extrabold text-white flex items-center space-x-2">
                <Settings size={15} className="text-accentViolet" />
                <span>DOE 實驗配置</span>
              </h3>
              <div className="space-y-4">
                <label className="text-2xs font-bold text-slate-400 uppercase tracking-wider block">輸入實驗數據 (Factor1, Factor2, ..., Response)</label>
                <textarea
                  value={doeData.map(d => [...d.run, d.response].join(',')).join('\n')}
                  onChange={(e) => {
                    const rows = e.target.value.split('\n').map(r => r.split(',').map(v => parseFloat(v)).filter(v => !isNaN(v))).filter(r => r.length > 0);
                    const newDoe = rows.map(r => ({ run: r.slice(0, -1), response: r[r.length-1] }));
                    setDoeData(newDoe);
                  }}
                  rows={8}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono outline-none focus:border-accentViolet transition-all resize-none"
                />
              </div>
            </div>
          ) : (
            /* Sampling Plan input panel */
            <div className="glass-card p-6 space-y-6">
              <h3 className="text-sm font-extrabold text-white flex items-center space-x-2">
                <Settings size={15} className="text-accentViolet" />
                <span>抽樣計畫參數設計</span>
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-2xs font-bold text-slate-400 uppercase">雙次抽樣計畫</span>
                  <input type="checkbox" checked={isDoubleSampling} onChange={e => setIsDoubleSampling(e.target.checked)} className="accent-accentViolet" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-2xs font-bold text-slate-400 block">批量大小 (Lot Size N)</label>
                  <input
                    type="number"
                    value={sampN}
                    onChange={(e) => setSampN(parseInt(e.target.value) || 1000)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-semibold focus:border-accentViolet outline-none transition-all"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-2xs font-bold text-slate-400 block">n1</label>
                    <input type="number" value={samp_n} onChange={(e) => setSamp_n(parseInt(e.target.value) || 50)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:border-accentViolet outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-2xs font-bold text-slate-400 block">c1</label>
                    <input type="number" value={samp_c} onChange={(e) => setSamp_c(parseInt(e.target.value) || 0)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:border-accentViolet outline-none" />
                  </div>
                </div>

                {isDoubleSampling && (
                  <div className="grid grid-cols-2 gap-3 animate-slide-up">
                    <div className="space-y-1.5">
                      <label className="text-2xs font-bold text-slate-400 block">n2</label>
                      <input type="number" value={samp_n2} onChange={(e) => setSamp_n2(parseInt(e.target.value) || 50)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:border-accentViolet outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-2xs font-bold text-slate-400 block">c2</label>
                      <input type="number" value={samp_c2} onChange={(e) => setSamp_c2(parseInt(e.target.value) || 0)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:border-accentViolet outline-none" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Interactive Charts & Advanced Reports (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">

          {activeTab === 'spc' && (
            /* TAB 1: SPC CONTROL CHARTS */
            <div className="space-y-6">
              
              {/* Dual stacked canvas container */}
              <div className="glass-card p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
                    <BarChart2 size={18} className="text-accentViolet" />
                    <span>製程動態管制分析圖 (Interactive Control Charts)</span>
                  </h3>
                  {spcResults && !spcResults.error && (
                    <div className={`inline-flex px-2.5 py-1 rounded-full text-3xs font-extrabold border shadow-inner ${
                      spcResults.primary.points.some(p => p.out) ? "bg-rose-950/30 border-rose-500/35 text-rose-400" : "bg-emerald-950/30 border-emerald-500/35 text-emerald-400"
                    }`}>
                      製程狀態：{spcResults.primary.points.some(p => p.out) ? "❌ 發現失控異常點" : "✅ 製程穩定受控"}
                    </div>
                  )}
                </div>

                {spcResults && spcResults.error ? (
                  <div className="p-8 text-center bg-rose-950/20 border border-rose-900/30 rounded-2xl flex flex-col items-center justify-center space-y-2 text-rose-300 text-xs">
                    <ShieldAlert size={28} className="text-rose-500 animate-pulse" />
                    <span>{spcResults.error}</span>
                  </div>
                ) : spcValues.length === 0 ? (
                  <div className="p-16 text-center text-slate-500 text-xs font-semibold">
                    請在左側貼上數值或載入頂部的範例數據！
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
                      <canvas ref={spcPrimaryCanvasRef}></canvas>
                    </div>
                    {['xbar-r', 'xbar-s', 'imr'].includes(spcChartType) && (
                      <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
                        <canvas ref={spcSecondaryCanvasRef}></canvas>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Violations log */}
              {spcResults && !spcResults.error && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="glass-card p-5 space-y-3">
                    <h4 className="text-xs font-extrabold text-slate-200 flex items-center space-x-1.5">
                      <ShieldAlert size={14} className="text-rose-400" />
                      <span>異常失控點診斷 (Western Electric Rules)</span>
                    </h4>
                    <div className="space-y-2 text-2xs max-h-64 overflow-y-auto">
                      {spcResults.primary.points.some(p => p.out) ? (
                        spcResults.primary.points.filter(p => p.out).map((p, idx) => (
                          <div key={idx} className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-900/30 space-y-1 text-rose-300">
                            <div className="flex items-center space-x-2 font-bold">
                              <AlertTriangle size={13} className="text-rose-500" />
                              <span>樣本 #{p.index} 失控</span>
                            </div>
                            <div className="pl-5 space-y-1">
                              <p>數值: <code className="text-white font-mono">{p.val.toFixed(4)}</code></p>
                              {p.violations && p.violations.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {p.violations.map((v, vi) => (
                                    <span key={vi} className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[9px] font-black">{v}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-center bg-slate-950/40 rounded-xl border border-slate-800/40 text-slate-500 font-bold">
                          ✅ 未發現任何 Western Electric 異常模式。
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="glass-card p-5 space-y-3">
                    <h4 className="text-xs font-extrabold text-slate-200 flex items-center space-x-1.5">
                      <FileText size={14} className="text-accentViolet" />
                      <span>進階品管診斷說明</span>
                    </h4>
                    <div className="text-2xs text-slate-400 space-y-2 leading-relaxed">
                      <p>系統自動檢測 <b>Rule 1-4</b>，包含點越界、2/3 點越過 2σ、4/5 點越過 1σ 以及連續 8 點落在同一側。</p>
                      <p>這些規則能有效捕捉製程中的<b>微小位移 (Small Shifts)</b> 與<b>循環 (Cycles)</b>。</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'multivariate' && (
            <div className="space-y-6">
              <div className="glass-card p-6 space-y-6">
                <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
                  <Activity size={18} className="text-accentViolet" />
                  <span>多變量 Hotelling T² 管制分析</span>
                </h3>
                <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
                  <canvas ref={multivariateCanvasRef}></canvas>
                </div>
                <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-850 text-2xs text-slate-400 leading-relaxed">
                  <p>Hotelling $T^2$ 指標基於共變異數矩陣的逆矩陣運算。它將多個品質特性的相關性納入考量，避免了多個單變量管制圖帶來的偽警報累積（Type I Error 膨脹）。</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pca' && (
            <div className="space-y-6">
              <div className="glass-card p-6 space-y-6">
                <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
                  <BarChart2 size={18} className="text-accentViolet" />
                  <span>製程能力分布直方圖 (Capability Histogram)</span>
                </h3>
                <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
                  <canvas ref={pcaHistogramCanvasRef}></canvas>
                </div>
              </div>
              {pcaResults && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  <div className="md:col-span-7 glass-card p-5 space-y-4">
                    <h4 className="text-xs font-extrabold text-slate-200 flex items-center space-x-1.5"><Award size={14} className="text-accentViolet" /><span>製程能力指標</span></h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-indigo-950/20 border border-indigo-900/30 rounded-xl relative group">
                          <span className="text-[10px] text-slate-400 block font-bold tracking-widest uppercase flex items-center">
                            Cp (Potential) <HelpCircle size={10} className="ml-1 text-slate-600" />
                          </span>
                          <span className="text-2xl font-black text-white">{pcaResults.within.cp.toFixed(3)}</span>
                          <span className="text-[10px] text-slate-500 block mt-1">Cpk: {pcaResults.within.cpk.toFixed(3)}</span>
                          <div className="absolute top-0 left-full ml-2 w-40 p-2 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-[9px] text-slate-400">
                            <b>Cp</b>: 製程精密度（寬度比），越高表示分散越小。<br/>
                            <b>Cpk</b>: 製程能力指標（含偏心），必須 ≥ 1.33 才算合格。
                          </div>
                        </div>
                        <div className="p-3 bg-purple-950/20 border border-purple-900/30 rounded-xl relative group">
                          <span className="text-[10px] text-slate-400 block font-bold tracking-widest uppercase flex items-center">
                            Pp (Overall) <HelpCircle size={10} className="ml-1 text-slate-600" />
                          </span>
                          <span className="text-2xl font-black text-white">{pcaResults.overall.pp.toFixed(3)}</span>
                          <span className="text-[10px] text-slate-500 block mt-1">Ppk: {pcaResults.overall.ppk.toFixed(3)}</span>
                          <div className="absolute top-0 left-full ml-2 w-40 p-2 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-[9px] text-slate-400">
                            <b>Pp/Ppk</b>: 長期製程性能，使用全數據標準差計算（包含製程漂移）。
                          </div>
                        </div>
                      </div>
                  </div>
                  <div className="md:col-span-5 glass-card p-5 space-y-4">
                    <h4 className="text-xs font-extrabold text-slate-200 flex items-center space-x-1.5"><AlertTriangle size={14} className="text-accentEmerald" /><span>不合格率估算 (PPM)</span></h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-2xs p-2.5 bg-slate-950/40 rounded-xl border border-slate-850">
                        <span className="text-slate-400 font-bold">短期預估 (Within)</span>
                        <span className="text-white font-black">{pcaResults.within.ppmTotal.toFixed(0)} PPM</span>
                      </div>
                      <div className="flex justify-between items-center text-2xs p-2.5 bg-slate-950/40 rounded-xl border border-slate-850">
                        <span className="text-slate-400 font-bold">長期預估 (Overall)</span>
                        <span className="text-white font-black">{pcaResults.overall.ppmTotal.toFixed(0)} PPM</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'grr' && (
            <div className="space-y-6">
              <div className="glass-card p-6 space-y-6">
                <h3 className="text-base font-extrabold text-white flex items-center space-x-2"><Award size={18} className="text-accentViolet" /><span>量具 MSA 分析報告</span></h3>
                {grrResults && !grrResults.error ? (
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <span className="text-2xs font-bold text-slate-500 uppercase tracking-widest">量測系統變異貢獻佔比 (% Study Variation)</span>
                      <div className="space-y-4 font-semibold text-3xs">
                        <div className="space-y-1">
                          <div className="flex justify-between text-slate-400"><span>重複性 (Repeatability - EV)</span><span>{grrResults.evPercent.toFixed(1)}%</span></div>
                          <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-900"><div className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" style={{ width: `${grrResults.evPercent}%` }}></div></div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-slate-400"><span>再現性 (Reproducibility - AV)</span><span>{grrResults.avPercent.toFixed(1)}%</span></div>
                          <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-900"><div className="h-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" style={{ width: `${grrResults.avPercent}%` }}></div></div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-white"><span>量具總變異 (GRR)</span><span className="text-accentViolet font-black">{grrResults.grrPercent.toFixed(1)}%</span></div>
                          <div className="h-4 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-900 p-0.5"><div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" style={{ width: `${grrResults.grrPercent}%` }}></div></div>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-1">
                        <span className="text-2xs text-slate-500 font-bold uppercase tracking-widest">ndc 解析度</span>
                        <span className={`text-3xl font-black block ${grrResults.ndc >= 5 ? "text-emerald-400" : "text-rose-400"}`}>{grrResults.ndc}</span>
                        <span className="text-[9px] text-slate-500 font-medium">合格標準 ≥ 5</span>
                      </div>
                      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-1">
                        <span className="text-2xs text-slate-500 font-bold uppercase tracking-widest">系統判定</span>
                        <span className={`text-xl font-black block mt-2 ${grrResults.suitabilityColor}`}>{grrResults.suitability}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-16 text-center text-slate-500 text-xs font-semibold">請輸入或載入量具數據以生成報告。</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'sampling' && (
            <div className="space-y-6">
              <div className="glass-card p-6 space-y-6">
                <h3 className="text-base font-extrabold text-white flex items-center space-x-2"><Layout size={18} className="text-accentViolet" /><span>抽樣計畫效能分析</span></h3>
                <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
                  <canvas ref={samplingCanvasRef}></canvas>
                </div>
                {samplingResults && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-850 space-y-1 group relative">
                      <span className="text-2xs text-slate-400 block font-bold tracking-widest uppercase flex items-center">
                        AQL <HelpCircle size={10} className="ml-1 text-slate-600" />
                      </span>
                      <span className="text-2xl font-black text-accentEmerald">{(samplingResults.aql * 100).toFixed(2)} %</span>
                      <span className="text-[9px] text-slate-600 block">生產者風險界限</span>
                      <div className="absolute top-0 left-full ml-2 w-48 p-2 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-[9px] text-slate-400">
                        <b>AQL (Acceptable Quality Level)</b>: 允收品質水準。在此不合格率下，批次有 95% 的機率被允收。代表生產者的利潤保障。
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-850 space-y-1 group relative">
                      <span className="text-2xs text-slate-400 block font-bold tracking-widest uppercase flex items-center">
                        LTPD <HelpCircle size={10} className="ml-1 text-slate-600" />
                      </span>
                      <span className="text-2xl font-black text-rose-400">{(samplingResults.ltpd * 100).toFixed(2)} %</span>
                      <span className="text-[9px] text-slate-600 block">消費者風險界限</span>
                      <div className="absolute top-0 left-full ml-2 w-48 p-2 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-[9px] text-slate-400">
                        <b>LTPD (Lot Tolerance Percent Defective)</b>: 批次拒收水準。在此不合格率下，批次僅有 10% 的機率被誤收。代表消費者的品質保障。
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-850 space-y-1 group relative">
                      <span className="text-2xs text-slate-400 block font-bold tracking-widest uppercase flex items-center">
                        AOQL <HelpCircle size={10} className="ml-1 text-slate-600" />
                      </span>
                      <span className="text-2xl font-black text-amber-400">{(samplingResults.maxAOQ * 100).toFixed(3)} %</span>
                      <span className="text-[9px] text-slate-600 block">出廠品質極限</span>
                      <div className="absolute top-0 left-full ml-2 w-48 p-2 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-[9px] text-slate-400">
                        <b>AOQL (Average Outgoing Quality Limit)</b>: 平均出廠品質界限。無論進料品質多差，經過檢驗剔除後的平均品質絕不會超過此數值。
                      </div>
                    </div>
                    {isDoubleSampling && (
                      <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-800/40 space-y-1 md:col-span-3">
                        <div className="flex justify-between items-center">
                          <span className="text-2xs text-indigo-400 font-bold tracking-widest uppercase">平均檢驗個數 (ASN)</span>
                          <span className="text-[10px] text-slate-500">當不合格率增加時，平均抽樣數也會隨之增加</span>
                        </div>
                        <div className="flex space-x-8">
                          <div>
                            <span className="text-xs text-slate-400">最小 (p=0):</span>
                            <span className="ml-2 text-lg font-black text-white">{samplingResults.defectRates[0].asn.toFixed(1)}</span>
                          </div>
                          <div>
                            <span className="text-xs text-slate-400">預估最大:</span>
                            <span className="ml-2 text-lg font-black text-white">{Math.max(...samplingResults.defectRates.map(d => d.asn)).toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'doe' && (
            <div className="space-y-6">
              <div className="glass-card p-6 space-y-6">
                <h3 className="text-base font-extrabold text-white flex items-center space-x-2"><Plus size={18} className="text-accentViolet" /><span>2^k 實驗設計效應分析</span></h3>
                {doeData.length >= Math.pow(2, doeFactors.length) ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(calculateFactorialDOE(doeFactors, doeData).effects).map(([name, val], idx) => (
                        <div key={idx} className="p-4 rounded-2xl bg-slate-950/40 border border-slate-850 flex justify-between items-center group hover:border-accentViolet/50 transition-all">
                          <div className="space-y-1">
                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Effect: {name}</span>
                            <span className="text-xs font-bold text-slate-200 block">{name.includes('*') ? '交互作用' : '因子主效應'}</span>
                          </div>
                          <span className={`text-xl font-black ${val > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {val > 0 ? '+' : ''}{val.toFixed(3)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 text-2xs text-slate-400 leading-relaxed italic">
                      效應值代表當因子從低位 (-1) 切換至高位 (+1) 時，反應目標值的平均預期變化量。這對於優化工業製程參數至關重要。
                    </div>
                  </div>
                ) : (
                  <div className="p-16 text-center text-slate-500 text-xs font-semibold">需要足夠的實驗次數（全因子設計）才能進行 DOE 分析。</div>
                )}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* AUTOMATED ADVANCED REPORT */}
      <div className="glass-card p-6 space-y-6 animate-slide-up">
        <h3 className="text-sm font-extrabold text-white flex items-center space-x-2">
          <FileText size={16} className="text-accentViolet" />
          <span>SQC 高階診斷自動化報告書 (Advanced QA Report)</span>
        </h3>

        <div className="p-6 rounded-3xl bg-slate-950 font-mono text-2xs text-slate-300 leading-relaxed border border-slate-850 shadow-inner select-all">
          {activeTab === 'spc' && spcResults && (
            <div className="space-y-4">
              <p className="font-black text-white text-sm uppercase tracking-widest border-b border-slate-800 pb-3">【製程異常模式掃描報告】</p>
              <p>根據 Montgomery 的《統計品質管制》聖經體系，本診斷引擎完成了 Western Electric 與 Nelson Rules 的全面掃描。</p>
              <p className="text-slate-400">一、狀態判定：{spcResults.primary.points.some(p => p.out) ? <span className="text-rose-400 font-bold">DETECTED (失控異常)</span> : <span className="text-emerald-400 font-bold">CLEARED (受控穩定)</span>}。</p>
              <p className="text-slate-400">二、異常特徵：系統在 {spcResults.primary.points.filter(p => p.out).length} 個位置發現了潛在的非隨機原因。建議啟動 OCAP (失控處置計畫)。</p>
            </div>
          )}
          {activeTab === 'multivariate' && (
            <div className="space-y-4">
              <p className="font-black text-white text-sm uppercase tracking-widest border-b border-slate-800 pb-3">【多變量 Hotelling T² 品質報告】</p>
              <p>本模組對多個品質特性的協同變異進行了 Hotelling $T^2$ 監控。這種方法比單一管制圖更能捕捉複雜製程中的多維偏移。</p>
            </div>
          )}
          {activeTab === 'doe' && (
            <div className="space-y-4">
              <p className="font-black text-white text-sm uppercase tracking-widest border-b border-slate-800 pb-3">【DOE 實驗效應診斷摘要】</p>
              <p>因子篩選分析顯示了關鍵製程變數對最終反應值的邊際貢獻。正值表示該因子與目標值正相關。</p>
            </div>
          )}
          {activeTab === 'grr' && grrResults && (
            <div className="space-y-4">
              <p className="font-black text-white text-sm uppercase tracking-widest border-b border-slate-800 pb-3">【MSA 量測系統評估簡報】</p>
              <p>量具變異貢獻率 (GRR%) 為 {grrResults.grrPercent.toFixed(2)}%。解析度 ndc 為 {grrResults.ndc}。</p>
              <p>判定結果：<span className={`font-black ${grrResults.suitabilityColor}`}>{grrResults.suitability}</span>。{grrResults.description}</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
