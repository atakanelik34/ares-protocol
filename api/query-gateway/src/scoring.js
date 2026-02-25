const WEIGHTS = [0.30, 0.25, 0.20, 0.15, 0.10];
const LAMBDA = 0.03;

export function tierFromAri(ari) {
  if (ari <= 99) return 'UNVERIFIED';
  if (ari <= 299) return 'PROVISIONAL';
  if (ari <= 599) return 'ESTABLISHED';
  if (ari <= 849) return 'TRUSTED';
  return 'ELITE';
}

export function computeAri(actions = []) {
  if (!actions.length) {
    return { ari: 0, tier: 'UNVERIFIED', since: null, actions: 0 };
  }
  const validActions = actions.filter((a) => String(a.status || 'VALID') !== 'INVALID');
  if (!validActions.length) {
    return { ari: 0, tier: 'UNVERIFIED', since: null, actions: 0 };
  }

  const now = Date.now();
  const weightedDim = [0, 0, 0, 0, 0];
  let decaySum = 0;

  for (const action of validActions) {
    const ts = new Date(action.timestamp).getTime();
    const daysSince = Math.max(0, Math.floor((now - ts) / 86400000));
    const decay = Math.exp(-LAMBDA * daysSince);
    decaySum += decay;

    for (let i = 0; i < 5; i++) {
      weightedDim[i] += (Number(action.scores?.[i] || 0) * decay);
    }
  }

  let weighted = 0;
  for (let i = 0; i < 5; i++) {
    const dim = decaySum === 0 ? 0 : Math.min(200, weightedDim[i] / decaySum);
    weighted += dim * WEIGHTS[i];
  }

  const volume = Math.min(1, validActions.length / 100);
  const ari = Math.max(0, Math.min(1000, Math.round(weighted * volume * 5)));

  const since = validActions
    .map((a) => new Date(a.timestamp).getTime())
    .sort((a, b) => a - b)[0];

  return {
    ari,
    tier: tierFromAri(ari),
    since: new Date(since).toISOString(),
    actions: validActions.length
  };
}
