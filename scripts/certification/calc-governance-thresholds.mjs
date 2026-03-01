import fs from 'node:fs';
import path from 'node:path';

const root = '/Users/busecimen/Downloads/AresProtocol';
const tokenomicsPath = path.join(root, 'docs/tokenomics.constants.json');
const outputPath = path.join(root, 'docs/certification/generated/governance-threshold-model-2026-03-01.json');

const constants = JSON.parse(fs.readFileSync(tokenomicsPath, 'utf8'));

const totalSupply = BigInt(constants.supply.totalSupplyTokens);
const tgeCirculating = BigInt(constants.tge.targetCirculatingTokens);

const profiles = {
  currentTestnet: {
    label: 'Current testnet / pre-decision profile',
    authorityModelVersion: 'gov-testnet-v1',
    votingDelayUnits: 86400,
    votingPeriodUnits: 604800,
    proposalThresholdTokens: 0n,
    quorumBps: 400n,
    timelockMinDelaySeconds: 172800,
    openExecutor: true,
  },
  acceptedMainnet: {
    label: 'Accepted conservative mainnet target',
    authorityModelVersion: 'gov-mainnet-conservative-v1',
    votingDelayUnits: 86400,
    votingPeriodUnits: 604800,
    proposalThresholdTokens: 1_000_000n,
    quorumBps: 600n,
    timelockMinDelaySeconds: 172800,
    openExecutor: true,
  },
};

function buildProfile(profile) {
  const quorumTokens = (totalSupply * profile.quorumBps) / 10_000n;
  const quorumPctOfTotal = Number((quorumTokens * 10_000n) / totalSupply) / 100;
  const quorumPctOfTge = Number((quorumTokens * 10_000n) / tgeCirculating) / 100;

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
  const coalition = [];
  let running = 0n;
  for (const component of sortedTge) {
    coalition.push(component);
    running += BigInt(component.tokens);
    if (running >= quorumTokens) break;
  }

  const tgeSingleBlockers = tgeComponents.filter((component) => BigInt(component.tokens) >= quorumTokens);

  return {
    label: profile.label,
    authorityModelVersion: profile.authorityModelVersion,
    governorClockMode: 'blocknumber',
    governorParameters: {
      votingDelayUnits: profile.votingDelayUnits,
      votingPeriodUnits: profile.votingPeriodUnits,
      proposalThresholdTokens: profile.proposalThresholdTokens.toString(),
      quorumBps: Number(profile.quorumBps),
      timelockMinDelaySeconds: profile.timelockMinDelaySeconds,
      openExecutor: profile.openExecutor,
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
      zeroProposalThreshold: profile.proposalThresholdTokens === 0n,
      singleBlocAtQuorumCanPassUnderLowTurnout: true,
      postSnapshotVoteInjectionMitigatedByVotesSnapshot: true,
      tgeSingleComponentCanMeetQuorum: tgeSingleBlockers.length > 0,
    },
    fullAllocationSingleBlockers,
    tgeSingleBlockers,
    minimumTgeCoalitionToMeetQuorum: {
      components: coalition,
      coalitionTokens: running.toString(),
      coalitionSize: coalition.length,
    },
  };
}

const currentTestnet = buildProfile(profiles.currentTestnet);
const acceptedMainnet = buildProfile(profiles.acceptedMainnet);

const report = {
  statusDate: '2026-03-01',
  sourceArtifacts: {
    tokenomics: 'docs/tokenomics.constants.json',
    governorContract: 'contracts/token/AresGovernor.sol',
    decisionRecord: 'docs/certification/generated/governance-parameter-decision-2026-03-01.md',
  },
  comparison: {
    proposalThresholdIncreaseTokens: (
      BigInt(acceptedMainnet.governorParameters.proposalThresholdTokens) -
      BigInt(currentTestnet.governorParameters.proposalThresholdTokens)
    ).toString(),
    quorumIncreaseTokens: (
      BigInt(acceptedMainnet.thresholds.quorumTokens) - BigInt(currentTestnet.thresholds.quorumTokens)
    ).toString(),
    currentTgeSingleComponentCanMeetQuorum: currentTestnet.implications.tgeSingleComponentCanMeetQuorum,
    acceptedMainnetTgeSingleComponentCanMeetQuorum: acceptedMainnet.implications.tgeSingleComponentCanMeetQuorum,
  },
  profiles: {
    currentTestnet,
    acceptedMainnet,
  },
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
console.log(outputPath);
