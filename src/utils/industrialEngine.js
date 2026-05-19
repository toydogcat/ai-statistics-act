import { normalCDF } from './distTable.js';

// --- Montgomery Textbook Quality Control Constants (Subgroup n = 2 to 10) ---
export const SPC_CONSTANTS = {
  // factors for X-bar chart using R (A2)
  a2: [null, null, 1.880, 1.023, 0.729, 0.577, 0.483, 0.419, 0.373, 0.337, 0.308],
  // factors for R chart (D3, D4)
  d3: [null, null, 0.000, 0.000, 0.000, 0.000, 0.000, 0.076, 0.136, 0.184, 0.223],
  d4: [null, null, 3.267, 2.574, 2.282, 2.114, 2.004, 1.924, 1.864, 1.816, 1.777],
  // standard deviation divisor factor (d2)
  d2: [null, null, 1.128, 1.693, 2.059, 2.326, 2.534, 2.704, 2.847, 2.970, 3.078],
  
  // factors for X-bar chart using s (A3)
  a3: [null, null, 2.659, 1.954, 1.628, 1.427, 1.287, 1.182, 1.099, 1.032, 0.975],
  // factors for s chart (B3, B4)
  b3: [null, null, 0.000, 0.000, 0.000, 0.000, 0.030, 0.118, 0.185, 0.239, 0.284],
  b4: [null, null, 3.267, 2.568, 2.266, 2.089, 1.970, 1.882, 1.815, 1.761, 1.716],
  // standard deviation divisor factor for s (c4)
  c4: [null, null, 0.7979, 0.8862, 0.9213, 0.9400, 0.9515, 0.9594, 0.9650, 0.9693, 0.9727]
};

/**
 * Basic Descriptive Helpers
 */
export function calculateBasicStats(arr) {
  const clean = arr.filter(v => v !== null && v !== undefined && !isNaN(v));
  const n = clean.length;
  if (n === 0) return { n: 0, mean: 0, sd: 0, min: 0, max: 0, range: 0 };
  
  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const range = max - min;
  const sum = clean.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  
  const varianceSum = clean.reduce((a, b) => a + Math.pow(b - mean, 2), 0);
  const variance = n > 1 ? varianceSum / (n - 1) : 0;
  const sd = Math.sqrt(variance);
  
  return { n, mean, sd, min, max, range };
}

/**
 * Sensitizing Rules for Control Charts (Western Electric & Nelson Rules)
 */
function checkWesternElectricRules(points, cl, sigma) {
  if (sigma <= 0) return points; // Cannot evaluate if sigma is 0

  return points.map((p, i) => {
    const violations = [];
    const val = p.val;
    if (val === null || val === undefined) return { ...p, violations };

    const diff = val - cl;
    const z = diff / sigma; 
    
    // Rule 1: 1 point outside 3-sigma (already covered by ucl/lcl, but we explicitly flag it)
    if (Math.abs(z) > 3) violations.push("Rule 1 (>3σ)");

    // Rule 2: 2 of 3 consecutive points > 2-sigma on same side
    if (i >= 2) {
      const recent = [points[i-2], points[i-1], points[i]];
      const side = z > 0 ? 1 : -1;
      const count2Sig = recent.filter(pt => {
        if (pt.val === null || pt.val === undefined) return false;
        const ptZ = (pt.val - cl) / sigma;
        return (ptZ * side) > 2;
      }).length;
      if (count2Sig >= 2) violations.push("Rule 2 (2 of 3 > 2σ)");
    }

    // Rule 3: 4 of 5 consecutive points > 1-sigma on same side
    if (i >= 4) {
      const recent = points.slice(i-4, i+1);
      const side = z > 0 ? 1 : -1;
      const count1Sig = recent.filter(pt => {
        if (pt.val === null || pt.val === undefined) return false;
        const ptZ = (pt.val - cl) / sigma;
        return (ptZ * side) > 1;
      }).length;
      if (count1Sig >= 4) violations.push("Rule 3 (4 of 5 > 1σ)");
    }

    // Rule 4: 8 consecutive points on same side of center line
    if (i >= 7) {
      const recent = points.slice(i-7, i+1);
      const side = z > 0 ? 1 : -1;
      const countSameSide = recent.filter(pt => {
        if (pt.val === null || pt.val === undefined) return false;
        const ptZ = (pt.val - cl) / sigma;
        return (ptZ * side) > 0;
      }).length;
      if (countSameSide === 8) violations.push("Rule 4 (8 on same side)");
    }

    // Rule 5: 6 consecutive points monotonically increasing or decreasing
    if (i >= 5) {
      const recent = points.slice(i-5, i+1);
      let inc = true;
      let dec = true;
      for (let j = 1; j < 6; j++) {
        if (recent[j].val === null || recent[j-1].val === null) { inc = false; dec = false; break; }
        if (recent[j].val <= recent[j-1].val) inc = false;
        if (recent[j].val >= recent[j-1].val) dec = false;
      }
      if (inc || dec) violations.push("Rule 5 (6 trending)");
    }

    return {
      ...p,
      violations,
      out: p.out || violations.length > 0
    };
  });
}

/**
 * 1. Statistical Process Control (SPC) Engine
 * Supported types:
 * - 'xbar-r': X-bar and R Chart (Subgrouped)
 * - 'xbar-s': X-bar and s Chart (Subgrouped)
 * - 'imr': Individual and Moving Range Chart (Continuous series)
 * - 'p': Defect Rate Chart (Attribute, variable/constant sample size)
 * - 'np': Defect Count Chart (Attribute, constant sample size)
 * - 'c': Defect Count Chart (Attribute, constant unit count)
 * - 'u': Defects per Unit Chart (Attribute, variable/constant sample size)
 * - 'ewma': Exponentially Weighted Moving Average (for small shifts)
 * - 'cusum': Cumulative Sum Chart (for small shifts)
 */
export function calculateSPC(rawValues, chartType, subgroupSize = 5, params = {}) {
  // Filter out completely invalid values
  const values = rawValues.filter(v => v !== null && v !== undefined && !isNaN(v));
  if (values.length === 0) return null;

  if (chartType === 'xbar-r' || chartType === 'xbar-s') {
    const k = subgroupSize;
    if (k < 2 || k > 10) return { error: "子群大小 (Subgroup Size) 必須介於 2 與 10 之間！" };
    
    // Group values into subgroups of size k
    const subgroups = [];
    for (let i = 0; i < values.length; i += k) {
      const sub = values.slice(i, i + k);
      if (sub.length === k) { // Only take full subgroups
        subgroups.push(sub);
      }
    }
    
    if (subgroups.length === 0) {
      return { error: `資料不足，無法組成大小為 ${k} 的完整子群！` };
    }

    const subgroupStats = subgroups.map((sub, idx) => {
      const stats = calculateBasicStats(sub);
      return {
        sampleIndex: idx + 1,
        raw: sub,
        mean: stats.mean,
        range: stats.range,
        sd: stats.sd
      };
    });

    const numSubgroups = subgroupStats.length;
    const meanOfMeans = subgroupStats.reduce((sum, s) => sum + s.mean, 0) / numSubgroups;
    const meanOfRanges = subgroupStats.reduce((sum, s) => sum + s.range, 0) / numSubgroups;
    const meanOfSds = subgroupStats.reduce((sum, s) => sum + s.sd, 0) / numSubgroups;

    let xUCL, xLCL;
    let secUCL, secLCL, secCL; // Secondary chart (R or s) limits

    if (chartType === 'xbar-r') {
      const a2 = SPC_CONSTANTS.a2[k];
      const d3 = SPC_CONSTANTS.d3[k];
      const d4 = SPC_CONSTANTS.d4[k];

      xUCL = meanOfMeans + a2 * meanOfRanges;
      xLCL = meanOfMeans - a2 * meanOfRanges;

      secCL = meanOfRanges;
      secUCL = d4 * meanOfRanges;
      secLCL = d3 * meanOfRanges;
    } else { // xbar-s
      const a3 = SPC_CONSTANTS.a3[k];
      const b3 = SPC_CONSTANTS.b3[k];
      const b4 = SPC_CONSTANTS.b4[k];

      xUCL = meanOfMeans + a3 * meanOfSds;
      xLCL = meanOfMeans - a3 * meanOfSds;

      secCL = meanOfSds;
      secUCL = b4 * meanOfSds;
      secLCL = b3 * meanOfSds;
    }

    // Process subgroups and check control violations
    let primaryPoints = subgroupStats.map(s => ({
      index: s.sampleIndex,
      val: s.mean,
      ucl: xUCL,
      cl: meanOfMeans,
      lcl: xLCL,
      out: s.mean > xUCL || s.mean < xLCL
    }));

    let secondaryPoints = subgroupStats.map(s => {
      const val = chartType === 'xbar-r' ? s.range : s.sd;
      return {
        index: s.sampleIndex,
        val: val,
        ucl: secUCL,
        cl: secCL,
        lcl: secLCL,
        out: val > secUCL || val < secLCL
      };
    });

    // Apply Western Electric Rules
    const sigmaX = (xUCL - meanOfMeans) / 3;
    primaryPoints = checkWesternElectricRules(primaryPoints, meanOfMeans, sigmaX);

    return {
      chartType,
      subgroupSize: k,
      numSubgroups,
      meanOfMeans,
      meanOfRanges,
      meanOfSds,
      primary: {
        title: "平均值管制圖 (X-bar Chart)",
        ucl: xUCL,
        cl: meanOfMeans,
        lcl: xLCL,
        points: primaryPoints
      },
      secondary: {
        title: chartType === 'xbar-r' ? "全距管制圖 (R Chart)" : "標準差管制圖 (s Chart)",
        ucl: secUCL,
        cl: secCL,
        lcl: secLCL,
        points: secondaryPoints
      },
      rawSubgroupStats: subgroupStats
    };
  }
  
  else if (chartType === 'imr') {
    // Individual and Moving Range Chart
    if (values.length < 2) return { error: "個別值與移動全距管制圖 (I-MR) 至少需要 2 個觀測值！" };

    const n = values.length;
    const movingRanges = [];
    for (let i = 1; i < n; i++) {
      movingRanges.push(Math.abs(values[i] - values[i - 1]));
    }

    const meanX = values.reduce((sum, v) => sum + v, 0) / n;
    const meanMR = movingRanges.reduce((sum, mr) => sum + mr, 0) / (n - 1);

    // Factors for individual chart (n = 2 subgroups)
    // d2 = 1.128, D4 = 3.267, D3 = 0
    const d2 = 1.128;
    const d3 = 0;
    const d4 = 3.267;

    const xUCL = meanX + 3 * (meanMR / d2);
    const xLCL = meanX - 3 * (meanMR / d2);

    const mrCL = meanMR;
    const mrUCL = d4 * meanMR;
    const mrLCL = d3 * meanMR;

    let primaryPoints = values.map((val, idx) => ({
      index: idx + 1,
      val: val,
      ucl: xUCL,
      cl: meanX,
      lcl: xLCL,
      out: val > xUCL || val < xLCL
    }));

    // First MR point is null or represented from index 2
    const secondaryPoints = [{
      index: 1,
      val: null,
      ucl: mrUCL,
      cl: mrCL,
      lcl: mrLCL,
      out: false
    }];

    for (let i = 0; i < movingRanges.length; i++) {
      const val = movingRanges[i];
      secondaryPoints.push({
        index: i + 2,
        val: val,
        ucl: mrUCL,
        cl: mrCL,
        lcl: mrLCL,
        out: val > mrUCL || val < mrLCL
      });
    }

    const sigmaX = (meanMR / d2);
    primaryPoints = checkWesternElectricRules(primaryPoints, meanX, sigmaX);

    return {
      chartType,
      numPoints: n,
      meanX,
      meanMR,
      primary: {
        title: "個別值管制圖 (X Chart)",
        ucl: xUCL,
        cl: meanX,
        lcl: xLCL,
        points: primaryPoints
      },
      secondary: {
        title: "移動全距管制圖 (MR Chart)",
        ucl: mrUCL,
        cl: mrCL,
        lcl: mrLCL,
        points: secondaryPoints
      }
    };
  }

  else if (chartType === 'ewma') {
    // Exponentially Weighted Moving Average (EWMA)
    // Formula: z_i = lambda * x_i + (1 - lambda) * z_{i-1}
    const lambda = params.lambda || 0.1;
    const L = params.L || 3.0;
    const n = values.length;
    
    const stats = calculateBasicStats(values);
    const mu0 = params.mu0 !== undefined ? params.mu0 : stats.mean;
    const sigma0 = params.sigma0 !== undefined ? params.sigma0 : stats.sd;

    const points = [];
    let prevZ = mu0;

    for (let i = 0; i < n; i++) {
      const x = values[i];
      const z = lambda * x + (1 - lambda) * prevZ;
      
      // Steady state or time-varying limits? Standard uses time-varying for early points
      const t = i + 1;
      const sigma_zi = sigma0 * Math.sqrt((lambda / (2 - lambda)) * (1 - Math.pow(1 - lambda, 2 * t)));
      
      const ucl = mu0 + L * sigma_zi;
      const lcl = mu0 - L * sigma_zi;

      points.push({
        index: t,
        val: z,
        raw: x,
        ucl,
        cl: mu0,
        lcl,
        out: z > ucl || z < lcl
      });
      prevZ = z;
    }

    return {
      chartType,
      lambda,
      L,
      primary: {
        title: "EWMA 指數加權移動平均管制圖",
        points
      }
    };
  }

  else if (chartType === 'cusum') {
    // Tabular CUSUM Chart
    // K = 1/2 * delta * sigma (Reference value)
    // H = 5 * sigma (Decision interval)
    const stats = calculateBasicStats(values);
    const mu0 = params.mu0 !== undefined ? params.mu0 : stats.mean;
    const sigma = params.sigma !== undefined ? params.sigma : stats.sd;
    const delta = params.delta || 1.0; // shift size in sigma to detect
    
    const K = 0.5 * delta * sigma;
    const H = 5.0 * sigma; // standard H=5 or 4
    
    let SH = 0; // Cumulative sum high
    let SL = 0; // Cumulative sum low
    
    const points = values.map((x, idx) => {
      SH = Math.max(0, x - (mu0 + K) + SH);
      SL = Math.max(0, (mu0 - K) - x + SL);
      
      return {
        index: idx + 1,
        val: SH, // We usually plot SH and SL separately or on same chart. Here SH is primary.
        valLow: -SL,
        ucl: H,
        cl: 0,
        lcl: -H,
        out: SH > H || SL > H
      };
    });

    return {
      chartType,
      mu0,
      sigma,
      K,
      H,
      primary: {
        title: "CUSUM 累計和管制圖 (Tabular)",
        points
      }
    };
  }
  
  else if (['p', 'np', 'c', 'u'].includes(chartType)) {
    // For attributes control charts
    // rawValues is expected to be array of defect counts
    // For p and u, we need sample sizes. We assume constant sample size for simplicity or parse raw inputs.
    // If rawValues is subgroup rows, we can map them.
    // We will assume subgroupSize represents the sample size per lot (N)
    const n = subgroupSize;
    if (n <= 0) return { error: "檢驗樣本大小 (Subgroup Size) 必須大於 0！" };

    const k = values.length;
    const totalDefects = values.reduce((sum, d) => sum + d, 0);
    const totalSampleSize = k * n;

    if (chartType === 'p') {
      const pBar = totalDefects / totalSampleSize;
      
      const points = values.map((d, idx) => {
        const pVal = d / n;
        const sd = Math.sqrt((pBar * (1 - pBar)) / n);
        const ucl = pBar + 3 * sd;
        const lcl = Math.max(0, pBar - 3 * sd);
        return {
          index: idx + 1,
          val: pVal,
          rawCount: d,
          ucl,
          cl: pBar,
          lcl,
          out: pVal > ucl || pVal < lcl
        };
      });

      return {
        chartType,
        pBar,
        totalDefects,
        primary: {
          title: "不良率管制圖 (p Chart)",
          points
        }
      };
    } 
    
    else if (chartType === 'np') {
      const pBar = totalDefects / totalSampleSize;
      const npBar = n * pBar;
      const sd = Math.sqrt(npBar * (1 - pBar));
      const ucl = npBar + 3 * sd;
      const lcl = Math.max(0, npBar - 3 * sd);

      const points = values.map((d, idx) => ({
        index: idx + 1,
        val: d,
        ucl,
        cl: npBar,
        lcl,
        out: d > ucl || d < lcl
      }));

      return {
        chartType,
        npBar,
        pBar,
        totalDefects,
        primary: {
          title: "不良數管制圖 (np Chart)",
          ucl,
          cl: npBar,
          lcl,
          points
        }
      };
    } 
    
    else if (chartType === 'c') {
      const cBar = totalDefects / k;
      const ucl = cBar + 3 * Math.sqrt(cBar);
      const lcl = Math.max(0, cBar - 3 * Math.sqrt(cBar));

      const points = values.map((d, idx) => ({
        index: idx + 1,
        val: d,
        ucl,
        cl: cBar,
        lcl,
        out: d > ucl || d < lcl
      }));

      return {
        chartType,
        cBar,
        totalDefects,
        primary: {
          title: "缺點數管制圖 (c Chart)",
          ucl,
          cl: cBar,
          lcl,
          points
        }
      };
    } 
    
    else { // 'u'
      const uBar = totalDefects / totalSampleSize; // average defects per unit
      
      const points = values.map((d, idx) => {
        // d is defect count, n is subgroup inspection units
        const uVal = d / n;
        const ucl = uBar + 3 * Math.sqrt(uBar / n);
        const lcl = Math.max(0, uBar - 3 * Math.sqrt(uBar / n));
        return {
          index: idx + 1,
          val: uVal,
          rawCount: d,
          ucl,
          cl: uBar,
          lcl,
          out: uVal > ucl || uVal < lcl
        };
      });

      return {
        chartType,
        uBar,
        totalDefects,
        primary: {
          title: "單位缺點數管制圖 (u Chart)",
          points
        }
      };
    }
  }

  return null;
}

/**
 * 2. Process Capability Analysis (製程能力分析 - PCA) Engine
 * Inputs:
 * - values: Array of raw measured values
 * - usl: Upper Specification Limit (規格上限)
 * - lsl: Lower Specification Limit (規格下限)
 * - target: Target value (規格中心，選填)
 * - subgroupSize: Subgroup size for calculating within-group capability (Cp/Cpk). 
 *                 If subgroupSize = 1, it calculates moving ranges for within-group.
 */
export function calculatePCA(rawValues, usl, lsl, target = null, subgroupSize = 5) {
  const values = rawValues.filter(v => v !== null && v !== undefined && !isNaN(v));
  const n = values.length;
  if (n === 0) return null;

  const stats = calculateBasicStats(values);
  const mean = stats.mean;
  const overallSD = stats.sd;

  // 1. Calculate within-group SD (using average subgroup ranges)
  let withinSD = overallSD;
  const k = subgroupSize;

  if (k > 1 && k <= 10 && n >= k) {
    // Group into subgroups
    const ranges = [];
    for (let i = 0; i < values.length; i += k) {
      const sub = values.slice(i, i + k);
      if (sub.length === k) {
        const subStats = calculateBasicStats(sub);
        ranges.push(subStats.range);
      }
    }
    if (ranges.length > 0) {
      const meanRange = ranges.reduce((sum, r) => sum + r, 0) / ranges.length;
      const d2 = SPC_CONSTANTS.d2[k];
      withinSD = meanRange / d2;
    }
  } else if (k === 1 && n >= 2) {
    // Subgroup size = 1 (individual series) -> use average Moving Range
    const mrs = [];
    for (let i = 1; i < n; i++) {
      mrs.push(Math.abs(values[i] - values[i - 1]));
    }
    const meanMR = mrs.reduce((sum, r) => sum + r, 0) / mrs.length;
    withinSD = meanMR / 1.128; // d2 for n=2 is 1.128
  }

  // Set default specification limits if not provided (Mean +/- 3*overallSD)
  const finalUSL = (usl !== null && usl !== undefined) ? usl : mean + 3 * overallSD;
  const finalLSL = (lsl !== null && lsl !== undefined) ? lsl : mean - 3 * overallSD;
  const finalTarget = (target !== null && target !== undefined) ? target : (finalUSL + finalLSL) / 2;

  // 2. Compute Capability Indices
  // Cp (Short-term/Within potential)
  const cp = withinSD > 0 ? (finalUSL - finalLSL) / (6 * withinSD) : 0;
  const cpu = withinSD > 0 ? (finalUSL - mean) / (3 * withinSD) : 0;
  const cpl = withinSD > 0 ? (mean - finalLSL) / (3 * withinSD) : 0;
  const cpk = Math.min(cpu, cpl);

  // Pp (Long-term/Overall performance)
  const pp = overallSD > 0 ? (finalUSL - finalLSL) / (6 * overallSD) : 0;
  const ppu = overallSD > 0 ? (finalUSL - mean) / (3 * overallSD) : 0;
  const ppl = overallSD > 0 ? (mean - finalLSL) / (3 * overallSD) : 0;
  const ppk = Math.min(ppu, ppl);

  // Cpm (Taguchi capability index - deviation from Target)
  const deviationSquared = Math.pow(mean - finalTarget, 2);
  const taguchiSD = Math.sqrt(Math.pow(overallSD, 2) + deviationSquared);
  const cpm = taguchiSD > 0 ? (finalUSL - finalLSL) / (6 * taguchiSD) : 0;

  // 3. Compute Estimated PPM Defect Rates (Parts Per Million)
  // Within-group estimates
  const zUSL_w = withinSD > 0 ? (finalUSL - mean) / withinSD : 0;
  const zLSL_w = withinSD > 0 ? (mean - finalLSL) / withinSD : 0;
  const pUpper_w = 1 - normalCDF(zUSL_w);
  const pLower_w = 1 - normalCDF(zLSL_w);
  const ppmUpper_w = pUpper_w * 1000000;
  const ppmLower_w = pLower_w * 1000000;
  const ppmTotal_w = ppmUpper_w + ppmLower_w;

  // Overall estimates
  const zUSL_o = overallSD > 0 ? (finalUSL - mean) / overallSD : 0;
  const zLSL_o = overallSD > 0 ? (mean - finalLSL) / overallSD : 0;
  const pUpper_o = 1 - normalCDF(zUSL_o);
  const pLower_o = 1 - normalCDF(zLSL_o);
  const ppmUpper_o = pUpper_o * 1000000;
  const ppmLower_o = pLower_o * 1000000;
  const ppmTotal_o = ppmUpper_o + ppmLower_o;

  return {
    n,
    mean,
    overallSD,
    withinSD,
    usl: finalUSL,
    lsl: finalLSL,
    target: finalTarget,
    within: {
      cp,
      cpu,
      cpl,
      cpk,
      ppmUpper: ppmUpper_w,
      ppmLower: ppmLower_w,
      ppmTotal: ppmTotal_w
    },
    overall: {
      pp,
      ppu,
      ppl,
      ppk,
      cpm,
      ppmUpper: ppmUpper_o,
      ppmLower: ppmLower_o,
      ppmTotal: ppmTotal_o
    }
  };
}

/**
 * 3. Gage R&R (量具重複性與再現性) Engine
 * Input:
 * - data: Array of rows representing operator trials.
 *         Each item is expected to have: { operator: string/number, part: string/number, trial: number, val: number }
 * Calculates using Average & Range (AIAG 4th Edition standard).
 */
export function calculateGageRR(rawMeasurements) {
  // Filter valid measurements
  const measurements = rawMeasurements.filter(m => 
    m.operator !== undefined && m.operator !== null &&
    m.part !== undefined && m.part !== null &&
    m.trial !== undefined && m.trial !== null &&
    m.val !== undefined && m.val !== null && !isNaN(m.val)
  );

  if (measurements.length === 0) return null;

  // 1. Group measurements
  const operators = [...new Set(measurements.map(m => m.operator))].sort();
  const parts = [...new Set(measurements.map(m => m.part))].sort();
  const trials = [...new Set(measurements.map(m => m.trial))].sort();

  const m = operators.length; // number of operators (appraisers)
  const n = parts.length;     // number of parts
  const r = trials.length;    // number of trials per part-operator

  if (m < 2 || n < 2 || r < 2) {
    return { error: "Gage R&R 分析至少需要 2 名人員 (Operators)、2 個零件 (Parts) 與 2 次試試 (Trials)！" };
  }

  // Pre-populate data structures
  const dataMap = {};
  measurements.forEach(item => {
    const key = `${item.operator}_${item.part}_${item.trial}`;
    dataMap[key] = item.val;
  });

  // Calculate Appraiser averages and ranges
  const appraiserAverages = {};
  const appraiserRanges = {};
  const partAverages = {};
  const partAveragesOverall = Array(n).fill(0);
  let totalSum = 0;
  let totalCount = 0;

  operators.forEach(op => {
    let opSum = 0;
    let opCount = 0;
    const ranges = [];

    parts.forEach(part => {
      const partVals = [];
      trials.forEach(trial => {
        const val = dataMap[`${op}_${part}_${trial}`];
        if (val !== undefined) {
          partVals.push(val);
          opSum += val;
          opCount++;
          totalSum += val;
          totalCount++;
        }
      });

      if (partVals.length > 0) {
        const min = Math.min(...partVals);
        const max = Math.max(...partVals);
        ranges.push(max - min);
      }
    });

    appraiserAverages[op] = opCount > 0 ? opSum / opCount : 0;
    appraiserRanges[op] = ranges.length > 0 ? ranges.reduce((a, b) => a + b, 0) / ranges.length : 0;
  });

  // Calculate Part means across all operators and trials
  parts.forEach((part, partIdx) => {
    let pSum = 0;
    let pCount = 0;
    operators.forEach(op => {
      trials.forEach(trial => {
        const val = dataMap[`${op}_${part}_${trial}`];
        if (val !== undefined) {
          pSum += val;
          pCount++;
        }
      });
    });
    partAveragesOverall[partIdx] = pCount > 0 ? pSum / pCount : 0;
    partAverages[part] = partAveragesOverall[partIdx];
  });

  const grandAverage = totalCount > 0 ? totalSum / totalCount : 0;

  // 2. Gage R&R Math (AIAG Standard Formula)
  // R-double-bar: average range of all operators
  const rDoubleBar = Object.values(appraiserRanges).reduce((a, b) => a + b, 0) / m;

  // X-bar-diff: range of appraiser averages
  const appraiserMeans = Object.values(appraiserAverages);
  const xBarDiff = Math.max(...appraiserMeans) - Math.min(...appraiserMeans);

  // R_p: range of part averages
  const partMeans = Object.values(partAverages);
  const r_p = Math.max(...partMeans) - Math.min(...partMeans);

  // Constants based on AIAG standard Gage R&R template (Study Variation Multiplier = 6.0)
  // factors K1 (Equipment Variation) for Trials
  const k1Factors = { 2: 4.56 / 5.15 * 6.0, 3: 3.05 / 5.15 * 6.0 };
  const k1 = k1Factors[r] || (3.05 / 5.15 * 6.0); // default to r=3

  // factors K2 (Appraiser Variation) for Operators
  const k2Factors = { 2: 3.65 / 5.15 * 6.0, 3: 2.70 / 5.15 * 6.0 };
  const k2 = k2Factors[m] || (2.70 / 5.15 * 6.0); // default to m=3

  // factors K3 (Part-to-Part) for Parts
  const k3Factors = {
    2: 3.65, 3: 2.70, 4: 2.30, 5: 2.08, 6: 1.93, 7: 1.82, 8: 1.74, 9: 1.67, 10: 1.62
  };
  const k3 = (k3Factors[n] || 1.62) / 5.15 * 6.0;

  // 3. Components of Variation (Standard Deviations & Study Variations)
  // Repeatability - Equipment Variation (EV)
  const ev = rDoubleBar * (k1 / 6.0); // standard deviation of EV
  const evStudy = rDoubleBar * k1; // 6*sigma Study Variation

  // Reproducibility - Appraiser Variation (AV)
  const avVar = Math.pow(xBarDiff * k2, 2) - (Math.pow(rDoubleBar * k1, 2) / (n * r));
  const avStudy = avVar > 0 ? Math.sqrt(avVar) : 0;
  const av = avStudy / 6.0;

  // Repeatability & Reproducibility (GRR)
  const grrStudy = Math.sqrt(Math.pow(evStudy, 2) + Math.pow(avStudy, 2));
  const grr = grrStudy / 6.0;

  // Part-to-Part Variation (PV)
  const pvStudy = r_p * k3;
  const pv = pvStudy / 6.0;

  // Total Variation (TV)
  const tvStudy = Math.sqrt(Math.pow(grrStudy, 2) + Math.pow(pvStudy, 2));
  const tv = tvStudy / 6.0;

  // Percentage Study Variation (%SV)
  const evPercent = tvStudy > 0 ? (evStudy / tvStudy) * 100 : 0;
  const avPercent = tvStudy > 0 ? (avStudy / tvStudy) * 100 : 0;
  const grrPercent = tvStudy > 0 ? (grrStudy / tvStudy) * 100 : 0;
  const pvPercent = tvStudy > 0 ? (pvStudy / tvStudy) * 100 : 0;

  // Number of Distinct Categories (ndc)
  // ndc = 1.41 * (PV / GRR) = 1.41 * (pvStudy / grrStudy)
  const ndc = grrStudy > 0 ? Math.floor(1.414 * (pvStudy / grrStudy)) : 0;

  // Gauge suitability guidelines
  let suitability = "不合格 (Unacceptable)";
  let suitabilityColor = "text-rose-400";
  let description = "量具系統變異過大（> 30%）。此量具系統不堪使用，必須重新調整或更換，並徹底檢修測量程序！";

  if (grrPercent < 10) {
    suitability = "合格 (Acceptable)";
    suitabilityColor = "text-emerald-400";
    description = "量具系統變異極低（< 10%），屬於優良的測量系統。該儀器重現性與再現性完美，適用於此製程！";
  } else if (grrPercent >= 10 && grrPercent <= 30) {
    suitability = "邊緣合格 (Marginal)";
    suitabilityColor = "text-amber-400";
    description = "量具系統變異處於邊緣地帶（10% - 30%）。基於應用重要性、量具成本或維修難易度，該系統可能勉強接受，但仍建議改善。";
  }

  return {
    operators,
    parts,
    trials,
    m, n, r,
    rDoubleBar,
    xBarDiff,
    r_p,
    grandAverage,
    ev, evStudy, evPercent,
    av, avStudy, avPercent,
    grr, grrStudy, grrPercent,
    pv, pvStudy, pvPercent,
    tv, tvStudy,
    ndc,
    suitability,
    suitabilityColor,
    description
  };
}

/**
 * 4. Acceptance Sampling (抽樣檢驗) Engine
 * Inputs:
 * - N: Lot Size (批量)
 * - n: Sample Size (樣本數)
 * - c: Acceptance Number (允收數)
 * Calculates OC Curve, AOQ, and ATI across a range of defect rates.
 */
export function calculateSamplingPlan(N, n, c) {
  if (n <= 0 || c < 0 || n > N) return null;

  // Poisson approximation for Pa calculation (suitable for small p and large n)
  // Pa = sum_{i=0}^c [exp(-np) * (np)^i / i!]
  const factorial = (num) => {
    if (num <= 1) return 1;
    let res = 1;
    for (let i = 2; i <= num; i++) res *= i;
    return res;
  };

  const calculatePa = (p) => {
    const np = n * p;
    let pa = 0;
    for (let i = 0; i <= c; i++) {
      pa += (Math.exp(-np) * Math.pow(np, i)) / factorial(i);
    }
    return Math.min(1, pa);
  };

  const defectRates = [];
  for (let p = 0; p <= 0.15; p += 0.005) {
    const pa = calculatePa(p);
    // AOQ = (Pa * p * (N - n)) / N
    const aoq = (pa * p * (N - n)) / N;
    // ATI = n + (1 - Pa) * (N - n)
    const ati = n + (1 - pa) * (N - n);
    
    defectRates.push({
      p,
      pa,
      aoq,
      ati
    });
  }

  // Find AQL (Approximate p where Pa = 0.95)
  // Find LTPD (Approximate p where Pa = 0.10)
  let aql = 0;
  let ltpd = 0;
  for (let i = 0; i < defectRates.length; i++) {
    if (defectRates[i].pa >= 0.95) aql = defectRates[i].p;
    if (defectRates[i].pa >= 0.10) ltpd = defectRates[i].p;
  }

  return {
    N, n, c,
    defectRates,
    aql,
    ltpd,
    maxAOQ: Math.max(...defectRates.map(d => d.aoq))
  };
}

/**
 * Helper Matrix Algebra Solver / Inverter
 */
function invertMatrix(matrix) {
  const size = matrix.length;
  const inv = [];
  for (let i = 0; i < size; i++) {
    inv[i] = [];
    for (let j = 0; j < size; j++) {
      inv[i][j] = (i === j) ? 1.0 : 0.0;
    }
  }
  const mat = matrix.map(row => [...row]); 

  for (let i = 0; i < size; i++) {
    let pivot = mat[i][i];
    if (Math.abs(pivot) < 1e-12) {
      let swapRow = -1;
      for (let r = i + 1; r < size; r++) {
        if (Math.abs(mat[r][i]) > 1e-12) { swapRow = r; break; }
      }
      if (swapRow === -1) return null; 
      const tempMat = mat[i]; mat[i] = mat[swapRow]; mat[swapRow] = tempMat;
      const tempInv = inv[i]; inv[i] = inv[swapRow]; inv[swapRow] = tempInv;
      pivot = mat[i][i];
    }
    for (let j = 0; j < size; j++) {
      mat[i][j] /= pivot;
      inv[i][j] /= pivot;
    }
    for (let r = 0; r < size; r++) {
      if (r !== i) {
        const factor = mat[r][i];
        for (let j = 0; j < size; j++) {
          mat[r][j] -= factor * mat[i][j];
          inv[r][j] -= factor * inv[i][j];
        }
      }
    }
  }
  return inv;
}

/**
 * 5. Multivariate SPC (Hotelling T^2 Chart)
 * Input: data = [[x1, y1], [x2, y2], ...] (Array of observations, each observation is an array of variables)
 */
export function calculateHotellingT2(data) {
  const n = data.length;
  if (n < 3) return null;
  const p = data[0].length; // number of variables
  if (p < 2 || n <= p) return { error: "需要至少 2 個變數，且樣本數大於變數數量！" };

  // Calculate Mean Vector
  const meanVector = Array(p).fill(0);
  data.forEach(row => {
    row.forEach((val, j) => { meanVector[j] += val; });
  });
  for (let j = 0; j < p; j++) meanVector[j] /= n;

  // Calculate Covariance Matrix S
  const S = Array(p).fill(0).map(() => Array(p).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < p; j++) {
      for (let k = 0; k < p; k++) {
        S[j][k] += (data[i][j] - meanVector[j]) * (data[i][k] - meanVector[k]);
      }
    }
  }
  for (let j = 0; j < p; j++) {
    for (let k = 0; k < p; k++) {
      S[j][k] /= (n - 1);
    }
  }

  const Sinv = invertMatrix(S);
  if (!Sinv) return { error: "共變異數矩陣不可逆（變數間可能完全線性相關）！" };

  // Calculate T^2 for each sample
  const t2Points = data.map((row) => {
    const diff = row.map((val, j) => val - meanVector[j]);
    let t2 = 0;
    for (let j = 0; j < p; j++) {
      let sum = 0;
      for (let k = 0; k < p; k++) {
        sum += diff[k] * Sinv[k][j];
      }
      t2 += sum * diff[j];
    }
    return t2;
  });

  // Simplified UCL for Phase II based on Chi-Square approximation
  const chi2_01 = [0, 0, 9.21, 11.34, 13.28, 15.09, 16.81, 18.48, 20.09, 21.67, 23.21];
  let UCL = p <= 10 ? chi2_01[p] : 3 * p; 
  
  const points = t2Points.map((val, idx) => ({
    index: idx + 1,
    val,
    ucl: UCL,
    cl: p, // E(T2) is approx p
    lcl: 0,
    out: val > UCL
  }));

  return {
    n, p,
    meanVector,
    S,
    primary: {
      title: "Hotelling T² 管制圖",
      points,
      ucl: UCL
    }
  };
}

/**
 * 6. Double Sampling Plan (雙次抽樣計畫)
 */
export function calculateDoubleSamplingPlan(N, n1, c1, r1, n2, c2) {
  if (!r1) r1 = c2 + 1;
  
  const factorial = (num) => {
    if (num <= 1) return 1;
    let res = 1;
    for (let i = 2; i <= num; i++) res *= i;
    return res;
  };

  const poisson = (x, lambda) => (Math.exp(-lambda) * Math.pow(lambda, x)) / factorial(x);

  const defectRates = [];
  for (let p = 0; p <= 0.15; p += 0.005) {
    const lambda1 = n1 * p;
    const lambda2 = n2 * p;

    // Pa1 = P(d1 <= c1)
    let Pa1 = 0;
    for (let x = 0; x <= c1; x++) Pa1 += poisson(x, lambda1);

    // Pa2 = P(c1 < d1 < r1) AND combined d1+d2 <= c2
    let Pa2 = 0;
    for (let d1 = c1 + 1; d1 < r1; d1++) {
      const p_d1 = poisson(d1, lambda1);
      let p_d2 = 0;
      for (let d2 = 0; d2 <= c2 - d1; d2++) {
        p_d2 += poisson(d2, lambda2);
      }
      Pa2 += p_d1 * p_d2;
    }

    const Pa = Pa1 + Pa2;
    
    // Average Sample Number (ASN)
    let P_inspect2 = 0;
    for (let d1 = c1 + 1; d1 < r1; d1++) P_inspect2 += poisson(d1, lambda1);
    const asn = n1 + n2 * P_inspect2;

    // AOQ approximation for double sampling
    const aoq = (Pa1 * p * (N - n1) + Pa2 * p * (N - n1 - n2)) / N;

    defectRates.push({ p, pa: Pa, asn, aoq });
  }

  // Find AQL and LTPD
  let aql = 0;
  let ltpd = 0;
  for (let i = 0; i < defectRates.length; i++) {
    if (defectRates[i].pa >= 0.95) aql = defectRates[i].p;
    if (defectRates[i].pa >= 0.10) ltpd = defectRates[i].p;
  }

  return {
    N, n1, c1, r1, n2, c2,
    defectRates,
    aql,
    ltpd,
    maxAOQ: Math.max(...defectRates.map(d => d.aoq))
  };
}

/**
 * 7. Design of Experiments: 2^k Factorial Design (Main Effects & Interactions)
 * Input: factors (array of {name}), data [{run: [-1, 1, -1], response: 45}]
 */
export function calculateFactorialDOE(factors, data) {
  const k = factors.length;
  const n = data.length; 
  
  if (k < 2 || k > 4) return { error: "僅支援 2 到 4 個因子的 2^k 實驗設計！" };
  if (n < Math.pow(2, k)) return { error: "資料點不足，無法計算所有主效應與交互作用！" };

  const effects = {};
  
  // Main effects
  for (let i = 0; i < k; i++) {
    let contrast = 0;
    data.forEach(row => {
      contrast += row.run[i] * row.response;
    });
    effects[factors[i].name] = contrast / (n / 2);
  }

  // 2-way interactions
  for (let i = 0; i < k; i++) {
    for (let j = i + 1; j < k; j++) {
      let contrast = 0;
      data.forEach(row => {
        contrast += (row.run[i] * row.run[j]) * row.response;
      });
      effects[`${factors[i].name}*${factors[j].name}`] = contrast / (n / 2);
    }
  }

  // 3-way interaction if k>=3
  if (k >= 3) {
    for (let i = 0; i < k; i++) {
      for (let j = i + 1; j < k; j++) {
        for (let l = j + 1; l < k; l++) {
          let contrast = 0;
          data.forEach(row => {
            contrast += (row.run[i] * row.run[j] * row.run[l]) * row.response;
          });
          effects[`${factors[i].name}*${factors[j].name}*${factors[l].name}`] = contrast / (n / 2);
        }
      }
    }
  }

  // 4-way interaction if k=4
  if (k === 4) {
    let contrast = 0;
    data.forEach(row => {
      contrast += (row.run[0] * row.run[1] * row.run[2] * row.run[3]) * row.response;
    });
    effects[`${factors[0].name}*${factors[1].name}*${factors[2].name}*${factors[3].name}`] = contrast / (n / 2);
  }

  return {
    k, n,
    effects
  };
}
