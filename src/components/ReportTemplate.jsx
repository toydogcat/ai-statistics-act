import React, { useRef } from 'react';
import { Copy, Check, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ReportTemplate({ method, results, variableMapping }) {
  const [copiedText, setCopiedText] = React.useState(false);
  const [copiedTable, setCopiedTable] = React.useState(false);
  const tableRef = useRef(null);

  if (!results) {
    return (
      <div className="glass-card p-6 text-center my-6 flex flex-col items-center justify-center space-y-3">
        <AlertCircle size={32} className="text-slate-500" />
        <p className="text-sm text-slate-400">目前尚無分析數據，請於上方設定變項映射並點選「開始統計分析」。</p>
      </div>
    );
  }

  // Format numbers to fixed decimals (standard: 3 decimal places for stats, 2 for SD/Mean)
  const f = (num, decimals = 3) => {
    if (num === null || num === undefined || isNaN(num)) return '-';
    return Number(num).toFixed(decimals);
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'text') {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } else {
      setCopiedTable(true);
      setTimeout(() => setCopiedTable(false), 2000);
    }
  };

  // Helper to copy table as rich HTML (so it pastes as a real table in Word)
  const copyTableAsHTML = () => {
    if (!tableRef.current) return;
    const range = document.createRange();
    range.selectNode(tableRef.current);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    
    try {
      document.execCommand('copy');
      setCopiedTable(true);
      setTimeout(() => setCopiedTable(false), 2000);
    } catch (err) {
      console.error('HTML Copy failed', err);
    }
    window.getSelection().removeAllRanges();
  };

  // 1. Generate APA text and tables based on the method
  const getAPAReport = () => {
    let text = '';
    let table = null;

    if (method === 'ind-t') {
      const { desc1, desc2, equalAssumed, equalNotAssumed, levene } = results;
      const isLeveneSig = levene.p < 0.05;
      const finalStats = isLeveneSig ? equalNotAssumed : equalAssumed;
      
      const sigText = finalStats.p < 0.05 ? '達到顯著水準' : '未達到顯著水準';
      const sigRelation = finalStats.p < 0.05 ? '存在顯著差異' : '無顯著差異';
      const pStr = finalStats.p < 0.001 ? 'p < .001' : `p = ${f(finalStats.p)}`;
      const levPStr = levene.p < 0.001 ? 'p < .001' : `p = ${f(levene.p)}`;

      text = `本研究採用獨立樣本 t 檢定 (Independent Samples t-test) 探討不同組別在 ${variableMapping.y} 上的差異。
首先進行 Levene 同質性檢定，結果顯示 F = ${f(levene.f)}, ${levPStr}，${isLeveneSig ? '未符合變異數同質性假設，因此採用 Welch t 修正值。' : '符合變異數同質性假設，故採用未修正之 t 值。'}

統計分析顯示，第一個群組 (${variableMapping.group}) (M = ${f(desc1.mean, 2)}, SD = ${f(desc1.sd, 2)}, N = ${desc1.n}) 與 第二個群組 (M = ${f(desc2.mean, 2)}, SD = ${f(desc2.sd, 2)}, N = ${desc2.n}) 在 ${variableMapping.y} 上的比較結果：t(${f(finalStats.df, 1)}) = ${f(finalStats.t)}, ${pStr}，其差異${sigText}。
這意味著兩組在此變項上${sigRelation} (Cohen's d = ${f(finalStats.cohend, 2)})。`;

      table = (
        <table ref={tableRef} className="w-full text-sm text-slate-200 border-t-2 border-b-2 border-slate-700 mt-4 text-center">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-900/40">
              <th className="py-2 text-left px-4">變項/組別</th>
              <th className="py-2">N</th>
              <th className="py-2">M</th>
              <th className="py-2">SD</th>
              <th className="py-2">t 值</th>
              <th className="py-2">df</th>
              <th className="py-2">p 值</th>
              <th className="py-2">Cohen's d</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-2 text-left px-4 font-bold">{variableMapping.y}</td>
              <td className="py-2"></td>
              <td className="py-2"></td>
              <td className="py-2"></td>
              <td className="py-2" rowSpan="3">{f(finalStats.t)}</td>
              <td className="py-2" rowSpan="3">{f(finalStats.df, 1)}</td>
              <td className="py-2" rowSpan="3">{finalStats.p < 0.001 ? '< .001' : f(finalStats.p)}</td>
              <td className="py-2" rowSpan="3">{f(finalStats.cohend, 2)}</td>
            </tr>
            <tr className="border-t border-slate-800/40">
              <td className="py-2 text-left px-6 text-slate-400">第一組 (Group 1)</td>
              <td className="py-2 text-slate-400">{desc1.n}</td>
              <td className="py-2 text-slate-400">{f(desc1.mean, 2)}</td>
              <td className="py-2 text-slate-400">{f(desc1.sd, 2)}</td>
            </tr>
            <tr>
              <td className="py-2 text-left px-6 text-slate-400">第二組 (Group 2)</td>
              <td className="py-2 text-slate-400">{desc2.n}</td>
              <td className="py-2 text-slate-400">{f(desc2.mean, 2)}</td>
              <td className="py-2 text-slate-400">{f(desc2.sd, 2)}</td>
            </tr>
          </tbody>
        </table>
      );
    } 
    
    else if (method === 'dep-t') {
      const { n, meanDiff, sdDiff, seDiff, t, df, p, cohend } = results;
      const sigText = p < 0.05 ? '達到顯著水準' : '未達到顯著水準';
      const sigRelation = p < 0.05 ? '有顯著差異' : '無顯著差異';
      const pStr = p < 0.001 ? 'p < .001' : `p = ${f(p)}`;

      text = `本研究採用相依樣本 t 檢定 (Paired Samples t-test) 探討 ${variableMapping.pre} 與 ${variableMapping.post} 的前後測表現差異。
統計分析結果顯示，受試者在 ${variableMapping.post} 的分數與 ${variableMapping.pre} 相比，其平均數差異值 M_diff = ${f(meanDiff, 2)}, SD_diff = ${f(sdDiff, 2)}，檢定值為 t(${df}) = ${f(t)}, ${pStr}，且${sigText}。
這顯示前後測分數${sigRelation} (Cohen's d = ${f(cohend, 2)})。`;

      table = (
        <table ref={tableRef} className="w-full text-sm text-slate-200 border-t-2 border-b-2 border-slate-700 mt-4 text-center">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-900/40">
              <th className="py-2 text-left px-4">測量變項</th>
              <th className="py-2">N</th>
              <th className="py-2">差異平均數 M</th>
              <th className="py-2">差異標準差 SD</th>
              <th className="py-2">標準誤差 SE</th>
              <th className="py-2">t 值</th>
              <th className="py-2">df</th>
              <th className="py-2">p 值</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-800/40">
              <td className="py-2 text-left px-4 font-bold">{variableMapping.post} - {variableMapping.pre}</td>
              <td className="py-2">{n}</td>
              <td className="py-2">{f(meanDiff, 2)}</td>
              <td className="py-2">{f(sdDiff, 2)}</td>
              <td className="py-2">{f(seDiff, 3)}</td>
              <td className="py-2">{f(t)}</td>
              <td className="py-2">{df}</td>
              <td className="py-2">{p < 0.001 ? '< .001' : f(p)}</td>
            </tr>
          </tbody>
        </table>
      );
    } 
    
    else if (method === 'correlation') {
      const { n, r, t, df, p } = results;
      const sigText = p < 0.05 ? '達到顯著相關' : '未達到顯著相關';
      const dirText = r > 0 ? '正相關' : '負相關';
      const strength = Math.abs(r) > 0.7 ? '高度' : Math.abs(r) > 0.4 ? '中度' : '低度';
      const pStr = p < 0.001 ? 'p < .001' : `p = ${f(p)}`;

      text = `本研究採用 Pearson 積差相關 (Pearson Product-Moment Correlation) 探討 ${variableMapping.x} 與 ${variableMapping.y} 之間的線性關係。
分析結果顯示，在樣本數 N = ${n} 下，兩者的相關係數 r = ${f(r, 3)}，檢定值 t(${df}) = ${f(t)}, ${pStr}，已${sigText}。
這意味著 ${variableMapping.x} 與 ${variableMapping.y} 之間呈現 ${strength}的${dirText}關係。`;

      table = (
        <table ref={tableRef} className="w-full text-sm text-slate-200 border-t-2 border-b-2 border-slate-700 mt-4 text-center">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-900/40">
              <th className="py-2 text-left px-4">變項</th>
              <th className="py-2">N</th>
              <th className="py-2">Pearson r 相關</th>
              <th className="py-2">決定係數 r²</th>
              <th className="py-2">t 值</th>
              <th className="py-2">df</th>
              <th className="py-2">p 值</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-800/40">
              <td className="py-2 text-left px-4 font-bold">{variableMapping.x} × {variableMapping.y}</td>
              <td className="py-2">{n}</td>
              <td className="py-2 font-black text-accentEmerald">{f(r, 3)}</td>
              <td className="py-2">{f(r*r, 3)}</td>
              <td className="py-2">{f(t)}</td>
              <td className="py-2">{df}</td>
              <td className="py-2">{p < 0.001 ? '< .001' : f(p)}</td>
            </tr>
          </tbody>
        </table>
      );
    } 
    
    else if (method === 'oneway-anova') {
      const { eta2, table: tabData, postHoc, descInfo } = results;
      const { between, within, total } = tabData;
      
      const sigText = between.p < 0.05 ? '達到顯著差異' : '未達到顯著差異';
      const pStr = between.p < 0.001 ? 'p < .001' : `p = ${f(between.p)}`;

      text = `本研究採用單因子獨立樣本變異數分析 (One-way Independent ANOVA) 探討分組變項 ${variableMapping.group} 對連續依變項 ${variableMapping.y} 的影響。
變異數分析結果顯示：F(${between.df}, ${within.df}) = ${f(between.f)}, ${pStr}，整體組間比較${sigText} (效果值 η² = ${f(eta2, 3)})。

${between.p < 0.05 ? `由於結果顯著，進一步採用 Bonferroni 法進行事後比較 (Post-Hoc Comparisons)：
` + postHoc.map(ph => {
        const phSig = ph.p < 0.05 ? '顯著優於' : '與';
        const phRelation = ph.p < 0.05 ? '有顯著差異' : '無顯著差異';
        return `* 組別 [${ph.groupA}] (M = ${f(descInfo[ph.groupA].mean, 2)}) ${phSig} 組別 [${ph.groupB}] (M = ${f(descInfo[ph.groupB].mean, 2)}) (平均值偏差 = ${f(ph.meanDiff, 2)}, 事後調整 p = ${f(ph.p, 3)})，兩者${phRelation}。`;
      }).join('\n') : '由於整體檢定未達顯著水準，無須進行事後比較。'}`;

      table = (
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-slate-400 mt-4">【APA 三線 ANOVA 變異數來源表】</h4>
          <table ref={tableRef} className="w-full text-sm text-slate-200 border-t-2 border-b-2 border-slate-700 text-center">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-900/40">
                <th className="py-2 text-left px-4">變異來源 (Source)</th>
                <th className="py-2">平方和 (SS)</th>
                <th className="py-2">自由度 (df)</th>
                <th className="py-2">均方 (MS)</th>
                <th className="py-2">F 值</th>
                <th className="py-2">p 值 (Sig.)</th>
                <th className="py-2">效果值 η²</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-2 text-left px-4 text-slate-300">組間 (Between Groups)</td>
                <td className="py-2">{f(between.ss, 2)}</td>
                <td className="py-2">{between.df}</td>
                <td className="py-2">{f(between.ms, 2)}</td>
                <td className="py-2" rowSpan="2" style={{ verticalAlign: 'middle' }}>{f(between.f)}</td>
                <td className="py-2" rowSpan="2" style={{ verticalAlign: 'middle' }}>{between.p < 0.001 ? '< .001' : f(between.p)}</td>
                <td className="py-2" rowSpan="2" style={{ verticalAlign: 'middle' }}>{f(eta2, 3)}</td>
              </tr>
              <tr className="border-b border-slate-800/40">
                <td className="py-2 text-left px-4 text-slate-400">組內 (Within Groups)</td>
                <td className="py-2 text-slate-400">{f(within.ss, 2)}</td>
                <td className="py-2 text-slate-400">{within.df}</td>
                <td className="py-2 text-slate-400">{f(within.ms, 2)}</td>
              </tr>
              <tr>
                <td className="py-2 text-left px-4 font-bold">總和 (Total)</td>
                <td className="py-2">{f(total.ss, 2)}</td>
                <td className="py-2">{total.df}</td>
                <td className="py-2"></td>
                <td className="py-2"></td>
                <td className="py-2"></td>
                <td className="py-2"></td>
              </tr>
            </tbody>
          </table>
        </div>
      );
    } 
    
    else if (method === 'regression') {
      const { r2, adjR2, table: tabData, coefficients } = results;
      const { regression, residual } = tabData;
      
      const sigText = regression.p < 0.05 ? '具有顯著預測力' : '未達顯著預測力';
      const pStr = regression.p < 0.001 ? 'p < .001' : `p = ${f(regression.p)}`;

      text = `本研究採用複線性迴歸分析 (Multiple Linear Regression) 探討自變項對依變項 ${variableMapping.y} 的預測效果。
整體模型擬合度檢定結果顯示：F(${regression.df}, ${residual.df}) = ${f(regression.f)}, ${pStr}，整個迴歸模型對依變項${sigText}。
模型的決定係數 R² = ${f(r2, 3)} (調整後 R² = ${f(adjR2, 3)})，表示自變項能解釋依變項 ${f(r2 * 100, 1)}% 的變異量。

各迴歸係數分析如下：
` + coefficients.map(c => {
        const cSig = c.p < 0.05 ? '顯著' : '不顯著';
        return `* [${c.name}]: 迴歸係數 B = ${f(c.b, 3)}, 標準誤差 SE = ${f(c.se, 3)}, 標準化係數 Beta = ${f(c.beta, 3)}, 檢定值 t = ${f(c.t)}, p = ${f(c.p, 3)} (${cSig})。`;
      }).join('\n');

      table = (
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-slate-400 mt-4">【APA 迴歸係數與顯著性檢定表】</h4>
          <table ref={tableRef} className="w-full text-sm text-slate-200 border-t-2 border-b-2 border-slate-700 text-center">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-900/40">
                <th className="py-2 text-left px-4">預測變項</th>
                <th className="py-2">未標準化 B</th>
                <th className="py-2">標準誤差 SE</th>
                <th className="py-2">標準化 Beta</th>
                <th className="py-2">t 檢定值</th>
                <th className="py-2">p 值</th>
              </tr>
            </thead>
            <tbody>
              {coefficients.map((c, idx) => (
                <tr key={idx} className="border-b border-slate-800/40">
                  <td className="py-2 text-left px-4 font-bold">{c.name}</td>
                  <td className="py-2">{f(c.b, 3)}</td>
                  <td className="py-2">{f(c.se, 3)}</td>
                  <td className="py-2">{c.name.includes('Constant') ? '-' : f(c.beta, 3)}</td>
                  <td className="py-2">{f(c.t)}</td>
                  <td className="py-2">{c.p < 0.001 ? '< .001' : f(c.p)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    } 
    
    else if (method === 'moderation') {
      const { r2, coefs, simpleSlopes, graphPoints } = results;
      const { constant, iv, mod, interaction } = coefs;

      const intSigText = interaction.p < 0.05 ? '達到顯著水準' : '未達顯著水準';
      const intRelation = interaction.p < 0.05 ? '代表調節效果(交互作用)成立。' : '代表調節效果不成立。';
      const pStr = interaction.p < 0.001 ? 'p < .001' : `p = ${f(interaction.p)}`;

      text = `本研究探討了自變項 ${variableMapping.x} 對依變項 ${variableMapping.y} 的預測關係是否會受到調節變項 ${variableMapping.w} 的調節作用。
將自變項與調節變項進行「中心化」(Mean Centering) 後，乘積項 (Interaction) 之迴歸係數估計為 B = ${f(interaction.b, 3)}, SE = ${f(interaction.se, 3)}，檢定值 t = ${f(interaction.t)}, ${pStr}，且${intSigText}，${intRelation}
整個調節模型的解釋變異量 R² = ${f(r2, 3)}。

進行「單純斜率檢定」(Simple Slopes Test) 以進一步剖析調節效果：
1. 當調節變項 [${variableMapping.w}] 數值較高時 (+1 SD)：
   單純斜率 (Simple Slope) = ${f(simpleSlopes.high.val, 3)}, t = ${f(simpleSlopes.high.t)}, p = ${f(simpleSlopes.high.p, 3)}，代表在此狀態下，自變項對依變項有【${simpleSlopes.high.p < 0.05 ? '顯著' : '不顯著'}】的預測效果。
2. 當調節變項 [${variableMapping.w}] 數值較低時 (-1 SD)：
   單純斜率 (Simple Slope) = ${f(simpleSlopes.low.val, 3)}, t = ${f(simpleSlopes.low.t)}, p = ${f(simpleSlopes.low.p, 3)}，代表在此狀態下，自變項對依變項有【${simpleSlopes.low.p < 0.05 ? '顯著' : '不顯著'}】的預測效果。`;

      table = (
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-slate-400 mt-4">【APA 調節效果 (交互作用) 係數表】</h4>
          <table ref={tableRef} className="w-full text-sm text-slate-200 border-t-2 border-b-2 border-slate-700 text-center">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-900/40">
                <th className="py-2 text-left px-4">變項 (中心化後)</th>
                <th className="py-2">迴歸係數 B</th>
                <th className="py-2">標準誤差 SE</th>
                <th className="py-2">t 檢定值</th>
                <th className="py-2">p 值</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-2 text-left px-4 font-bold">截距 (Constant)</td>
                <td className="py-2">{f(constant.b, 3)}</td>
                <td className="py-2">{f(constant.se, 3)}</td>
                <td className="py-2">-</td>
                <td className="py-2">-</td>
              </tr>
              <tr className="border-t border-slate-850">
                <td className="py-2 text-left px-4 font-bold">自變項 ({variableMapping.x})</td>
                <td className="py-2">{f(iv.b, 3)}</td>
                <td className="py-2">{f(iv.se, 3)}</td>
                <td className="py-2">{f(iv.t)}</td>
                <td className="py-2">{iv.p < 0.001 ? '< .001' : f(iv.p)}</td>
              </tr>
              <tr>
                <td className="py-2 text-left px-4 font-bold">調節變項 ({variableMapping.w})</td>
                <td className="py-2">{f(mod.b, 3)}</td>
                <td className="py-2">{f(mod.se, 3)}</td>
                <td className="py-2">{f(mod.t)}</td>
                <td className="py-2">{mod.p < 0.001 ? '< .001' : f(mod.p)}</td>
              </tr>
              <tr className="text-accentEmerald">
                <td className="py-2 text-left px-4 font-bold">交互乘積項 ({variableMapping.x} × {variableMapping.w})</td>
                <td className="py-2">{f(interaction.b, 3)}</td>
                <td className="py-2">{f(interaction.se, 3)}</td>
                <td className="py-2">{f(interaction.t)}</td>
                <td className="py-2">{interaction.p < 0.001 ? '< .001' : f(interaction.p)}</td>
              </tr>
              <tr className="border-t border-slate-700 bg-slate-900/20 font-semibold">
                <td className="py-2 text-left px-4" colSpan="5">【單純斜率檢定 Simple Slopes Test】</td>
              </tr>
              <tr>
                <td className="py-2 text-left px-4 text-slate-400">└ 高調節項組 (+1 SD)</td>
                <td className="py-2 text-slate-400">{f(simpleSlopes.high.val, 3)}</td>
                <td className="py-2 text-slate-400">{f(simpleSlopes.high.se, 3)}</td>
                <td className="py-2 text-slate-400">{f(simpleSlopes.high.t)}</td>
                <td className="py-2 text-slate-400">{simpleSlopes.high.p < 0.001 ? '< .001' : f(simpleSlopes.high.p)}</td>
              </tr>
              <tr>
                <td className="py-2 text-left px-4 text-slate-400">└ 低調節項組 (-1 SD)</td>
                <td className="py-2 text-slate-400">{f(simpleSlopes.low.val, 3)}</td>
                <td className="py-2 text-slate-400">{f(simpleSlopes.low.se, 3)}</td>
                <td className="py-2 text-slate-400">{f(simpleSlopes.low.t)}</td>
                <td className="py-2 text-slate-400">{simpleSlopes.low.p < 0.001 ? '< .001' : f(simpleSlopes.low.p)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      );
    } 
    
    else if (method === 'chisquare') {
      const { n, catsX, catsY, observed, expected, rowTotals, colTotals, chi2, df, p, cramersV } = results;
      const sigText = p < 0.05 ? '達到顯著水準' : '未達到顯著水準';
      const sigRelation = p < 0.05 ? '存在顯著相關/關聯性' : '無顯著關聯性';
      const pStr = p < 0.001 ? 'p < .001' : `p = ${f(p)}`;

      text = `本研究採用卡方獨立性檢定 (Chi-square Test of Independence) 探討類別變項 ${variableMapping.x} 與 ${variableMapping.y} 之間是否具有關聯性。
統計分析結果顯示，在有效樣本數 N = ${n} 下，卡方檢定值 X²(${df}) = ${f(chi2)}, ${pStr}，且${sigText}。
這意味著兩變項之間${sigRelation} (Cramer's V = ${f(cramersV, 2)})。`;

      table = (
        <table ref={tableRef} className="w-full text-sm text-slate-200 border-t-2 border-b-2 border-slate-700 mt-4 text-center">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-900/40">
              <th className="py-2 text-left px-4">{variableMapping.x} × {variableMapping.y}</th>
              {catsY.map(cat => <th key={cat} className="py-2">{cat} (實際/預期)</th>)}
              <th className="py-2">總計</th>
            </tr>
          </thead>
          <tbody>
            {catsX.map((catX, rIdx) => (
              <tr key={catX} className="border-b border-slate-800/40">
                <td className="py-2 text-left px-4 font-bold">{catX}</td>
                {catsY.map((catY, cIdx) => (
                  <td key={catY} className="py-2">
                    {observed[rIdx][cIdx]} / {f(expected[rIdx][cIdx], 1)}
                  </td>
                ))}
                <td className="py-2 font-semibold text-slate-400">{rowTotals[rIdx]}</td>
              </tr>
            ))}
            <tr className="font-bold bg-slate-900/20">
              <td className="py-2 text-left px-4 text-slate-400">總計</td>
              {colTotals.map((tot, cIdx) => <td key={cIdx} className="py-2 text-slate-400">{tot}</td>)}
              <td className="py-2 text-accentViolet">{n}</td>
            </tr>
            <tr className="border-t border-slate-700 text-xs text-slate-400 font-semibold text-left">
              <td className="py-2 px-4" colSpan={catsY.length + 2}>
                Pearson X² = {f(chi2)}, df = {df}, p = {p < 0.001 ? '< .001' : f(p)}, Cramer's V = {f(cramersV, 2)}
              </td>
            </tr>
          </tbody>
        </table>
      );
    }

    else if (method === 'mediation') {
      const { n, totalEffect, directEffect, indirectEffect, pathA, pathB, sobel } = results;
      const sobelSig = sobel.p < 0.05 ? '達到顯著水準' : '未達顯著水準';
      const medRelation = sobel.p < 0.05 ? '中介效果顯著成立' : '中介效果不成立';
      const pSobelStr = sobel.p < 0.001 ? 'p < .001' : `p = ${f(sobel.p)}`;

      text = `本研究採用 Baron & Kenny 的中介分析步驟與 Sobel 檢定 (Sobel Test) 探討 ${variableMapping.x} (自變項) 透過 ${variableMapping.w} (中介變項) 對 ${variableMapping.y} (依變項) 的中介效果。
統計分析結果顯示：
1. 路徑 a (X -> M)：B = ${f(pathA.b, 3)}, SE = ${f(pathA.se, 3)}, t = ${f(pathA.t)}, p = ${f(pathA.p, 3)}。
2. 路徑 b (M -> Y)：B = ${f(pathB.b, 3)}, SE = ${f(pathB.se, 3)}, t = ${f(pathB.t)}, p = ${f(pathB.p, 3)}。
3. 總效果 c (X -> Y)：B = ${f(totalEffect, 3)}。
4. 直接效果 c' (X -> Y)：B = ${f(directEffect, 3)}。
5. 間接效果 (ab)：ab = ${f(indirectEffect, 3)}。

進行 Sobel 檢定評估間接效果的顯著性，結果顯示：Z = ${f(sobel.z)}, SE = ${f(sobel.se, 3)}, ${pSobelStr}，間接路徑${sobelSig}，${medRelation}。`;

      table = (
        <table ref={tableRef} className="w-full text-sm text-slate-200 border-t-2 border-b-2 border-slate-700 mt-4 text-center">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-900/40">
              <th className="py-2 text-left px-4">路徑 / 效果</th>
              <th className="py-2">效應值 (B)</th>
              <th className="py-2">標準誤差 SE</th>
              <th className="py-2">t / Z 檢定值</th>
              <th className="py-2">p 值</th>
              <th className="py-2">顯著性</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-800/40">
              <td className="py-2 text-left px-4 font-bold">路徑 a (自變項 &rarr; 中介變項)</td>
              <td className="py-2">{f(pathA.b, 3)}</td>
              <td className="py-2">{f(pathA.se, 3)}</td>
              <td className="py-2">{f(pathA.t)}</td>
              <td className="py-2">{pathA.p < 0.001 ? '< .001' : f(pathA.p)}</td>
              <td className="py-2">{pathA.p < 0.05 ? '★ 顯著' : '不顯著'}</td>
            </tr>
            <tr className="border-b border-slate-800/40">
              <td className="py-2 text-left px-4 font-bold">路徑 b (中介變項 &rarr; 依變項)</td>
              <td className="py-2">{f(pathB.b, 3)}</td>
              <td className="py-2">{f(pathB.se, 3)}</td>
              <td className="py-2">{f(pathB.t)}</td>
              <td className="py-2">{pathB.p < 0.001 ? '< .001' : f(pathB.p)}</td>
              <td className="py-2">{pathB.p < 0.05 ? '★ 顯著' : '不顯著'}</td>
            </tr>
            <tr className="border-b border-slate-800/40 text-slate-400">
              <td className="py-2 text-left px-4">總效果 c (X &rarr; Y)</td>
              <td className="py-2">{f(totalEffect, 3)}</td>
              <td className="py-2">-</td>
              <td className="py-2">-</td>
              <td className="py-2">-</td>
              <td className="py-2">-</td>
            </tr>
            <tr className="border-b border-slate-800/40 text-slate-400">
              <td className="py-2 text-left px-4">直接效果 c' (X &rarr; Y)</td>
              <td className="py-2">{f(directEffect, 3)}</td>
              <td className="py-2">-</td>
              <td className="py-2">-</td>
              <td className="py-2">-</td>
              <td className="py-2">-</td>
            </tr>
            <tr className="text-accentEmerald">
              <td className="py-2 text-left px-4 font-bold">間接效果 ab (Sobel Test)</td>
              <td className="py-2 font-black">{f(indirectEffect, 3)}</td>
              <td className="py-2">{f(sobel.se, 3)}</td>
              <td className="py-2">{f(sobel.z)}</td>
              <td className="py-2">{sobel.p < 0.001 ? '< .001' : f(sobel.p)}</td>
              <td className="py-2 font-bold">{sobel.p < 0.05 ? '★ 顯著' : '不顯著'}</td>
            </tr>
          </tbody>
        </table>
      );
    }

    else if (method === 'reliability') {
      const { n, numItems, alpha, itemAnalysis } = results;
      const strength = alpha > 0.9 ? '極佳' : alpha > 0.7 ? '良好' : alpha > 0.5 ? '普通' : '不佳';
      const alphaStr = f(alpha, 3);

      text = `本研究採用 Cronbach's Alpha 信度分析評估所選取之 ${numItems} 個問卷題目的內部一致性 (Internal Consistency)。
統計分析結果顯示，整體量表信度 Cronbach's α = ${alphaStr}，顯示該量表題目在此樣本數下具有【${strength}】的信度表現（一般以大於 .70 作為良好內部一致性指標）。

項目分析 (Item-Total Analysis) 結果顯示各題目刪除後之信度與相關係數：若有題目之「刪除該題後之 Cronbach's α」明顯高於整體 α 值，或「修正後項目與總分相關」小於 .30，則該題目可考慮刪除以提升量表信度。`;

      table = (
        <table ref={tableRef} className="w-full text-sm text-slate-200 border-t-2 border-b-2 border-slate-700 mt-4 text-center">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-900/40">
              <th className="py-2 text-left px-4">分析項目 (題目)</th>
              <th className="py-2">平均數 M</th>
              <th className="py-2">標準差 SD</th>
              <th className="py-2">項目與總分相關</th>
              <th className="py-2">刪除後 Cronbach's α</th>
            </tr>
          </thead>
          <tbody>
            {itemAnalysis.map((item, idx) => (
              <tr key={idx} className="border-b border-slate-800/40">
                <td className="py-2 text-left px-4 font-bold">題目 {idx + 1} ({variableMapping.reliabilityItems ? variableMapping.reliabilityItems[item.itemIndex] : `Item ${item.itemIndex + 1}`})</td>
                <td className="py-2">{f(item.mean, 2)}</td>
                <td className="py-2">{f(item.sd, 2)}</td>
                <td className={`py-2 font-medium ${item.correctedCorrelation < 0.3 ? 'text-rose-400' : 'text-slate-300'}`}>
                  {f(item.correctedCorrelation, 3)}
                </td>
                <td className={`py-2 ${item.alphaIfDeleted > alpha ? 'text-amber-400 font-bold' : 'text-slate-400'}`}>
                  {f(item.alphaIfDeleted, 3)}
                </td>
              </tr>
            ))}
            <tr className="font-bold bg-slate-900/30 text-accentEmerald">
              <td className="py-3 text-left px-4">整體量表 (N = {n}, 題數 = {numItems})</td>
              <td className="py-3">-</td>
              <td className="py-3">-</td>
              <td className="py-3">-</td>
              <td className="py-3 font-black text-base">{alphaStr}</td>
            </tr>
          </tbody>
        </table>
      );
    }

    return { text, table };
  };

  const { text: reportText, table: reportTable } = getAPAReport();

  return (
    <div className="glass-card p-8 my-8 border-accentViolet/20 relative overflow-hidden">
      
      {/* Background ambient light */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-accentViolet/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex items-center space-x-2 text-accentViolet mb-6">
        <FileText size={22} />
        <h2 className="text-xl font-bold tracking-tight text-slate-100">學術級 APA 格式自動報告生成器</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Col: Dynamic Description Text */}
        <div className="lg:col-span-6 flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              論文描述與結果撰寫 (標準中文範本)
            </span>
            <button
              onClick={() => copyToClipboard(reportText, 'text')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all cursor-pointer"
            >
              {copiedText ? (
                <>
                  <CheckCircle2 size={12} className="text-accentEmerald" />
                  <span className="text-accentEmerald">已複製</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span>複製內文</span>
                </>
              )}
            </button>
          </div>

          <div className="bg-[#0b0c10] border border-slate-850 rounded-2xl p-6 text-sm text-slate-300 leading-relaxed font-sans min-h-[220px] whitespace-pre-wrap">
            {reportText}
          </div>
        </div>

        {/* Right Col: Standard APA Three-Line Table */}
        <div className="lg:col-span-6 flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              標準 APA 三線統計表 (複製可直貼 Word)
            </span>
            <button
              onClick={copyTableAsHTML}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all cursor-pointer"
            >
              {copiedTable ? (
                <>
                  <CheckCircle2 size={12} className="text-accentEmerald" />
                  <span className="text-accentEmerald">已複製表格</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span>複製表格</span>
                </>
              )}
            </button>
          </div>

          <div className="bg-[#0b0c10] border border-slate-850 rounded-2xl p-6 flex flex-col justify-center min-h-[220px] overflow-x-auto">
            {reportTable}
          </div>
        </div>

      </div>

    </div>
  );
}
