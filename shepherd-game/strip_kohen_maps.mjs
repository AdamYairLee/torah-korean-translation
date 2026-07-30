import { NodeIO } from "@gltf-transform/core";

const input = new URL("./assets/models/kohen_rigged_game.glb", import.meta.url).pathname;
const io = new NodeIO();
const document = await io.read(input);

for (const material of document.getRoot().listMaterials()) {
  material.setNormalTexture(null);
  material.setMetallicRoughnessTexture(null);
  material.setMetallicFactor(0);
  material.setRoughnessFactor(0.88);
}

for (const texture of document.getRoot().listTextures()) {
  if (texture.listParents().length === 1) texture.dispose();
}

await io.write(input, document);
