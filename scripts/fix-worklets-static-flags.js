const fs = require("fs");
const path = require("path");

const targetFile = path.join(
  __dirname,
  "..",
  "node_modules",
  "react-native-worklets",
  "src",
  "featureFlags",
  "staticFlags.json"
);

const fallbackJson = "{}\n";
const expoModulesToLinkAsProjects = [
  "expo-av",
  "expo-image",
  "expo-notifications",
];

function repairWorkletsStaticFlags() {
  if (!fs.existsSync(targetFile)) {
    return;
  }

  const current = fs.readFileSync(targetFile, "utf8");
  if (current.trim().length > 0) {
    return;
  }

  fs.writeFileSync(targetFile, fallbackJson, "utf8");
  console.log(`Repaired empty Worklets flags file at ${targetFile}`);
}

function repairWorkletsPackageManifest() {
  const manifestFile = path.join(
    __dirname,
    "..",
    "node_modules",
    "react-native-worklets",
    "package.json"
  );

  if (!fs.existsSync(manifestFile)) {
    return;
  }

  const parsed = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  const hasSourceEntrypoint = fs.existsSync(
    path.join(__dirname, "..", "node_modules", "react-native-worklets", "src", "index.ts")
  );
  const hasSpecsDir = fs.existsSync(
    path.join(__dirname, "..", "node_modules", "react-native-worklets", "src", "specs")
  );
  const targetEntrypoint = hasSourceEntrypoint ? "./src/index" : "./lib/module/index";
  const targetJsSrcsDir = hasSpecsDir ? "src/specs" : "lib/module/specs";
  let changed = false;

  if (parsed["react-native"] !== targetEntrypoint) {
    parsed["react-native"] = targetEntrypoint;
    changed = true;
  }

  if (parsed.source !== targetEntrypoint) {
    parsed.source = targetEntrypoint;
    changed = true;
  }

  if (parsed.codegenConfig?.jsSrcsDir !== targetJsSrcsDir) {
    parsed.codegenConfig = {
      ...parsed.codegenConfig,
      jsSrcsDir: targetJsSrcsDir,
    };
    changed = true;
  }

  if (!changed) {
    return;
  }

  fs.writeFileSync(manifestFile, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  console.log("Repaired react-native-worklets package manifest");
}

function forceExpoModulesToUseProjectLinking() {
  for (const packageName of expoModulesToLinkAsProjects) {
    const configFile = path.join(
      __dirname,
      "..",
      "node_modules",
      packageName,
      "expo-module.config.json"
    );

    if (!fs.existsSync(configFile)) {
      continue;
    }

    const parsed = JSON.parse(fs.readFileSync(configFile, "utf8"));
    if (!parsed.android?.publication) {
      continue;
    }

    delete parsed.android.publication;
    fs.writeFileSync(configFile, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
    console.log(`Forced project linking for ${packageName}`);
  }
}

try {
  repairWorkletsStaticFlags();
  repairWorkletsPackageManifest();
  forceExpoModulesToUseProjectLinking();
} catch (error) {
  console.error("Failed to repair Android dependency packaging issues.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
