/** Voter support levels and the path-to-victory projection. */

export const SUPPORT_LEVELS = [
  { id: 'strong', label: 'Strong support', short: 'Strong', weight: 0.9, tone: 'strong' },
  { id: 'leaning', label: 'Leaning our way', short: 'Leaning', weight: 0.6, tone: 'lean' },
  { id: 'undecided', label: 'Undecided', short: 'Undecided', weight: 0.25, tone: 'neutral' },
  { id: 'opposed', label: 'Opposed', short: 'Opposed', weight: 0, tone: 'against' },
];

export const UNKNOWN_LEVEL = { id: 'unknown', label: 'Not yet assessed', short: 'Unassessed', weight: 0.5, tone: 'muted' };

export function getSupportLevel(id) {
  return SUPPORT_LEVELS.find((l) => l.id === id) || UNKNOWN_LEVEL;
}

export function countBySupport(voters = []) {
  const counts = { strong: 0, leaning: 0, undecided: 0, opposed: 0, unknown: 0 };
  voters.forEach((v) => {
    const key = counts[v.supportLevel] != null ? v.supportLevel : 'unknown';
    counts[key] += 1;
  });
  return counts;
}

export function projectVotes(voters = []) {
  return Math.round(
    voters.reduce((sum, v) => sum + getSupportLevel(v.supportLevel).weight, 0),
  );
}

/**
 * @returns {{ projected:number, target:number, progress:number, gap:number, counts:object }}
 */
export function pathToVictory(campaign, voters = []) {
  const projected = projectVotes(voters);
  const target = Number(campaign?.voteTarget || 0);
  const progress = target > 0 ? Math.min(1, projected / target) : 0;
  return {
    projected,
    target,
    progress,
    gap: Math.max(0, target - projected),
    counts: countBySupport(voters),
  };
}

export function groupBy(rows = [], keyFn) {
  const map = new Map();
  rows.forEach((r) => {
    const key = keyFn(r) || 'Unassigned';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(r);
  });
  return map;
}

/** Rank polling stations / areas by projected votes. */
export function stationBreakdown(voters = [], field = 'pollingStation') {
  const map = groupBy(voters, (v) => (v[field] || '').trim());
  return Array.from(map.entries())
    .map(([name, list]) => {
      const counts = countBySupport(list);
      return {
        name,
        total: list.length,
        projected: projectVotes(list),
        counts,
        persuadable: counts.undecided + counts.leaning,
      };
    })
    .sort((a, b) => b.total - a.total);
}

/** Days until election (null if not set). */
export function daysToElection(campaign) {
  if (!campaign?.electionDate) return null;
  const d = new Date(`${campaign.electionDate}T07:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}
