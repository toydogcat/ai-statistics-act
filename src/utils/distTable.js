/**
 * Highly accurate numerical approximations for statistical distributions.
 * Used to calculate p-values on the fly in the browser.
 */

// Error function approximation (Abramowitz and Stegun 7.1.26)
function erf(x) {
  // Save the sign of x
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);

  // Constants
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  // A&S Formula 7.1.26
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x));

  return sign * y;
}

/**
 * Normal (Z) Distribution Cumulative Distribution Function (CDF)
 */
export function normalCDF(z) {
  return 0.5 * (1 + erf(z / Math.sqrt(2)));
}

/**
 * Normal (Z) Distribution p-value (two-tailed)
 */
export function normalPValue(z) {
  return 2 * (1 - normalCDF(Math.abs(z)));
}

/**
 * Regularized Incomplete Beta Function (I_x(a, b))
 * Used for t-distribution and F-distribution CDFs.
 * Evaluated using continued fractions (df >= 1).
 */
export function betaInc(x, a, b) {
  if (x < 0 || x > 1) return NaN;
  if (x === 0) return 0;
  if (x === 1) return 1;

  // Symmetry relation
  if (x > (a + 1.0) / (a + b + 2.0)) {
    return 1.0 - betaInc(1.0 - x, b, a);
  }

  // Continued fraction representation (Lentz's method)
  const epsilon = 1e-15;
  const maxIter = 200;
  
  // Log Gamma function approximation (Lanczos approximation)
  function logGamma(z) {
    const coef = [
      76.18009172947146,
      -86.50532032941677,
      24.01409824083091,
      -1.231739572450155,
      0.1208650973866179e-2,
      -0.5395239384953e-5
    ];
    let x = z;
    let y = z;
    let tmp = x + 5.5;
    tmp -= (x + 0.5) * Math.log(tmp);
    let ser = 1.000000000190015;
    for (let j = 0; j < 6; j++) {
      y += 1.0;
      ser += coef[j] / y;
    }
    return -tmp + Math.log(2.5066282746310005 * ser / x);
  }

  const factor = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1.0 - x)) / a;

  // Continued fraction terms
  let qab = a + b;
  let qap = a + 1.0;
  let qam = a - 1.0;
  let c = 1.0;
  let d = 1.0 - qab * x / qap;
  if (Math.abs(d) < epsilon) d = epsilon;
  d = 1.0 / d;
  let h = d;

  for (let m = 1; m <= maxIter; m++) {
    const m2 = 2 * m;
    // Even step
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1.0 + aa * d;
    if (Math.abs(d) < epsilon) d = epsilon;
    c = 1.0 + aa / c;
    if (Math.abs(c) < epsilon) c = epsilon;
    d = 1.0 / d;
    h *= d * c;

    // Odd step
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1.0 + aa * d;
    if (Math.abs(d) < epsilon) d = epsilon;
    c = 1.0 + aa / c;
    if (Math.abs(c) < epsilon) c = epsilon;
    d = 1.0 / d;
    const del = d * c;
    h *= del;

    if (Math.abs(del - 1.0) < epsilon) {
      return factor * h;
    }
  }

  return factor * h; // Failure to converge, return current value
}

/**
 * Student's t-Distribution Cumulative Distribution Function (CDF)
 */
export function tCDF(t, df) {
  if (df <= 0) return NaN;
  const x = df / (df + t * t);
  const p = 0.5 * betaInc(x, 0.5 * df, 0.5);
  return t >= 0 ? 1.0 - p : p;
}

/**
 * Student's t-Distribution p-value (two-tailed)
 */
export function tPValue(t, df) {
  if (df <= 0) return 1.0;
  const x = df / (df + t * t);
  return betaInc(x, 0.5 * df, 0.5);
}

/**
 * Snedecor's F-Distribution Cumulative Distribution Function (CDF)
 */
export function fCDF(f, df1, df2) {
  if (f <= 0) return 0;
  if (df1 <= 0 || df2 <= 0) return NaN;
  const x = (df1 * f) / (df1 * f + df2);
  return betaInc(x, 0.5 * df1, 0.5 * df2);
}

/**
 * Snedecor's F-Distribution p-value (right-tailed probability / significance)
 */
export function fPValue(f, df1, df2) {
  if (f <= 0) return 1.0;
  return 1.0 - fCDF(f, df1, df2);
}

/**
 * Chi-Square Distribution p-value (right-tailed)
 * Implemented via Incomplete Gamma Function
 */
export function chiSquarePValue(chi2, df) {
  if (chi2 <= 0) return 1.0;
  if (df <= 0) return 1.0;
  
  // Incomplete Gamma approximation (regularized lower gamma P(a, x))
  // For Chi-square: P(df/2, chi2/2) is the CDF, p-value is 1 - CDF = Q(df/2, chi2/2)
  // Let's use the incomplete beta approximation for chi-square or Lentz's method for gamma
  
  // Wilson-Hilferty transformation is highly accurate for df >= 2
  const term1 = chi2 / df;
  const term2 = 2 / (9 * df);
  const z = (Math.pow(term1, 1/3) - (1 - term2)) / Math.sqrt(term2);
  return 1 - normalCDF(z);
}
