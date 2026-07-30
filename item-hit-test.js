(function initItemHitTest(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.TottoItemHitTest = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createItemHitTest() {
  "use strict";

  function localPoint(candidate, point) {
    const scale = Number(candidate.scale) || 1;
    const radians = ((Number(candidate.rotation) || 0) * Math.PI) / 180;
    const dx = (point.x - candidate.centerX) / scale;
    const dy = (point.y - candidate.centerY) / scale;
    const cosine = Math.cos(radians);
    const sine = Math.sin(radians);
    const x = cosine * dx + sine * dy + candidate.width / 2;
    const y = -sine * dx + cosine * dy + candidate.height / 2;

    return {
      u: x / candidate.width,
      v: y / candidate.height
    };
  }

  function pickVisibleCandidate(candidates, point, threshold = 0.12) {
    const ordered = [...candidates].sort((a, b) => b.z - a.z);

    for (const candidate of ordered) {
      const local = localPoint(candidate, point);
      if (local.u < 0 || local.u > 1 || local.v < 0 || local.v > 1) continue;
      if (candidate.alphaAt(local.u, local.v) >= threshold) return candidate;
    }

    return null;
  }

  function sampleContainedAlpha(mask, u, v, containerWidth, containerHeight) {
    if (!mask || !mask.width || !mask.height || !mask.alpha) return 1;

    const imageAspect = mask.width / mask.height;
    const containerAspect = containerWidth / containerHeight;
    const renderWidth = imageAspect > containerAspect
      ? containerWidth
      : containerHeight * imageAspect;
    const renderHeight = imageAspect > containerAspect
      ? containerWidth / imageAspect
      : containerHeight;
    const renderLeft = (containerWidth - renderWidth) / 2;
    const renderTop = (containerHeight - renderHeight) / 2;
    const x = u * containerWidth - renderLeft;
    const y = v * containerHeight - renderTop;

    if (x < 0 || x >= renderWidth || y < 0 || y >= renderHeight) return 0;

    const pixelX = Math.min(mask.width - 1, Math.floor((x / renderWidth) * mask.width));
    const pixelY = Math.min(mask.height - 1, Math.floor((y / renderHeight) * mask.height));
    return mask.alpha[pixelY * mask.width + pixelX] / 255;
  }

  return { localPoint, pickVisibleCandidate, sampleContainedAlpha };
});
