import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const constantsPath = resolve(root, 'docs/tokenomics.constants.json');
const outPath = resolve(root, 'docs/tokenomics-validation.json');

const raw = JSON.parse(readFileSync(constantsPath, 'utf8'));

const WAD = 10n ** 18n;

function toBigIntTokens(value) {
  return BigInt(String(value));
}

function toWei(tokens) {
  return toBigIntTokens(tokens) * WAD;
}

const totalSupplyTokens = toBigIntTokens(raw.supply.totalSupplyTokens);
const totalSupplyWei = toWei(raw.supply.totalSupplyTokens);

const allocationRows = raw.allocation.map((row) => {
  const allocationTokens = toBigIntTokens(row.tokens);
  const allocationWei = toWei(row.tokens);
  const scheduleTokens = row.unlockSchedule.reduce((acc, s) => acc + toBigIntTokens(s.tokens), 0n);
  const scheduleWei = row.unlockSchedule.reduce((acc, s) => acc + toWei(s.tokens), 0n);
  const percentBps = Math.round(Number(row.percent) * 100);

  return {
    key: row.key,
    label: row.label,
    percent: row.percent,
    percentBps,
    tokens: allocationTokens.toString(),
    wei: allocationWei.toString(),
    scheduleTokens: scheduleTokens.toString(),
    scheduleWei: scheduleWei.toString(),
    scheduleMatchesAllocation: scheduleTokens === allocationTokens && scheduleWei === allocationWei,
    unlockSchedule: row.unlockSchedule
  };
});

const allocationTotalTokens = allocationRows.reduce((acc, row) => acc + BigInt(row.tokens), 0n);
const allocationTotalWei = allocationRows.reduce((acc, row) => acc + BigInt(row.wei), 0n);

const tgeRows = raw.tge.components.map((row) => ({
  ...row,
  tokens: toBigIntTokens(row.tokens).toString(),
  wei: toWei(row.tokens).toString()
}));
const tgeTotalTokens = tgeRows.reduce((acc, row) => acc + BigInt(row.tokens), 0n);
const tgeTotalWei = tgeRows.reduce((acc, row) => acc + BigInt(row.wei), 0n);

const seedExpectedTokens = BigInt(Math.floor(Number(raw.seed.raiseCapUsd) / Number(raw.seed.tokenPriceUsd)));
const seedConfiguredTokens = toBigIntTokens(raw.seed.maxTokens);
const seedTgeUnlockTokens = toBigIntTokens(raw.seed.tgeUnlockTokens);

const report = {
  generatedAt: raw.meta?.asOf ? `${raw.meta.asOf}T00:00:00.000Z` : null,
  constantsVersion: raw.meta.version,
  summary: {
    totalSupplyTokens: totalSupplyTokens.toString(),
    totalSupplyWei: totalSupplyWei.toString(),
    allocationTotalTokens: allocationTotalTokens.toString(),
    allocationTotalWei: allocationTotalWei.toString(),
    tgeTargetTokens: String(raw.tge.targetCirculatingTokens),
    tgeTargetWei: toWei(raw.tge.targetCirculatingTokens).toString(),
    tgeComputedTokens: tgeTotalTokens.toString(),
    tgeComputedWei: tgeTotalWei.toString(),
    seedConfiguredTokens: seedConfiguredTokens.toString(),
    seedExpectedTokensFromCap: seedExpectedTokens.toString(),
    seedTgeUnlockTokens: seedTgeUnlockTokens.toString()
  },
  invariants: {
    allocationSumEqualsTotalSupply: allocationTotalTokens === totalSupplyTokens && allocationTotalWei === totalSupplyWei,
    tgeSumEqualsTarget: tgeTotalTokens === toBigIntTokens(raw.tge.targetCirculatingTokens) && tgeTotalWei === toWei(raw.tge.targetCirculatingTokens),
    seedCapMathMatchesConfiguredTokens: seedConfiguredTokens === seedExpectedTokens,
    seedTgeUnlockIsZero: seedTgeUnlockTokens === 0n,
    categoryUnlockSumsMatchCategoryAllocations: allocationRows.every((row) => row.scheduleMatchesAllocation),
    revenueSplitBpsEquals10000:
      Number(raw.revenue.buybackBurnBps) + Number(raw.revenue.treasuryBps) + Number(raw.revenue.stakingPoolBps) === 10_000
  },
  allocation: allocationRows,
  tge: tgeRows,
  notes: [
    'All arithmetic is deterministic and calculated in token units plus 1e18 wei units.',
    'This artifact validates documentation constants; it does not enforce on-chain mint/vesting behavior in this sprint.'
  ]
};

writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

const allPassed = Object.values(report.invariants).every(Boolean);
if (!allPassed) {
  process.stderr.write(`Tokenomics invariant check failed. See ${outPath}\n`);
  process.exit(1);
}

process.stdout.write(`PASS tokenomics invariants -> ${outPath}\n`);
