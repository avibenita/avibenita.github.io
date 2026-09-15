/** @jest-environment node */
const { computeOLS } = require('./regression-compute.js');

describe('computeOLS mean-response ingredients', () => {
  test('returns XtX_inv matching coefficient standard errors', () => {
    const X = [[1], [2], [3], [4], [5]];
    const Y = [3, 5, 7, 8, 11];
    const res = computeOLS(X, Y, true, 0.05);
    expect(res.XtX_inv).toBeTruthy();
    expect(res.XtX_inv.length).toBe(res.coefficients.length);
    res.coefficients.forEach((_, i) => {
      const seFromInv = Math.sqrt(res.XtX_inv[i][i] * res.MSE);
      expect(seFromInv).toBeCloseTo(res.std_errors[i], 10);
    });
  });

  test('mean-response variance is smaller than residual MSE', () => {
    const X = [[1], [2], [3], [4], [5]];
    const Y = [3, 5, 7, 8, 11];
    const res = computeOLS(X, Y, true, 0.05);
    const x0 = [1, 3];
    let quad = 0;
    for (let i = 0; i < x0.length; i++) {
      let inner = 0;
      for (let j = 0; j < x0.length; j++) inner += res.XtX_inv[i][j] * x0[j];
      quad += x0[i] * inner;
    }
    expect(quad).toBeGreaterThan(0);
    expect(res.MSE * quad).toBeLessThan(res.MSE);
  });
});
