import { Vector4 } from './three.module.js';

function findSpan(p, u, U) {
  const n = U.length - p - 2;
  if (u >= U[n + 1]) return n;
  if (u <= U[p]) return p;
  let low = p, high = n + 1, mid = Math.floor((low + high) / 2);
  while (u < U[mid] || u >= U[mid + 1]) {
    if (u < U[mid]) high = mid; else low = mid;
    mid = Math.floor((low + high) / 2);
  }
  return mid;
}

function calcBasisFunctions(span, u, p, U) {
  const N = new Array(p + 1).fill(0);
  const left = new Array(p + 1).fill(0);
  const right = new Array(p + 1).fill(0);
  N[0] = 1.0;
  for (let j = 1; j <= p; ++j) {
    left[j] = u - U[span + 1 - j];
    right[j] = U[span + j] - u;
    let saved = 0.0;
    for (let r = 0; r < j; ++r) {
      const denom = right[r + 1] + left[j - r];
      const temp = denom !== 0 ? N[r] / denom : 0;
      N[r] = saved + right[r + 1] * temp;
      saved = left[j - r] * temp;
    }
    N[j] = saved;
  }
  return N;
}

function calcBSplinePoint(p, U, P, u) {
  const span = findSpan(p, u, U);
  const N = calcBasisFunctions(span, u, p, U);
  const C = new Vector4(0, 0, 0, 0);
  for (let j = 0; j <= p; ++j) {
    const point = P[span - p + j];
    const w = point.w !== undefined ? point.w : 1;
    C.x += N[j] * point.x * w;
    C.y += N[j] * point.y * w;
    C.z += N[j] * point.z * w;
    C.w += N[j] * w;
  }
  return C;
}

function calcNURBSDerivatives(p, U, P, u, nd) {
  // NURBSCurve only asks for first derivative. A stable central difference is
  // sufficient here and avoids loader failure for FBX files containing NURBS.
  const h = 1e-5;
  const min = U[p];
  const max = U[U.length - p - 1];
  const u0 = Math.max(min, u - h);
  const u1 = Math.min(max, u + h);
  const a = calcBSplinePoint(p, U, P, u0);
  const b = calcBSplinePoint(p, U, P, u1);
  if (a.w !== 0) a.divideScalar(a.w);
  if (b.w !== 0) b.divideScalar(b.w);
  const d = new Vector4(
    (b.x - a.x) / Math.max(1e-9, u1 - u0),
    (b.y - a.y) / Math.max(1e-9, u1 - u0),
    (b.z - a.z) / Math.max(1e-9, u1 - u0),
    0
  );
  const c = calcBSplinePoint(p, U, P, u);
  if (c.w !== 0) c.divideScalar(c.w);
  const out = [c, d];
  while (out.length <= nd) out.push(new Vector4());
  return out;
}

export { findSpan, calcBasisFunctions, calcBSplinePoint, calcNURBSDerivatives };
