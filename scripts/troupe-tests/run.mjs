import {
  DEFAULT_PASSWORD,
  buildRunId,
  cleanup,
  createState,
  getArgValue,
  hasFlag,
  parseMemberCount,
} from "./helpers.mjs";
import { scenarioHandlers } from "./scenarios.mjs";

function getScenarioName() {
  return getArgValue("--scenario") ?? "happy-path";
}

function resolveScenarios(requestedScenario) {
  if (requestedScenario === "all") {
    return Object.keys(scenarioHandlers);
  }

  if (!scenarioHandlers[requestedScenario]) {
    throw new Error(
      `Unknown scenario "${requestedScenario}". ` +
        `Use one of: ${Object.keys(scenarioHandlers).join(", ")}, all.`
    );
  }

  return [requestedScenario];
}

function buildScenarioOptions(scenarioName) {
  return {
    keepData: hasFlag("--keep") || process.env.SMOKE_TEST_KEEP_DATA === "1",
    memberCount: parseMemberCount(),
    password: process.env.SMOKE_TEST_PASSWORD ?? DEFAULT_PASSWORD,
    prefix: process.env.SMOKE_TEST_PREFIX ?? `smoke-${scenarioName}`,
    runId: buildRunId(),
    scenarioName,
  };
}

async function runScenarioByName(scenarioName) {
  const state = createState();
  const options = buildScenarioOptions(scenarioName);

  try {
    await scenarioHandlers[scenarioName](options, state);
    console.log("");
    console.log(`Scenario "${scenarioName}" completed successfully.`);
  } finally {
    await cleanup(state, options.keepData, scenarioName);
  }
}

async function main() {
  const requestedScenario = getScenarioName();
  const scenarios = resolveScenarios(requestedScenario);

  for (const scenarioName of scenarios) {
    await runScenarioByName(scenarioName);
    if (scenarios.length > 1 && scenarioName !== scenarios[scenarios.length - 1]) {
      console.log("");
      console.log("-----");
      console.log("");
    }
  }
}

main().catch((error) => {
  console.error("");
  console.error("Smoke test failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
