import fs from "node:fs";
const [baselinePath, androidPath, iosPath] = process.argv.slice(2);
if (!baselinePath || !androidPath || !iosPath)
  throw Error("Provide the verified baseline and both generated fingerprints.");
const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const baseline = read(baselinePath);
for (const [platform, path] of [
  ["android", androidPath],
  ["ios", iosPath],
]) {
  const actual = read(path).hash,
    expected = baseline[platform];
  if (!/^[a-f0-9]{40}$/.test(expected || "") || actual !== expected)
    throw Error(
      `${platform} native runtime changed. Build and verify a matching binary before updating the OTA baseline.`,
    );
  console.log(
    `${platform}: matches the ${baseline.release} native baseline (${actual})`,
  );
}
