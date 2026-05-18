import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Scatter, Line } from 'react-chartjs-2';
import { BarChart3, LineChart, TrendingUp, Presentation } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function SimpleAnalysis({ method, results, data, headers, variableMapping }) {
  if (!results) return null;

  const f = (num, decimals = 2) => {
    if (num === null || num === undefined || isNaN(num)) return '-';
    return Number(num).toFixed(decimals);
  };

  // Render descriptive summary cards
  const renderDescriptives = () => {
    let descList = [];

    if (method === 'ind-t' && results.desc1 && results.desc2) {
      descList = [
        { label: `組別一 [${variableMapping.group}]`, stats: results.desc1 },
        { label: `組別二 [${variableMapping.group}]`, stats: results.desc2 }
      ];
    } else if (method === 'oneway-anova' && results.descInfo) {
      Object.keys(results.descInfo).forEach(key => {
        descList.push({ label: `組別 [${key}]`, stats: results.descInfo[key] });
      });
    } else {
      // Calculate overall descriptives for regression, correlation, moderation, paired t-tests
      const cleanData = {};
      headers.forEach((h, idx) => {
        const colVals = data.map(row => row[idx]).filter(v => v !== null && v !== undefined && !isNaN(v));
        if (colVals.length > 0) {
          // Standard math-js descriptor calculation
          let sum = colVals.reduce((a, b) => a + b, 0);
          let mean = sum / colVals.length;
          let varianceSum = colVals.reduce((a, b) => a + Math.pow(b - mean, 2), 0);
          let sd = Math.sqrt(colVals.length > 1 ? varianceSum / (colVals.length - 1) : 0);
          cleanData[h] = { n: colVals.length, mean, sd };
        }
      });

      Object.keys(cleanData).forEach(key => {
        descList.push({ label: `變項 [${key}]`, stats: cleanData[key] });
      });
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 my-4">
        {descList.map((item, idx) => (
          <div key={idx} className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-xs font-bold text-accentEmerald tracking-wider uppercase">{item.label}</span>
            <div className="grid grid-cols-3 gap-2 mt-3 text-center">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">樣本數 N</span>
                <span className="text-sm font-bold text-slate-200">{item.stats.n}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">平均數 M</span>
                <span className="text-sm font-bold text-white">{f(item.stats.mean)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">標準差 SD</span>
                <span className="text-sm font-bold text-slate-200">{f(item.stats.sd)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render Charts based on Method
  const renderChart = () => {
    // 1. Independent Samples t-test or ANOVA
    if (method === 'ind-t' || method === 'oneway-anova') {
      let labels = [];
      let means = [];
      let sds = [];

      if (method === 'ind-t' && results.desc1 && results.desc2) {
        labels = ['第一組 (Group 1)', '第二組 (Group 2)'];
        means = [results.desc1.mean, results.desc2.mean];
        sds = [results.desc1.sd, results.desc2.sd];
      } else if (method === 'oneway-anova' && results.descInfo) {
        labels = Object.keys(results.descInfo);
        means = labels.map(key => results.descInfo[key].mean);
        sds = labels.map(key => results.descInfo[key].sd);
      }

      const barData = {
        labels,
        datasets: [
          {
            label: '平均值 (Mean)',
            data: means,
            backgroundColor: 'rgba(99, 102, 241, 0.4)', // Violet transparent
            borderColor: '#6366f1',
            borderWidth: 2,
            borderRadius: 12,
            hoverBackgroundColor: 'rgba(99, 102, 241, 0.6)',
          }
        ]
      };

      const options = {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => {
                const idx = context.dataIndex;
                return ` 平均數: ${f(means[idx])} (標準差: ${f(sds[idx])})`;
              }
            }
          }
        },
        scales: {
          y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' } },
          x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
        }
      };

      return (
        <div className="max-w-xl mx-auto bg-slate-950/20 border border-slate-850 p-6 rounded-2xl">
          <div className="flex items-center space-x-2 mb-4">
            <BarChart3 size={16} className="text-accentViolet" />
            <span className="text-xs font-bold text-slate-400">平均數差異長條圖</span>
          </div>
          <Bar data={barData} options={options} height={120} />
        </div>
      );
    }

    // 2. Dependent Samples t-test
    if (method === 'dep-t') {
      // Find indexes
      const preIdx = headers.indexOf(variableMapping.pre);
      const postIdx = headers.indexOf(variableMapping.post);

      const validPairs = data.filter(row => 
        row[preIdx] !== null && row[preIdx] !== undefined && !isNaN(row[preIdx]) &&
        row[postIdx] !== null && row[postIdx] !== undefined && !isNaN(row[postIdx])
      );

      const meanPre = validPairs.reduce((sum, r) => sum + r[preIdx], 0) / validPairs.length;
      const meanPost = validPairs.reduce((sum, r) => sum + r[postIdx], 0) / validPairs.length;

      const barData = {
        labels: ['前測 (Pre-test)', '後測 (Post-test)'],
        datasets: [
          {
            label: '平均值',
            data: [meanPre, meanPost],
            backgroundColor: ['rgba(236, 72, 153, 0.4)', 'rgba(16, 185, 129, 0.4)'], // Pink to Emerald
            borderColor: ['#ec4899', '#10b981'],
            borderWidth: 2,
            borderRadius: 12,
          }
        ]
      };

      const options = {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' } },
          x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
        }
      };

      return (
        <div className="max-w-xl mx-auto bg-slate-950/20 border border-slate-850 p-6 rounded-2xl">
          <div className="flex items-center space-x-2 mb-4">
            <BarChart3 size={16} className="text-accentEmerald" />
            <span className="text-xs font-bold text-slate-400">前後測平均數比較</span>
          </div>
          <Bar data={barData} options={options} height={120} />
        </div>
      );
    }

    // 3. Correlation / Linear Regression Scatter Plot with Trend Line
    if (method === 'correlation' || method === 'regression') {
      const xColName = variableMapping.x;
      const yColName = variableMapping.y;
      const xIdx = headers.indexOf(xColName);
      const yIdx = headers.indexOf(yColName);

      const cleanPoints = data
        .filter(row => 
          row[xIdx] !== null && row[xIdx] !== undefined && !isNaN(row[xIdx]) &&
          row[yIdx] !== null && row[yIdx] !== undefined && !isNaN(row[yIdx])
        )
        .map(row => ({ x: row[xIdx], y: row[yIdx] }));

      if (cleanPoints.length === 0) return null;

      // Fit regression line y = ax + b for visual trendline
      const xs = cleanPoints.map(p => p.x);
      const ys = cleanPoints.map(p => p.y);
      const n = cleanPoints.length;

      const sumX = xs.reduce((a, b) => a + b, 0);
      const sumY = ys.reduce((a, b) => a + b, 0);
      const sumXY = cleanPoints.reduce((a, p) => a + p.x * p.y, 0);
      const sumX2 = xs.reduce((a, b) => a + b * b, 0);

      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      // Generate trend line points
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const trendPoints = [
        { x: minX, y: slope * minX + intercept },
        { x: maxX, y: slope * maxX + intercept }
      ];

      const scatterData = {
        datasets: [
          {
            label: '實際樣本點',
            data: cleanPoints,
            backgroundColor: '#6366f1',
            pointRadius: 6,
            hoverPointRadius: 8
          },
          {
            label: '線性趨勢線',
            data: trendPoints,
            type: 'line',
            fill: false,
            borderColor: '#10b981',
            borderWidth: 2.5,
            pointRadius: 0,
            showLine: true
          }
        ]
      };

      const options = {
        responsive: true,
        plugins: {
          legend: { labels: { color: '#94a3b8', font: { size: 11 } } }
        },
        scales: {
          y: { 
            title: { display: true, text: yColName, color: '#94a3b8' },
            grid: { color: 'rgba(255, 255, 255, 0.05)' }, 
            ticks: { color: '#94a3b8' } 
          },
          x: { 
            title: { display: true, text: xColName, color: '#94a3b8' },
            grid: { color: 'rgba(255, 255, 255, 0.05)' }, 
            ticks: { color: '#94a3b8' } 
          }
        }
      };

      return (
        <div className="max-w-xl mx-auto bg-slate-950/20 border border-slate-850 p-6 rounded-2xl">
          <div className="flex items-center space-x-2 mb-4">
            <TrendingUp size={16} className="text-accentEmerald" />
            <span className="text-xs font-bold text-slate-400">變項散佈圖與擬合趨勢線</span>
          </div>
          <Scatter data={scatterData} options={options} height={120} />
        </div>
      );
    }

    // 4. Moderation Analysis (Interaction Lines Plot)
    if (method === 'moderation' && results.graphPoints) {
      const { graphPoints } = results;

      const lineData = {
        labels: ['低自變項 (-1 SD)', '高自變項 (+1 SD)'],
        datasets: [
          {
            label: '低調節項組 (-1 SD W)',
            data: [graphPoints.lowMod_lowIV, graphPoints.lowMod_highIV],
            borderColor: '#ec4899', // Pink
            backgroundColor: 'rgba(236, 72, 153, 0.1)',
            borderWidth: 3,
            tension: 0.1,
            pointRadius: 6,
          },
          {
            label: '高調節項組 (+1 SD W)',
            data: [graphPoints.highMod_lowIV, graphPoints.highMod_highIV],
            borderColor: '#06b6d4', // Cyan
            backgroundColor: 'rgba(6, 182, 212, 0.1)',
            borderWidth: 3,
            tension: 0.1,
            pointRadius: 6,
          }
        ]
      };

      const options = {
        responsive: true,
        plugins: {
          legend: { labels: { color: '#94a3b8', font: { size: 11 } } }
        },
        scales: {
          y: { 
            title: { display: true, text: `預測之 ${variableMapping.y}`, color: '#94a3b8' },
            grid: { color: 'rgba(255, 255, 255, 0.05)' }, 
            ticks: { color: '#94a3b8' } 
          },
          x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
        }
      };

      return (
        <div className="max-w-xl mx-auto bg-slate-950/20 border border-slate-850 p-6 rounded-2xl">
          <div className="flex items-center space-x-2 mb-4">
            <LineChart size={16} className="text-accentCyan" />
            <span className="text-xs font-bold text-slate-400">調節效果 (單純斜率 Simple Slopes) 交互作用圖</span>
          </div>
          <Line data={lineData} options={options} height={120} />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="glass-card p-8 my-6">
      <div className="flex items-center space-x-2 text-accentEmerald mb-6">
        <Presentation size={22} />
        <h2 className="text-xl font-bold tracking-tight text-slate-100">簡單分析描述統計與即時交互圖表</h2>
      </div>

      {renderDescriptives()}
      <div className="mt-8">
        {renderChart()}
      </div>
    </div>
  );
}
