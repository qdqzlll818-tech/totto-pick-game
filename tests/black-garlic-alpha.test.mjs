import assert from "node:assert/strict";
import test from "node:test";
import { readRgbaPng } from "../scripts/read-png.mjs";

test("black garlic keeps a transparent exterior and an opaque dark body", async () => {
  const image = await readRgbaPng(new URL("../assets/garlic/purple-garlic-opaque.png", import.meta.url));
  const pixel = (x, y) => image.pixels.subarray((y * image.width + x) * 4, (y * image.width + x + 1) * 4);
  const corners = [pixel(0, 0), pixel(image.width - 1, 0), pixel(0, image.height - 1), pixel(image.width - 1, image.height - 1)];
  assert.ok(corners.every(rgba => rgba[3] === 0));

  let bodyPixels = 0;
  let opaqueBodyPixels = 0;
  let translucentBodyPixels = 0;
  for (let offset = 0; offset < image.pixels.length; offset += 4) {
    const red = image.pixels[offset];
    const green = image.pixels[offset + 1];
    const blue = image.pixels[offset + 2];
    const alpha = image.pixels[offset + 3];
    if (alpha <= 8 || (red + green + blue) / 3 >= 130) continue;
    bodyPixels += 1;
    if (alpha >= 245) opaqueBodyPixels += 1;
    if (alpha < 200) translucentBodyPixels += 1;
  }

  assert.ok(bodyPixels > 20_000);
  assert.ok(opaqueBodyPixels / bodyPixels > 0.96);
  assert.ok(translucentBodyPixels / bodyPixels < 0.025);
  assert.equal(pixel(Math.floor(image.width / 2), Math.floor(image.height / 2))[3], 255);
});
