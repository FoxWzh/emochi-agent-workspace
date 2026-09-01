/**
 * Minimal deterministic guard for Bot change proposals.
 * Transport and persistence deliberately remain outside the Agent spec.
 */
const AREAS = new Set(['basic', 'content', 'advanced']);
const OPERATIONS = new Set(['replace', 'merge', 'clear']);

export function validateBotChangeProposal(proposal) {
  const errors = [];
  if (!proposal || typeof proposal !== 'object') return { ok: false, errors: ['proposal must be an object'] };
  if (typeof proposal.bot_id !== 'string' || !proposal.bot_id) errors.push('bot_id is required');
  if (!Array.isArray(proposal.changes) || proposal.changes.length === 0) errors.push('at least one change is required');
  for (const [index, change] of (proposal.changes ?? []).entries()) {
    const prefix = `changes[${index}]`;
    if (!AREAS.has(change?.area)) errors.push(`${prefix}.area must be basic, content, or advanced`);
    if (!OPERATIONS.has(change?.operation)) errors.push(`${prefix}.operation must be replace, merge, or clear`);
    if (typeof change?.reason !== 'string' || !change.reason.trim()) errors.push(`${prefix}.reason is required`);
  }
  return { ok: errors.length === 0, errors };
}
