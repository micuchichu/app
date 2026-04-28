import { supabase } from '../lib/supabase';

export type Job = {
  id: string;
  employer: string;
  title: string;
  type: string;
  payAmount: string;
  negotiable: boolean;
  location: string;
  image: string;
  description: string;
  viewCount: number;
  timestamp: string;
};

type UserPreferences = {
  preferred_locations: string[];
  preferred_types: string[];
  min_pay: number | null;
  max_pay: number | null;
};

type JobEvent = {
  job_id: string;
  event_type: string;
};

function parsePay(payAmount: string | null): number | null {
  if (!payAmount) return null;
  const match = payAmount.replace(/,/g, '').match(/\d+/);
  return match ? Number(match[0]) : null;
}

function freshnessScore(timestamp: string): number {
  const hours = (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60);
  if (hours < 6) return 35;
  if (hours < 24) return 25;
  if (hours < 72) return 15;
  if (hours < 168) return 8;
  return 2;
}

function popularityScore(viewCount: number): number {
  return Math.min(15, Math.log10(viewCount + 1) * 6);
}

function scoreJob(job: Job, prefs: UserPreferences | null, events: JobEvent[]): number {
  let score = 0;

  if (prefs?.preferred_locations?.length && job.location) {
    const match = prefs.preferred_locations.some(
      l => l.toLowerCase() === job.location.toLowerCase()
    );
    if (match) score += 40;
  }

  if (prefs?.preferred_types?.length && job.type) {
    const match = prefs.preferred_types.some(
      t => t.toLowerCase() === job.type.toLowerCase()
    );
    if (match) score += 30;
  }

  const pay = parsePay(job.payAmount);
  if (pay !== null && prefs?.min_pay != null && prefs?.max_pay != null) {
    if (pay >= prefs.min_pay && pay <= prefs.max_pay) score += 20;
  }

  if (job.negotiable) score += 15;

  if (job.timestamp) score += freshnessScore(job.timestamp);
  score += popularityScore(job.viewCount ?? 0);

  const hidden = events.some(e => e.job_id === job.id && e.event_type === 'hide');
  const saved = events.some(e => e.job_id === job.id && e.event_type === 'save');
  const applied = events.some(e => e.job_id === job.id && e.event_type === 'apply');
  const bid = events.some(e => e.job_id === job.id && e.event_type === 'bid');

  if (hidden) score -= 80;
  if (saved) score += 25;
  if (applied || bid) score -= 100;

  return score;
}

export async function getRankedJobs(userId: string, feedMode: 'hiring' | 'toHire'): Promise<Job[]> {
  const [{ data: jobs, error: jobsError }, { data: prefs }, { data: events }] = await Promise.all([
    supabase.from('jobs').select('*').order('timestamp', { ascending: false }).limit(200),
    supabase.from('user_preferences').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('job_events').select('job_id, event_type').eq('user_id', userId),
  ]);

  if (jobsError) throw jobsError;

  let filtered = (jobs ?? []).filter((job: Job) =>
    feedMode === 'hiring' ? job.type !== 'Service Request' : job.type === 'Service Request'
  );

  return filtered
    .map((job: Job) => ({ ...job, _score: scoreJob(job, prefs as UserPreferences | null, events ?? []) }))
    .sort((a: any, b: any) => b._score - a._score);
}

export async function trackEvent(
  userId: string,
  jobId: string,
  eventType: 'view' | 'save' | 'hide' | 'apply' | 'bid'
) {
  await supabase.from('job_events').insert({ user_id: userId, job_id: jobId, event_type: eventType });
}