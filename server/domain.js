export const allowedStatuses = ['open', 'in_progress', 'resolved', 'closed'];

export function slaStatus(ticket) {
  if (['resolved', 'closed'].includes(ticket.status)) return 'resolved';
  if (!ticket.sla_due_at) return 'within_sla';

  const dueAt = new Date(ticket.sla_due_at).getTime();
  const now = Date.now();
  const hoursUntilDue = (dueAt - now) / (1000 * 60 * 60);

  if (hoursUntilDue < 0) return 'overdue';
  if (hoursUntilDue <= 24) return 'due_soon';
  return 'within_sla';
}

export function countBy(items, key) {
  const counts = new Map();
  for (const item of items) {
    const label = typeof key === 'function' ? key(item) : item[key];
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || String(a.label).localeCompare(String(b.label)));
}

export function healthScore(company) {
  const openHighPriority = Number(company.open_high_priority || 0);
  const overdue = Number(company.overdue_tickets || 0);
  const tierPenalty = company.tier === 'Enterprise' ? 10 : company.tier === 'Pro' ? 5 : 0;
  const renewalPenalty = isRenewalSoon(company.renewal_date) ? 10 : 0;
  return Math.max(0, 100 - openHighPriority * 10 - overdue * 5 - tierPenalty - renewalPenalty);
}

export function healthLabel(score) {
  if (score >= 80) return 'Healthy';
  if (score >= 50) return 'At Risk';
  return 'Critical';
}

export function isRenewalSoon(renewalDate) {
  if (!renewalDate) return false;
  const today = new Date();
  const renewal = new Date(renewalDate);
  const daysUntilRenewal = (renewal - today) / (1000 * 60 * 60 * 24);
  return daysUntilRenewal >= 0 && daysUntilRenewal <= 30;
}

export function recommendedNextAction(company) {
  if (company.health_status === 'Critical' && company.renewal_due_soon) {
    return 'Schedule an executive check-in before renewal and review overdue high-priority work.';
  }
  if (company.health_status === 'Critical') {
    return 'Create a recovery plan focused on open high-priority and overdue tickets.';
  }
  if (company.renewal_due_soon) {
    return 'Review open support risks before the renewal conversation.';
  }
  if (company.open_tickets > 0) {
    return 'Confirm ownership and next steps for open tickets.';
  }
  return 'Maintain regular account monitoring.';
}
