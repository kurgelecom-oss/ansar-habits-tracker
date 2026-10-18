/* Week films in and out of storage. Server only (service role).
   Notion "🎬 Week Films" (ANSAR OS — Control Room): one row per week, Week = that Monday,
   Status Ready → Published / Rejected, the report as one JSON code block. The Friday report
   routine writes it right after it sends the email. */
import { adminClient } from './supabase-admin';
import { importFromNotion } from './story-import';
import { validateWeekReport, type WeekReport } from './week-story';

export const WEEK_FILMS_DS = '5e500b4d-8a63-4637-958d-edfb8c3682db';
const KEY = 'week-report:';

export async function saveWeekReport(r: WeekReport): Promise<void> {
  const { error } = await adminClient().from('ansar_assessment_state').upsert({ id: KEY + r.week, payload: r, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export const importWeekReports = () => importFromNotion(WEEK_FILMS_DS, 'week-film-import-check', async (week, json) => {
  const r = validateWeekReport(json, week);
  if (typeof r === 'string') return r;
  await saveWeekReport(r);
  return null;
});

/** Every stored week, newest first, as { week, label, call } for the picker. */
export async function listWeekReports(): Promise<{ week: string; label: string; call: string }[]> {
  const { data, error } = await adminClient().from('ansar_assessment_state').select('id, payload').like('id', `${KEY}%`).order('id', { ascending: false }).limit(60);
  if (error) throw error;
  return (data ?? []).map(d => ({ week: d.id.slice(KEY.length), label: d.payload.label, call: d.payload.call }));
}

export async function getWeekReport(week: string): Promise<WeekReport | null> {
  const { data, error } = await adminClient().from('ansar_assessment_state').select('payload').eq('id', KEY + week).maybeSingle();
  if (error) throw error;
  return (data?.payload as WeekReport) ?? null;
}
