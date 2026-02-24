export function deterministicScores({ actionId }) {
  const seed = [...actionId].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const base = 80 + (seed % 80);

  return [
    Math.min(200, base + 10),
    Math.min(200, base + 5),
    Math.min(200, base),
    Math.min(200, base - 5),
    Math.min(200, base - 10)
  ];
}
