import fs from "node:fs";
import path from "node:path";

const root = "/Users/busecimen/Downloads/AresProtocol";
const tokenomicsPath = path.join(root, "docs/tokenomics.constants.json");
const outputPath = path.join(root, "docs/certification/generated/governance-threshold-model-2026-03-01.json");

const constants = JSON.parse(fs.readFileSync(tokenomicsPath, "utf8"));

const totalSupply = BigInt(constants.supply.totalSupplyTokens);
const tgeCirculating = BigInt(constants.tge.targetCirculatingTokens);
const quorumBps = 400n;
const proposalThresholdTokens = 0n;

const quorumTokens = (totalSupply * quorumBps) / 10_000n;
const quorumPctOfTotal = Number(quorumTokens * 10_000n / totalSupply) / 100;
const quorumPctOfTge = Number(quorumTokens * 10_000n / tgeCirculating) / 100;

const fullAllocationSingleBlockers = constants.allocation
  .map((item) => ({
    key: item.key,
    label: item.label,
    tokens: item.tokens,
    meetsQuorumAlone: BigInt(item.tokens) >= quorumTokens,
  }))
  .filter((item) => item.meetsQuorumAlone);

const tgeComponents = constants.tge.components.map((component) => ({
  source: component.source,
  label: component.label,
  tokens: component.tokens,
}));

const sortedTge = [...tgeComponents].sort((a, b) => Number(BigInt(b.tokens) - BigInt(a.tokens)));
let coalition = [];
let running = 0n;
for (const component of sortedTge) {
  coalition.push(component);
  running += BigInt(component.tokens);
  if (running >= quorumTokens) break;
}

const tgeSingleBlockers = tgeComponents.filter((component) => BigInt(component.tokens) >= quorumTokens);

const report = {
  statusDate: "2026-03-01",
  sourceArtifacts: {
    tokenomics: "docs/tokenomics.constants.json",
    governorContract: "contracts/token/AresGovernor.sol",
  },
  governorParameters: {
    votingDelaySeconds: 86400,
    votingPeriodSeconds: 604800,
    quorumBps: Number(quorumBps),
    proposalThresholdTokens: proposalThresholdTokens.toString(),
  },
  supplyModel: {
    totalSupplyTokens: totalSupply.toString(),
    tgeCirculatingTokens: tgeCirculating.toString(),
  },
  thresholds: {
    quorumTokens: quorumTokens.toString(),
    quorumPctOfTotalSupply: quorumPctOfTotal,
    quorumPctOfTgeCirculating: quorumPctOfTge,
  },
  implications: {
    zeroProposalThreshold: true,
    singleBlocAtQuorumCanPassUnderLowTurnout: true,
    postSnapshotVoteInjectionMitigatedByVotesSnapshot: true,
  },
  fullAllocationSingleBlockers,
  tgeSingleBlockers,
  minimumTgeCoalitionToMeetQuorum: {
    components: coalition,
    coalitionTokens: running.toString(),
    coalitionSize: coalition.length,
  },
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + "\n");
console.log(outputPath);
