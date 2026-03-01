import fs from 'node:fs';
import path from 'node:path';

const root = '/Users/busecimen/Downloads/AresProtocol';
const thresholdPath = path.join(root, 'docs/certification/generated/governance-threshold-model-2026-03-01.json');
const tokenomicsPath = path.join(root, 'docs/tokenomics.constants.json');
const outputPath = path.join(root, 'docs/certification/generated/governance-capture-scenarios-2026-03-01.json');

const threshold = JSON.parse(fs.readFileSync(thresholdPath, 'utf8'));
const tokenomics = JSON.parse(fs.readFileSync(tokenomicsPath, 'utf8'));
const seedPrice = Number(tokenomics.seed.tokenPriceUsd);

const fmtPct = (value, denom) => Number((value * 10_000n) / denom) / 100;
const fmtUsd = (tokens) => Number(tokens) * seedPrice;

function buildProfile(profile, totalSupply, tgeSupply) {
  const quorum = BigInt(profile.thresholds.quorumTokens);
  const proposalThreshold = BigInt(profile.governorParameters.proposalThresholdTokens);
  const tgeComponents = tokenomics.tge.components.map((item) => ({
    source: item.source,
    label: item.label,
    tokens: item.tokens,
  }));

  const scenarios = [
    {
      id: 'GOV-CAP-01',
      title: 'Single-bloc quorum capture under low turnout',
      condition: 'A single aligned voting bloc reaches quorum while opposition turnout is negligible.',
      requiredTokens: quorum.toString(),
      pctTotalSupply: fmtPct(quorum, totalSupply),
      pctTgeCirculating: fmtPct(quorum, tgeSupply),
      referenceNotionalUsdAtSeedPrice: fmtUsd(quorum),
      repeatability: 'repeatable if quorum-sized bloc remains coordinated and opposition turnout stays weak',
      maximalDamage: 'pass arbitrary queued proposals within timelock and governance scope',
      mitigationStatus: profile.implications.tgeSingleComponentCanMeetQuorum ? 'BLOCKED' : 'REDUCED',
    },
    {
      id: 'GOV-CAP-02',
      title: 'TGE-era single-source quorum concentration',
      condition: 'A single TGE source controls the full circulating quorum-sized tranche.',
      requiredTokens: quorum.toString(),
      pctTotalSupply: fmtPct(quorum, totalSupply),
      pctTgeCirculating: fmtPct(quorum, tgeSupply),
      referenceNotionalUsdAtSeedPrice: fmtUsd(quorum),
      repeatability: 'bounded to the launch circulating set but immediately material at TGE if concentration is not constrained',
      maximalDamage: 'same as GOV-CAP-01, amplified by low early turnout',
      mitigationStatus: profile.implications.tgeSingleComponentCanMeetQuorum ? 'BLOCKED' : 'REDUCED',
    },
    {
      id: 'GOV-CAP-03',
      title: 'Proposal spam workload',
      condition: 'Proposal creation cost is determined by proposal threshold in voting token units.',
      requiredTokens: proposalThreshold.toString(),
      pctTotalSupply: fmtPct(proposalThreshold, totalSupply),
      pctTgeCirculating: fmtPct(proposalThreshold, tgeSupply),
      referenceNotionalUsdAtSeedPrice: fmtUsd(proposalThreshold),
      repeatability: proposalThreshold === 0n
        ? 'repeatable with no token capital gate'
        : 'requires threshold-sized voting inventory before proposal creation',
      maximalDamage: 'governance reviewer fatigue, operational queue noise, and monitoring load',
      mitigationStatus: proposalThreshold === 0n ? 'BLOCKED' : 'REDUCED',
    },
    {
      id: 'GOV-CAP-04',
      title: 'Post-snapshot vote injection',
      condition: 'Attacker tries to mint or delegate after snapshot to rescue an existing proposal.',
      requiredTokens: 'n/a',
      pctTotalSupply: null,
      pctTgeCirculating: null,
      referenceNotionalUsdAtSeedPrice: null,
      repeatability: 'not currently viable for an existing proposal under OZ Votes snapshot semantics',
      maximalDamage: 'bounded; existing-proposal vote inflation blocked',
      mitigationStatus: 'MITIGATED',
    },
  ];

  return {
    label: profile.label,
    governorParameters: profile.governorParameters,
    thresholds: profile.thresholds,
    tgeConcentrationRead: {
      minimumTgeCoalitionToMeetQuorum: profile.minimumTgeCoalitionToMeetQuorum,
      tgeComponents,
      singleComponentCanMeetQuorum: profile.implications.tgeSingleComponentCanMeetQuorum,
    },
    scenarios,
  };
}

const totalSupply = BigInt(threshold.profiles.currentTestnet.supplyModel.totalSupplyTokens);
const tgeSupply = BigInt(threshold.profiles.currentTestnet.supplyModel.tgeCirculatingTokens);

const currentTestnet = buildProfile(threshold.profiles.currentTestnet, totalSupply, tgeSupply);
const acceptedMainnet = buildProfile(threshold.profiles.acceptedMainnet, totalSupply, tgeSupply);

const output = {
  statusDate: '2026-03-01',
  sourceArtifacts: {
    thresholdModel: 'docs/certification/generated/governance-threshold-model-2026-03-01.json',
    tokenomics: 'docs/tokenomics.constants.json',
    decisionRecord: 'docs/certification/generated/governance-parameter-decision-2026-03-01.md',
  },
  assumptions: {
    totalSupplyTokens: totalSupply.toString(),
    tgeCirculatingTokens: tgeSupply.toString(),
    seedReferencePriceUsd: tokenomics.seed.tokenPriceUsd,
    priceNote: 'Reference notional cost uses seed price only and is not treated as executable market liquidity or final fair value.',
  },
  comparison: {
    quorumDeltaTokens: (
      BigInt(acceptedMainnet.thresholds.quorumTokens) - BigInt(currentTestnet.thresholds.quorumTokens)
    ).toString(),
    proposalThresholdDeltaTokens: (
      BigInt(acceptedMainnet.governorParameters.proposalThresholdTokens) -
      BigInt(currentTestnet.governorParameters.proposalThresholdTokens)
    ).toString(),
    currentSingleTgeComponentMeetsQuorum: currentTestnet.tgeConcentrationRead.singleComponentCanMeetQuorum,
    acceptedSingleTgeComponentMeetsQuorum: acceptedMainnet.tgeConcentrationRead.singleComponentCanMeetQuorum,
  },
  profiles: {
    currentTestnet,
    acceptedMainnet,
  },
};

fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(outputPath);
