import fs from 'node:fs';
import path from 'node:path';

const root = '/Users/busecimen/Downloads/AresProtocol';
const thresholdPath = path.join(root, 'docs/certification/generated/governance-threshold-model-2026-03-01.json');
const tokenomicsPath = path.join(root, 'docs/tokenomics.constants.json');
const outputPath = path.join(root, 'docs/certification/generated/governance-capture-scenarios-2026-03-01.json');

const threshold = JSON.parse(fs.readFileSync(thresholdPath, 'utf8'));
const tokenomics = JSON.parse(fs.readFileSync(tokenomicsPath, 'utf8'));

const totalSupply = BigInt(threshold.supplyModel.totalSupplyTokens);
const tgeSupply = BigInt(threshold.supplyModel.tgeCirculatingTokens);
const quorum = BigInt(threshold.thresholds.quorumTokens);
const seedPrice = Number(tokenomics.seed.tokenPriceUsd);
const fmtPct = (value, denom) => Number(((value * 10000n) / denom)) / 100;
const fmtUsd = (tokens) => Number(tokens) * seedPrice;

const tgeComponents = tokenomics.tge.components.map((item) => ({
  source: item.source,
  label: item.label,
  tokens: item.tokens
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
    mitigationStatus: 'blocked only by turnout, distribution discipline, signer review, and timelock monitoring'
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
    mitigationStatus: 'requires distribution controls, signer review, and parameter acceptance'
  },
  {
    id: 'GOV-CAP-03',
    title: 'Proposal spam workload',
    condition: 'Proposal threshold remains zero so proposal creation is not token-gated.',
    requiredTokens: '0',
    pctTotalSupply: 0,
    pctTgeCirculating: 0,
    referenceNotionalUsdAtSeedPrice: 0,
    repeatability: 'repeatable with no token capital gate',
    maximalDamage: 'governance reviewer fatigue, operational queue noise, and monitoring load',
    mitigationStatus: 'unmitigated at contract threshold level; must be justified or changed'
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
    mitigationStatus: 'mechanically mitigated by snapshot semantics and local executable tests'
  }
];

const output = {
  statusDate: '2026-03-01',
  sourceArtifacts: {
    thresholdModel: 'docs/certification/generated/governance-threshold-model-2026-03-01.json',
    tokenomics: 'docs/tokenomics.constants.json'
  },
  assumptions: {
    totalSupplyTokens: totalSupply.toString(),
    tgeCirculatingTokens: tgeSupply.toString(),
    quorumTokens: quorum.toString(),
    proposalThresholdTokens: threshold.governorParameters.proposalThresholdTokens,
    seedReferencePriceUsd: tokenomics.seed.tokenPriceUsd,
    priceNote: 'Reference notional cost uses seed price only and is not treated as executable market liquidity or final fair value.'
  },
  tgeConcentrationRead: {
    minimumTgeCoalitionToMeetQuorum: threshold.minimumTgeCoalitionToMeetQuorum,
    tgeComponents,
    singleComponentCanMeetQuorum: tgeComponents.some((item) => BigInt(item.tokens) >= quorum)
  },
  scenarios
};

fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(outputPath);
