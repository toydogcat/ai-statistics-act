import { tPValue, fPValue, normalCDF, chiSquarePValue, normalPValue } from './distTable.js';

/**
 * Basic Descriptive Statistics
 * Calculates Mean, Variance, SD, Min, Max, Range, Skewness, Kurtosis
 */
export function calculateDescriptive(values) {
  const cleanValues = values.filter(v => v !== null && v !== undefined && !isNaN(v));
  const n = cleanValues.length;
  if (n === 0) return null;

  const min = Math.min(...cleanValues);
  const max = Math.max(...cleanValues);
  const range = max - min;
  
  const sum = cleanValues.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  
  const varianceSum = cleanValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0);
  const variance = n > 1 ? varianceSum / (n - 1) : 0;
  const sd = Math.sqrt(variance);

  // Skewness and Kurtosis (using formulas matching SPSS)
  let skewness = 0;
  let kurtosis = 0;

  if (n > 2 && sd > 0) {
    const m3 = cleanValues.reduce((sum, val) => sum + Math.pow((val - mean) / sd, 3), 0);
    skewness = (n / ((n - 1) * (n - 2))) * m3;
  }
  
  if (n > 3 && sd > 0) {
    const m4 = cleanValues.reduce((sum, val) => sum + Math.pow((val - mean) / sd, 4), 0);
    const term1 = (n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3));
    const term2 = (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
    kurtosis = term1 * m4 - term2;
  }

  return {
    n,
    mean,
    variance,
    sd,
    min,
    max,
    range,
    skewness,
    kurtosis
  };
}

/**
 * Independent Samples t-test
 * Compares group1 vs group2 in a continuous variable.
 * Performs Levene's test for equality of variances.
 * Returns both Equal Variances Assumed and Not Assumed.
 */
export function calculateIndependentT(group1, group2) {
  const g1 = group1.filter(v => v !== null && v !== undefined && !isNaN(v));
  const g2 = group2.filter(v => v !== null && v !== undefined && !isNaN(v));
  
  const n1 = g1.length;
  const n2 = g2.length;
  
  if (n1 < 2 || n2 < 2) return null;

  const desc1 = calculateDescriptive(g1);
  const desc2 = calculateDescriptive(g2);

  const m1 = desc1.mean;
  const m2 = desc2.mean;
  const v1 = desc1.variance;
  const v2 = desc2.variance;
  const s1 = desc1.sd;
  const s2 = desc2.sd;

  // 1. Levene's Test (Approximation via absolute deviations t-test)
  // Devs = |x - mean(x)|
  const d1 = g1.map(x => Math.abs(x - m1));
  const d2 = g2.map(x => Math.abs(x - m2));
  const levDesc1 = calculateDescriptive(d1);
  const levDesc2 = calculateDescriptive(d2);
  const levVp = ((n1 - 1) * levDesc1.variance + (n2 - 1) * levDesc2.variance) / (n1 + n2 - 2);
  const levSe = Math.sqrt(levVp * (1 / n1 + 1 / n2));
  const levT = levSe > 0 ? (levDesc1.mean - levDesc2.mean) / levSe : 0;
  const levDf = n1 + n2 - 2;
  const levP = tPValue(levT, levDf); // Levene's test p-value

  // 2. Equal Variances Assumed
  const pooledVar = ((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2);
  const pooledSd = Math.sqrt(pooledVar);
  const seEqual = pooledSd * Math.sqrt(1 / n1 + 1 / n2);
  const tEqual = seEqual > 0 ? (m1 - m2) / seEqual : 0;
  const dfEqual = n1 + n2 - 2;
  const pEqual = tPValue(tEqual, dfEqual);
  const cohend = pooledSd > 0 ? (m1 - m2) / pooledSd : 0;

  // 3. Equal Variances Not Assumed (Welch-Satterthwaite)
  const seUnequal = Math.sqrt(v1 / n1 + v2 / n2);
  const tUnequal = seUnequal > 0 ? (m1 - m2) / seUnequal : 0;
  const dfNumerator = Math.pow(v1 / n1 + v2 / n2, 2);
  const dfDenominator = Math.pow(v1 / n1, 2) / (n1 - 1) + Math.pow(v2 / n2, 2) / (n2 - 1);
  const dfUnequal = dfDenominator > 0 ? dfNumerator / dfDenominator : 1;
  const pUnequal = tPValue(tUnequal, dfUnequal);

  return {
    desc1,
    desc2,
    levene: {
      f: Math.max(v1, v2) / Math.min(v1, v2), // Simplified variance ratio
      p: levP
    },
    equalAssumed: {
      t: tEqual,
      df: dfEqual,
      p: pEqual,
      meanDiff: m1 - m2,
      se: seEqual,
      cohend: cohend
    },
    equalNotAssumed: {
      t: tUnequal,
      df: dfUnequal,
      p: pUnequal,
      meanDiff: m1 - m2,
      se: seUnequal
    }
  };
}

/**
 * Dependent/Paired Samples t-test
 * Compares two repeated measures (pre-test vs post-test) for the same group.
 */
export function calculateDependentT(pre, post) {
  if (pre.length !== post.length) return null;
  
  const diffs = [];
  for (let i = 0; i < pre.length; i++) {
    if (pre[i] !== null && pre[i] !== undefined && !isNaN(pre[i]) &&
        post[i] !== null && post[i] !== undefined && !isNaN(post[i])) {
      diffs.push(post[i] - pre[i]); // Post - Pre difference
    }
  }

  const n = diffs.length;
  if (n < 2) return null;

  const descDiff = calculateDescriptive(diffs);
  const meanDiff = descDiff.mean;
  const sdDiff = descDiff.sd;
  const seDiff = sdDiff / Math.sqrt(n);
  const t = seDiff > 0 ? meanDiff / seDiff : 0;
  const df = n - 1;
  const p = tPValue(t, df);
  const cohend = sdDiff > 0 ? meanDiff / sdDiff : 0;

  return {
    n,
    meanDiff,
    sdDiff,
    seDiff,
    t,
    df,
    p,
    cohend
  };
}

/**
 * Pearson Correlation Coefficient
 */
export function calculateCorrelation(x, y) {
  if (x.length !== y.length) return null;

  const cleanX = [];
  const cleanY = [];
  for (let i = 0; i < x.length; i++) {
    if (x[i] !== null && x[i] !== undefined && !isNaN(x[i]) &&
        y[i] !== null && y[i] !== undefined && !isNaN(y[i])) {
      cleanX.push(x[i]);
      cleanY.push(y[i]);
    }
  }

  const n = cleanX.length;
  if (n < 3) return null;

  const descX = calculateDescriptive(cleanX);
  const descY = calculateDescriptive(cleanY);

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < n; i++) {
    const diffX = cleanX[i] - descX.mean;
    const diffY = cleanY[i] - descY.mean;
    num += diffX * diffY;
    denX += diffX * diffX;
    denY += diffY * diffY;
  }

  const r = (denX > 0 && denY > 0) ? num / Math.sqrt(denX * denY) : 0;
  const df = n - 2;
  const t = Math.abs(r) < 1 ? r * Math.sqrt(df / (1 - r * r)) : 999;
  const p = tPValue(t, df);

  return {
    n,
    r,
    r2: r * r,
    t,
    df,
    p
  };
}

/**
 * One-Way ANOVA (Between subjects)
 * Returns sum of squares, df, mean squares, F value, p-value, and Bonferroni Post-Hoc
 */
export function calculateOneWayANOVA(groupsData) {
  // groupsData: Object mapping groupName -> Array of numbers
  const groups = Object.keys(groupsData);
  const k = groups.length;
  if (k < 2) return null;

  const cleanGroups = {};
  let totalN = 0;
  let totalSum = 0;
  
  groups.forEach(g => {
    cleanGroups[g] = groupsData[g].filter(v => v !== null && v !== undefined && !isNaN(v));
    totalN += cleanGroups[g].length;
    totalSum += cleanGroups[g].reduce((a, b) => a + b, 0);
  });

  if (totalN <= k) return null;
  const grandMean = totalSum / totalN;

  let ssb = 0; // Between sum of squares
  let ssw = 0; // Within sum of squares

  const descInfo = {};

  groups.forEach(g => {
    const arr = cleanGroups[g];
    const n = arr.length;
    if (n === 0) return;
    const desc = calculateDescriptive(arr);
    descInfo[g] = desc;

    ssb += n * Math.pow(desc.mean - grandMean, 2);
    ssw += arr.reduce((a, b) => a + Math.pow(b - desc.mean, 2), 0);
  });

  const dfb = k - 1;
  const dfw = totalN - k;
  const msb = ssb / dfb;
  const msw = ssw / dfw;
  const f = msw > 0 ? msb / msw : 0;
  const p = fPValue(f, dfb, dfw);
  const eta2 = (ssb + ssw) > 0 ? ssb / (ssb + ssw) : 0;

  // Bonferroni Post-Hoc Pairwise Comparisons
  const postHoc = [];
  const m = (k * (k - 1)) / 2; // number of comparisons

  for (let i = 0; i < k; i++) {
    for (let j = i + 1; j < k; j++) {
      const g1 = groups[i];
      const g2 = groups[j];
      const desc1 = descInfo[g1];
      const desc2 = descInfo[g2];

      if (!desc1 || !desc2) continue;

      const diff = desc1.mean - desc2.mean;
      // Standard error of difference based on pooled MSE (msw)
      const se = Math.sqrt(msw * (1 / desc1.n + 1 / desc2.n));
      const t = se > 0 ? diff / se : 0;
      const unadjP = tPValue(t, dfw);
      const adjP = Math.min(unadjP * m, 1.0); // Bonferroni correction

      postHoc.push({
        groupA: g1,
        groupB: g2,
        meanDiff: diff,
        se,
        t,
        p: adjP
      });
    }
  }

  return {
    descInfo,
    grandMean,
    eta2,
    table: {
      between: { ss: ssb, df: dfb, ms: msb, f, p },
      within: { ss: ssw, df: dfw, ms: msw },
      total: { ss: ssb + ssw, df: totalN - 1 }
    },
    postHoc
  };
}

/**
 * Helper Matrix Algebra Solver
 * Solves multiple linear regression: beta = (X^T X)^-1 X^T Y
 */
function solveMatrixEquation(X, Y) {
  // Transpose matrix X
  const XT = [];
  const rowsX = X.length;
  const colsX = X[0].length;
  for (let c = 0; c < colsX; c++) {
    XT[c] = [];
    for (let r = 0; r < rowsX; r++) {
      XT[c][r] = X[r][c];
    }
  }

  // Multiply XT * X -> (colsX x colsX)
  const XTX = [];
  for (let i = 0; i < colsX; i++) {
    XTX[i] = [];
    for (let j = 0; j < colsX; j++) {
      let sum = 0;
      for (let k = 0; k < rowsX; k++) {
        sum += XT[i][k] * X[k][j];
      }
      XTX[i][j] = sum;
    }
  }

  // Multiply XT * Y -> (colsX x 1)
  const XTY = [];
  for (let i = 0; i < colsX; i++) {
    let sum = 0;
    for (let k = 0; k < rowsX; k++) {
      sum += XT[i][k] * Y[k];
    }
    XTY[i] = sum;
  }

  // Matrix Inversion (Gauss-Jordan elimination) on XTX
  const size = colsX;
  const inv = [];
  for (let i = 0; i < size; i++) {
    inv[i] = [];
    for (let j = 0; j < size; j++) {
      inv[i][j] = (i === j) ? 1.0 : 0.0;
    }
  }

  const mat = XTX.map(row => [...row]); // Deep copy XTX

  for (let i = 0; i < size; i++) {
    // Find pivot
    let pivot = mat[i][i];
    if (Math.abs(pivot) < 1e-12) {
      // Find a row to swap
      let swapRow = -1;
      for (let r = i + 1; r < size; r++) {
        if (Math.abs(mat[r][i]) > 1e-12) {
          swapRow = r;
          break;
        }
      }
      if (swapRow === -1) return null; // Singular matrix
      
      // Swap rows
      const tempMat = mat[i]; mat[i] = mat[swapRow]; mat[swapRow] = tempMat;
      const tempInv = inv[i]; inv[i] = inv[swapRow]; inv[swapRow] = tempInv;
      pivot = mat[i][i];
    }

    // Divide row by pivot
    for (let j = 0; j < size; j++) {
      mat[i][j] /= pivot;
      inv[i][j] /= pivot;
    }

    // Eliminate other rows
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

  // Multiply inv * XTY -> beta coefficients
  const beta = [];
  for (let i = 0; i < size; i++) {
    let sum = 0;
    for (let j = 0; j < size; j++) {
      sum += inv[i][j] * XTY[j];
    }
    beta[i] = sum;
  }

  return {
    beta,
    invXTX: inv
  };
}

/**
 * Multiple Linear Regression
 * Inputs:
 * - IVsData: Array of arrays of numbers, representing values of each independent variable [[x1_1, x1_2, ...], [x2_1, x2_2, ...]]
 * - YData: Array of numbers, representing the dependent variable
 * - ivNames: Array of strings of independent variable names
 */
export function calculateMultipleRegression(IVsData, YData, ivNames) {
  const numIVs = IVsData.length;
  const n = YData.length;
  if (n < numIVs + 2) return null;

  // Filter missing values listwise
  const cleanIVs = Array.from({ length: numIVs }, () => []);
  const cleanY = [];

  for (let i = 0; i < n; i++) {
    let valid = YData[i] !== null && YData[i] !== undefined && !isNaN(YData[i]);
    for (let j = 0; j < numIVs; j++) {
      if (IVsData[j][i] === null || IVsData[j][i] === undefined || isNaN(IVsData[j][i])) {
        valid = false;
      }
    }
    if (valid) {
      cleanY.push(YData[i]);
      for (let j = 0; j < numIVs; j++) {
        cleanIVs[j].push(IVsData[j][i]);
      }
    }
  }

  const cleanN = cleanY.length;
  if (cleanN < numIVs + 2) return null;

  // Build matrix X (first column is all 1s for intercept, rest are IVs)
  const X = [];
  for (let i = 0; i < cleanN; i++) {
    X[i] = [1.0];
    for (let j = 0; j < numIVs; j++) {
      X[i].push(cleanIVs[j][i]);
    }
  }

  const solved = solveMatrixEquation(X, cleanY);
  if (!solved) return null;

  const { beta, invXTX } = solved;

  // Compute residuals and model diagnostics
  let ssTotal = 0;
  let ssResidual = 0;
  const meanY = cleanY.reduce((a, b) => a + b, 0) / cleanN;

  const yHat = [];
  for (let i = 0; i < cleanN; i++) {
    let predict = beta[0];
    for (let j = 0; j < numIVs; j++) {
      predict += beta[j + 1] * cleanIVs[j][i];
    }
    yHat.push(predict);
    ssTotal += Math.pow(cleanY[i] - meanY, 2);
    ssResidual += Math.pow(cleanY[i] - predict, 2);
  }

  const dfModel = numIVs;
  const dfResidual = cleanN - numIVs - 1;
  const dfTotal = cleanN - 1;

  const msModel = (ssTotal - ssResidual) / dfModel;
  const msResidual = ssResidual / dfResidual;
  const fValue = msResidual > 0 ? msModel / msResidual : 0;
  const fSig = fPValue(fValue, dfModel, dfResidual);

  const r2 = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;
  const adjR2 = dfResidual > 0 ? 1 - (1 - r2) * (dfTotal / dfResidual) : 0;
  const rse = Math.sqrt(msResidual); // Residual Standard Error

  // Compute Standard Errors and t-statistics of Coefficients
  const coefficients = [];
  
  // Calculate Standardized Coefficients (Beta)
  const descY = calculateDescriptive(cleanY);
  const descX = cleanIVs.map(iv => calculateDescriptive(iv));

  // Intercept (Constant)
  const seConstant = rse * Math.sqrt(invXTX[0][0]);
  const tConstant = seConstant > 0 ? beta[0] / seConstant : 0;
  coefficients.push({
    name: 'Constant (截距)',
    b: beta[0],
    se: seConstant,
    beta: 0, // Intercept standard Beta is 0
    t: tConstant,
    p: tPValue(tConstant, dfResidual)
  });

  // IVs
  for (let j = 0; j < numIVs; j++) {
    const b = beta[j + 1];
    const se = rse * Math.sqrt(invXTX[j + 1][j + 1]);
    const t = se > 0 ? b / se : 0;
    const stdBeta = (descX[j].sd > 0 && descY.sd > 0) ? b * (descX[j].sd / descY.sd) : 0;
    
    coefficients.push({
      name: ivNames[j],
      b,
      se,
      beta: stdBeta,
      t,
      p: tPValue(t, dfResidual)
    });
  }

  return {
    n: cleanN,
    r2,
    adjR2,
    rse,
    table: {
      regression: { ss: ssTotal - ssResidual, df: dfModel, ms: msModel, f: fValue, p: fSig },
      residual: { ss: ssResidual, df: dfResidual, ms: msResidual },
      total: { ss: ssTotal, df: dfTotal }
    },
    coefficients
  };
}

/**
 * Moderation / Interaction Analysis (2-way)
 * Centering continuous IV and Moderating variable (W), then regresses:
 * Y = b0 + b1*IV_centered + b2*W_centered + b3*Interaction
 */
export function calculateModeration(IVData, ModData, YData, ivName = 'IV', modName = 'Moderator') {
  const n = YData.length;
  if (n < 5) return null;

  // Listwise filter missing values
  const cleanIV = [];
  const cleanMod = [];
  const cleanY = [];

  for (let i = 0; i < n; i++) {
    if (IVData[i] !== null && IVData[i] !== undefined && !isNaN(IVData[i]) &&
        ModData[i] !== null && ModData[i] !== undefined && !isNaN(ModData[i]) &&
        YData[i] !== null && YData[i] !== undefined && !isNaN(YData[i])) {
      cleanIV.push(IVData[i]);
      cleanMod.push(ModData[i]);
      cleanY.push(YData[i]);
    }
  }

  const cleanN = cleanY.length;
  if (cleanN < 5) return null;

  // Centering IV and Moderator
  const descIV = calculateDescriptive(cleanIV);
  const descMod = calculateDescriptive(cleanMod);

  const ivCentered = cleanIV.map(x => x - descIV.mean);
  const modCentered = cleanMod.map(w => w - descMod.mean);
  const interaction = ivCentered.map((x, i) => x * modCentered[i]);

  // Run Multiple Regression on Centered Variables
  // X = [Constant, IV_centered, Mod_centered, Interaction]
  const X = [];
  for (let i = 0; i < cleanN; i++) {
    X[i] = [1.0, ivCentered[i], modCentered[i], interaction[i]];
  }

  const solved = solveMatrixEquation(X, cleanY);
  if (!solved) return null;

  const { beta, invXTX } = solved;
  
  // Calculate Standard Error and residuals
  let ssTotal = 0;
  let ssResidual = 0;
  const meanY = cleanY.reduce((a, b) => a + b, 0) / cleanN;

  for (let i = 0; i < cleanN; i++) {
    const predict = beta[0] + beta[1] * ivCentered[i] + beta[2] * modCentered[i] + beta[3] * interaction[i];
    ssTotal += Math.pow(cleanY[i] - meanY, 2);
    ssResidual += Math.pow(cleanY[i] - predict, 2);
  }

  const dfResidual = cleanN - 3 - 1;
  const msResidual = ssResidual / dfResidual;
  const rse = Math.sqrt(msResidual);

  // Standard Errors of beta
  const seIV = rse * Math.sqrt(invXTX[1][1]);
  const seMod = rse * Math.sqrt(invXTX[2][2]);
  const seInteraction = rse * Math.sqrt(invXTX[3][3]);

  // Beta Coefficients Table
  const coefs = {
    constant: { b: beta[0], se: rse * Math.sqrt(invXTX[0][0]) },
    iv: { b: beta[1], se: seIV, t: beta[1]/seIV, p: tPValue(beta[1]/seIV, dfResidual) },
    mod: { b: beta[2], se: seMod, t: beta[2]/seMod, p: tPValue(beta[2]/seMod, dfResidual) },
    interaction: { b: beta[3], se: seInteraction, t: beta[3]/seInteraction, p: tPValue(beta[3]/seInteraction, dfResidual) }
  };

  // Simple Slopes Test
  // High Moderator (+1 SD) & Low Moderator (-1 SD)
  const modSD = descMod.sd;

  // Simple slope = b1 + b3 * W
  const wHigh = modSD; // since Mod is centered, W_centered = +1 SD is simply +modSD
  const wLow = -modSD; // W_centered = -1 SD is -modSD

  const slopeHigh = beta[1] + beta[3] * wHigh;
  const slopeLow = beta[1] + beta[3] * wLow;

  // Standard Error of Simple Slopes
  // SE_slope = sqrt(Var(b1) + 2*W*Cov(b1,b3) + W^2*Var(b3))
  // Var(b1) = rse^2 * invXTX[1][1]
  // Var(b3) = rse^2 * invXTX[3][3]
  // Cov(b1,b3) = rse^2 * invXTX[1][3]
  const varB1 = Math.pow(rse, 2) * invXTX[1][1];
  const varB3 = Math.pow(rse, 2) * invXTX[3][3];
  const covB1B3 = Math.pow(rse, 2) * invXTX[1][3];

  const seHigh = Math.sqrt(varB1 + 2 * wHigh * covB1B3 + Math.pow(wHigh, 2) * varB3);
  const seLow = Math.sqrt(varB1 + 2 * wLow * covB1B3 + Math.pow(wLow, 2) * varB3);

  const tHigh = seHigh > 0 ? slopeHigh / seHigh : 0;
  const tLow = seLow > 0 ? slopeLow / seLow : 0;

  const pHigh = tPValue(tHigh, dfResidual);
  const pLow = tPValue(tLow, dfResidual);

  // Generate data points for graphing: High/Low Mod (-1SD, +1SD of IV)
  const ivSD = descIV.sd;
  const xLowVal = -ivSD;  // Centered IV values
  const xHighVal = ivSD;

  // Predicted Y = b0 + b1*IV + b2*W + b3*IV*W
  const graphPoints = {
    ivMean: descIV.mean,
    ivSD: descIV.sd,
    modMean: descMod.mean,
    modSD: descMod.sd,
    lowMod_lowIV: beta[0] + beta[1] * xLowVal + beta[2] * wLow + beta[3] * xLowVal * wLow,
    lowMod_highIV: beta[0] + beta[1] * xHighVal + beta[2] * wLow + beta[3] * xHighVal * wLow,
    highMod_lowIV: beta[0] + beta[1] * xLowVal + beta[2] * wHigh + beta[3] * xLowVal * wHigh,
    highMod_highIV: beta[0] + beta[1] * xHighVal + beta[2] * wHigh + beta[3] * xHighVal * wHigh
  };

  return {
    n: cleanN,
    r2: 1 - ssResidual / ssTotal,
    coefs,
    simpleSlopes: {
      high: { val: slopeHigh, se: seHigh, t: tHigh, p: pHigh, level: 'High ' + modName + ' (+1 SD)' },
      low: { val: slopeLow, se: seLow, t: tLow, p: pLow, level: 'Low ' + modName + ' (-1 SD)' }
    },
    graphPoints
  };
}

/**
 * Chi-Square Independence Test
 * Analyzes association between two categorical variables.
 */
export function calculateChiSquare(colX, colY) {
  const cleanX = [];
  const cleanY = [];
  for (let i = 0; i < colX.length; i++) {
    if (colX[i] !== null && colX[i] !== undefined && colX[i] !== '' &&
        colY[i] !== null && colY[i] !== undefined && colY[i] !== '') {
      cleanX.push(String(colX[i]).trim());
      cleanY.push(String(colY[i]).trim());
    }
  }

  const n = cleanX.length;
  if (n < 5) return null;

  const catsX = [...new Set(cleanX)].sort();
  const catsY = [...new Set(cleanY)].sort();

  const r = catsX.length;
  const c = catsY.length;
  if (r < 2 || c < 2) return null;

  const observed = Array.from({ length: r }, () => Array(c).fill(0));
  const rowTotals = Array(r).fill(0);
  const colTotals = Array(c).fill(0);

  for (let i = 0; i < n; i++) {
    const rIdx = catsX.indexOf(cleanX[i]);
    const cIdx = catsY.indexOf(cleanY[i]);
    observed[rIdx][cIdx]++;
    rowTotals[rIdx]++;
    colTotals[cIdx]++;
  }

  let chi2 = 0;
  const expected = Array.from({ length: r }, () => Array(c).fill(0));

  for (let i = 0; i < r; i++) {
    for (let j = 0; j < c; j++) {
      expected[i][j] = (rowTotals[i] * colTotals[j]) / n;
      if (expected[i][j] > 0) {
        chi2 += Math.pow(observed[i][j] - expected[i][j], 2) / expected[i][j];
      }
    }
  }

  const df = (r - 1) * (c - 1);
  const p = chiSquarePValue(chi2, df);
  const cramersV = Math.sqrt(chi2 / (n * Math.min(r - 1, c - 1)));

  return {
    n,
    catsX,
    catsY,
    observed,
    expected,
    rowTotals,
    colTotals,
    chi2,
    df,
    p,
    cramersV
  };
}

/**
 * Simple Mediation Analysis (Baron & Kenny + Sobel Test)
 * Fits:
 * 1. Y = i1 + c * X (Total effect)
 * 2. M = i2 + a * X (Path a)
 * 3. Y = i3 + c' * X + b * M (Direct & indirect effects)
 */
export function calculateMediation(X, M, Y) {
  const cleanX = [];
  const cleanM = [];
  const cleanY = [];
  for (let i = 0; i < X.length; i++) {
    if (X[i] !== null && X[i] !== undefined && !isNaN(X[i]) && X[i] !== '' &&
        M[i] !== null && M[i] !== undefined && !isNaN(M[i]) && M[i] !== '' &&
        Y[i] !== null && Y[i] !== undefined && !isNaN(Y[i]) && Y[i] !== '') {
      cleanX.push(Number(X[i]));
      cleanM.push(Number(M[i]));
      cleanY.push(Number(Y[i]));
    }
  }

  const n = cleanY.length;
  if (n < 5) return null;

  // Fit Regression 1: Y = c*X
  const regTotal = calculateMultipleRegression([cleanX], cleanY, ['X']);
  if (!regTotal) return null;

  // Fit Regression 2: M = a*X
  const regPathA = calculateMultipleRegression([cleanX], cleanM, ['X']);
  if (!regPathA) return null;

  // Fit Regression 3: Y = cPrime*X + b*M
  const regDirect = calculateMultipleRegression([cleanX, cleanM], cleanY, ['X', 'M']);
  if (!regDirect) return null;

  const cVal = regTotal.coefficients[1].b;
  const aVal = regPathA.coefficients[1].b;
  const seA = regPathA.coefficients[1].se;
  const bVal = regDirect.coefficients[2].b;
  const seB = regDirect.coefficients[2].se;
  const cPrimeVal = regDirect.coefficients[1].b;

  const ab = aVal * bVal;
  const seAB = Math.sqrt(aVal * aVal * seB * seB + bVal * bVal * seA * seA);
  const zSobel = seAB > 0 ? ab / seAB : 0;
  const pSobel = normalPValue(zSobel);

  return {
    n,
    totalEffect: cVal,
    directEffect: cPrimeVal,
    indirectEffect: ab,
    pathA: { b: aVal, se: seA, t: regPathA.coefficients[1].t, p: regPathA.coefficients[1].p },
    pathB: { b: bVal, se: seB, t: regDirect.coefficients[2].t, p: regDirect.coefficients[2].p },
    sobel: {
      z: zSobel,
      se: seAB,
      p: pSobel
    },
    regTotal,
    regPathA,
    regDirect
  };
}

/**
 * Scale Reliability Analysis (Cronbach's Alpha)
 */
export function calculateReliability(columns) {
  const numItems = columns.length;
  if (numItems < 2) return null;

  const n = columns[0].length;
  const cleanRows = [];
  
  for (let i = 0; i < n; i++) {
    let valid = true;
    const rowVals = [];
    for (let j = 0; j < numItems; j++) {
      const val = columns[j][i];
      if (val === null || val === undefined || isNaN(val) || val === '') {
        valid = false;
        break;
      }
      rowVals.push(Number(val));
    }
    if (valid) {
      cleanRows.push(rowVals);
    }
  }

  const cleanN = cleanRows.length;
  if (cleanN < 3) return null;

  const cleanItems = Array.from({ length: numItems }, () => []);
  for (let i = 0; i < cleanN; i++) {
    for (let j = 0; j < numItems; j++) {
      cleanItems[j].push(cleanRows[i][j]);
    }
  }

  const itemVariances = [];
  const itemMeans = [];
  const itemSDs = [];
  for (let j = 0; j < numItems; j++) {
    const desc = calculateDescriptive(cleanItems[j]);
    itemVariances.push(desc.variance);
    itemMeans.push(desc.mean);
    itemSDs.push(desc.sd);
  }

  const totalScores = [];
  for (let i = 0; i < cleanN; i++) {
    const sum = cleanRows[i].reduce((a, b) => a + b, 0);
    totalScores.push(sum);
  }
  const totalDesc = calculateDescriptive(totalScores);
  const totalVariance = totalDesc.variance;

  if (totalVariance === 0) return null;

  const sumItemVariances = itemVariances.reduce((a, b) => a + b, 0);
  const alpha = (numItems / (numItems - 1)) * (1 - sumItemVariances / totalVariance);

  const itemAnalysis = [];
  for (let j = 0; j < numItems; j++) {
    const delItemVariances = itemVariances.filter((_, idx) => idx !== j);
    const delSumVariances = delItemVariances.reduce((a, b) => a + b, 0);
    
    const delTotalScores = [];
    for (let i = 0; i < cleanN; i++) {
      const sum = cleanRows[i].reduce((a, b, idx) => idx === j ? a : a + b, 0);
      delTotalScores.push(sum);
    }
    const delTotalDesc = calculateDescriptive(delTotalScores);
    const delTotalVariance = delTotalDesc.variance;
    
    let alphaIfDeleted = 0;
    if (numItems > 2 && delTotalVariance > 0) {
      alphaIfDeleted = ((numItems - 1) / (numItems - 2)) * (1 - delSumVariances / delTotalVariance);
    }

    const corr = calculateCorrelation(cleanItems[j], delTotalScores);

    itemAnalysis.push({
      itemIndex: j,
      mean: itemMeans[j],
      sd: itemSDs[j],
      itemVar: itemVariances[j],
      correctedCorrelation: corr ? corr.r : 0,
      alphaIfDeleted
    });
  }

  return {
    n: cleanN,
    numItems,
    alpha,
    itemVariances,
    totalVariance,
    itemAnalysis
  };
}
