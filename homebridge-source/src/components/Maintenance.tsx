import { useEffect, useState } from 'react';
import { useStore } from '../store';
import type { Evidence, Issue, IssueCategory, IssueStatus } from '../types';
import { ROOMS, canSeeRoom, roomById, roomName } from '../lib/residence';
import { uid } from '../lib/defaults';
import { Button, Card, CardTitle, Notice, PageHeader, Pill, SelectField, SourceBadge, TextArea, TextField, cx, fmtDate, type Tone } from './ui';
import { ArrowLeft, Camera, Check, FileClock, Paperclip, Plus, Wrench } from '../icons';

export const STATUS_LABEL: Record<IssueStatus, string> = { submitted: 'Submitted', acknowledged: 'Acknowledged', scheduled: 'Scheduled', in_progress: 'In progress', resolved: 'Resolved' };
const STATUS_TONE: Record<IssueStatus, Tone> = { submitted: 'info', acknowledged: 'info', scheduled: 'primary', in_progress: 'warn', resolved: 'ok' };
const CAT_LABEL: Record<IssueCategory, string> = { plumbing: 'Plumbing', electrical: 'Electrical', heating_cooling: 'Heating or cooling', moisture: 'Moisture or mold', pests: 'Pests', appliance: 'Appliance', safety: 'Safety', furniture: 'Furniture, doors or windows', other: 'Other' };
const SEV_TONE = { low: 'muted', medium: 'info', high: 'warn', urgent: 'danger' } as const;

function resize(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(new Error('read'));
    fr.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('decode'));
      img.onload = () => {
        const k = Math.min(1, 900 / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.72));
      };
      img.src = fr.result as string;
    };
    fr.readAsDataURL(file);
  });
}

export function MaintenancePage() {
  const { state, target, clearTarget } = useStore();
  const [mode, setMode] = useState<{ k: 'list' } | { k: 'new'; room?: string } | { k: 'detail'; id: string }>({ k: 'list' });
  const [filter, setFilter] = useState<'open' | 'resident' | 'sensor' | 'resolved' | 'all'>('open');

  useEffect(() => {
    if (!target) return;
    if (target.startsWith('new')) setMode({ k: 'new', room: target.split(':')[1] });
    else if (target.startsWith('issue:')) setMode({ k: 'detail', id: target.slice(6) });
    clearTarget();
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { document.getElementById(mode.k === 'list' ? 'page-title' : 'sub-title')?.focus(); }, [mode.k]);

  if (mode.k === 'new') return <NewReport room={mode.room} onDone={(id) => setMode(id ? { k: 'detail', id } : { k: 'list' })} />;
  if (mode.k === 'detail') {
    const issue = state.issues.find((i) => i.id === mode.id);
    if (issue) return <Detail issue={issue} onBack={() => setMode({ k: 'list' })} />;
  }

  const match = (i: Issue) =>
    filter === 'all' ? true : filter === 'open' ? i.status !== 'resolved' : filter === 'resolved' ? i.status === 'resolved' : i.source === filter;
  const list = state.issues.filter(match).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const count = (f: typeof filter) => state.issues.filter((i) => (f === 'all' ? true : f === 'open' ? i.status !== 'resolved' : f === 'resolved' ? i.status === 'resolved' : i.source === f)).length;

  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader eyebrow="Maintenance & housing conditions" title="Repairs" intro={state.role === 'staff' ? 'Every report for the house, with its source and full history. Update status as work moves along.' : 'Report a problem, add notes or photos, and follow every step. Sensor alerts and your own reports are always labeled separately.'}>
        <Button variant="primary" onClick={() => setMode({ k: 'new' })}><Plus size={18} /> New report</Button>
      </PageHeader>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Filter reports">
        {(['open', 'resident', 'sensor', 'resolved', 'all'] as const).map((f) => (
          <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className={cx('min-h-[40px] shrink-0 whitespace-nowrap rounded-full border px-4 text-sm font-semibold', filter === f ? 'border-primary bg-primary text-primary-ink' : 'border-line bg-surface text-ink hover:bg-surface-2')}>
            {f === 'open' ? 'Open' : f === 'resident' ? 'Resident reports' : f === 'sensor' ? 'Sensor alerts' : f === 'resolved' ? 'Resolved' : 'All'} ({count(f)})
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <Card><p className="text-ink">Nothing here right now.</p></Card>
      ) : (
        <ul className="grid grid-cols-1 gap-3">
          {list.map((i) => (
            <li key={i.id}>
              <button type="button" onClick={() => setMode({ k: 'detail', id: i.id })} className="grid w-full gap-2 rounded-card border border-line bg-surface p-4 text-left shadow-card transition hover:border-primary">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block text-xs font-bold uppercase tracking-wider text-muted">{CAT_LABEL[i.category]} · {roomById(i.roomId).name}</span>
                    <span className="block font-display text-lg font-semibold text-ink">{i.title}</span>
                  </span>
                  <span className="flex flex-wrap gap-2">
                    <SourceBadge source={i.source === 'sensor' ? 'simulated' : 'resident'} />
                    <Pill tone={STATUS_TONE[i.status]}>{STATUS_LABEL[i.status]}</Pill>
                  </span>
                </div>
                <span className="text-sm text-muted">{i.source === 'sensor' ? 'Sensor alert' : 'Resident report'} · opened {fmtDate(i.createdAt)} · {i.history.length} updates{i.evidence.length ? ` · ${i.evidence.length} attachment${i.evidence.length > 1 ? 's' : ''}` : ''}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="rounded-xl bg-surface-2 p-3 text-sm text-muted">HomeBridge keeps records. It doesn’t replace professional inspections or emergency services. For fire, gas smells or a carbon monoxide alarm, leave and call 911.</p>
    </div>
  );
}

function NewReport({ room, onDone }: { room?: string; onDone: (id?: string) => void }) {
  const { state, update, toast } = useStore();
  const rooms = ROOMS.filter((r) => canSeeRoom(r, state.role));
  const [d, setD] = useState({ roomId: room && rooms.some((r) => r.id === room) ? room : rooms[0].id, category: 'plumbing' as IssueCategory, title: '', description: '', severity: 'medium' as Issue['severity'] });
  const [photo, setPhoto] = useState<string | undefined>();
  const [errors, setErrors] = useState<{ title?: string; photo?: string }>({});

  const save = () => {
    if (!d.title.trim()) { setErrors({ title: 'Add a short title, like “Shower drain is slow”.' }); document.getElementById('f-title')?.focus(); return; }
    const now = new Date().toISOString();
    const by = state.role === 'staff' ? 'staff' : 'resident';
    const ev: Evidence[] = photo ? [{ id: uid('ev'), kind: 'photo', dataUrl: photo, at: now }] : [];
    const issue: Issue = { id: uid('iss'), source: 'resident', ...d, title: d.title.trim(), status: 'submitted', evidence: ev, history: [{ id: uid('h'), at: now, by, text: by === 'staff' ? 'Logged by staff' : 'Reported by resident', status: 'submitted' }], createdAt: now, updatedAt: now };
    update((s) => ({ ...s, issues: [issue, ...s.issues] }));
    toast('Report submitted.');
    onDone(issue.id);
  };

  return (
    <div className="grid max-w-2xl grid-cols-1 gap-5">
      <div>
        <Button size="sm" variant="ghost" onClick={() => onDone()}><ArrowLeft size={16} /> All reports</Button>
        <h1 id="sub-title" tabIndex={-1} className="mt-2 font-display text-3xl font-bold text-ink outline-none">New report</h1>
        <p className="text-muted">This is logged as a <strong>resident report</strong>, separate from sensor alerts.</p>
      </div>
      <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
        <Card className="grid gap-4">
          <SelectField id="f-room" label="Where is it?" value={d.roomId} onChange={(e) => setD({ ...d, roomId: e.target.value })} options={rooms.map((r) => ({ value: r.id, label: roomName(r) }))} />
          <SelectField id="f-cat" label="Type of problem" value={d.category} onChange={(e) => setD({ ...d, category: e.target.value as IssueCategory })} options={(Object.keys(CAT_LABEL) as IssueCategory[]).map((c) => ({ value: c, label: CAT_LABEL[c] }))} />
          <TextField id="f-title" label="Short title" value={d.title} maxLength={80} error={errors.title} onChange={(e) => setD({ ...d, title: e.target.value })} />
          <TextArea id="f-desc" label="What’s happening?" hint="What you see, hear or smell, and since when." value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} />
          <SelectField id="f-sev" label="How urgent is it?" value={d.severity} onChange={(e) => setD({ ...d, severity: e.target.value as Issue['severity'] })} options={[{ value: 'low', label: 'Low · when someone has time' }, { value: 'medium', label: 'Medium · this week' }, { value: 'high', label: 'High · affects daily life' }, { value: 'urgent', label: 'Urgent · safety risk' }]} />
          {d.severity === 'urgent' && <Notice tone="danger" title="Safety first">If there’s fire, sparking, a gas smell or a CO alarm, leave and call 911. Tell staff right away, then log it here.</Notice>}
          <div>
            <p className="mb-1 text-sm font-semibold">Photo (optional)</p>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-4 font-semibold focus-within:ring-2 focus-within:ring-focus hover:bg-surface-2">
                <Camera size={18} /> {photo ? 'Replace photo' : 'Add photo'}
                <input type="file" accept="image/*" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { setPhoto(await resize(f)); setErrors({}); } catch { setErrors({ photo: 'That image couldn’t be read. Try another.' }); } }} />
              </label>
              {photo && <img src={photo} alt="Attached photo" className="h-20 w-28 rounded-lg border border-line object-cover" />}
            </div>
            {errors.photo && <p className="mt-1 text-sm font-semibold text-danger">{errors.photo}</p>}
          </div>
        </Card>
        <div className="flex gap-3"><Button type="submit" variant="primary"><Check size={18} /> Submit report</Button><Button onClick={() => onDone()}>Cancel</Button></div>
      </form>
    </div>
  );
}

function Detail({ issue, onBack }: { issue: Issue; onBack: () => void }) {
  const { state, update, toast } = useStore();
  const staff = state.role === 'staff';
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<IssueStatus>(issue.status);
  const [statusNote, setStatusNote] = useState('');

  const patch = (fn: (i: Issue) => Issue, msg: string) => {
    update((s) => ({ ...s, issues: s.issues.map((i) => (i.id === issue.id ? { ...fn(i), updatedAt: new Date().toISOString() } : i)) }));
    toast(msg);
  };
  const addNote = () => {
    if (!note.trim()) return;
    const now = new Date().toISOString();
    patch((i) => ({ ...i, evidence: [...i.evidence, { id: uid('ev'), kind: 'note', text: note.trim(), at: now }], history: [...i.history, { id: uid('h'), at: now, by: staff ? 'staff' : 'resident', text: `Added a note: “${note.trim()}”` }] }), 'Note added.');
    setNote('');
  };
  const addPhoto = async (f?: File) => {
    if (!f) return;
    try {
      const url = await resize(f);
      const now = new Date().toISOString();
      patch((i) => ({ ...i, evidence: [...i.evidence, { id: uid('ev'), kind: 'photo', dataUrl: url, at: now }], history: [...i.history, { id: uid('h'), at: now, by: staff ? 'staff' : 'resident', text: 'Added a photo' }] }), 'Photo added.');
    } catch { toast('That image couldn’t be read.', 'warn'); }
  };
  const changeStatus = () => {
    if (status === issue.status && !statusNote.trim()) return;
    const now = new Date().toISOString();
    patch((i) => ({ ...i, status, history: [...i.history, { id: uid('h'), at: now, by: 'staff', status, text: `${STATUS_LABEL[status]}${statusNote.trim() ? `: ${statusNote.trim()}` : ''}` }] }), 'Status updated.');
    setStatusNote('');
  };
  const residentResponse = (fixed: boolean) => {
    const now = new Date().toISOString();
    patch((i) => ({ ...i, status: fixed ? i.status : 'submitted', history: [...i.history, { id: uid('h'), at: now, by: 'resident', status: fixed ? undefined : 'submitted', text: fixed ? 'Resident confirmed it’s fixed' : 'Resident says it’s still a problem; reopened' }] }), fixed ? 'Thanks for confirming.' : 'Report reopened.');
  };
  const history = [...issue.history].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div className="grid grid-cols-1 gap-5">
      <div>
        <Button size="sm" variant="ghost" onClick={onBack}><ArrowLeft size={16} /> All reports</Button>
        <p className="mt-2 text-xs font-bold uppercase tracking-wider text-muted">{CAT_LABEL[issue.category]} · {roomById(issue.roomId).name}</p>
        <h1 id="sub-title" tabIndex={-1} className="font-display text-3xl font-bold leading-tight text-ink outline-none">{issue.title}</h1>
        <div className="mt-2 flex flex-wrap gap-2">
          <SourceBadge source={issue.source === 'sensor' ? 'simulated' : 'resident'} />
          <Pill tone={STATUS_TONE[issue.status]}>{STATUS_LABEL[issue.status]}</Pill>
          <Pill tone={SEV_TONE[issue.severity]} icon={<span />}>{issue.severity[0].toUpperCase() + issue.severity.slice(1)} priority</Pill>
        </div>
      </div>
      {issue.source === 'sensor' && <Notice>This report came from a <strong>simulated sensor alert</strong>, not a diagnosis. A person should check the area.</Notice>}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="grid content-start gap-5">
          <Card>
            <CardTitle icon={<Wrench size={20} />}>Details</CardTitle>
            <p className="whitespace-pre-wrap text-ink">{issue.description || 'No description.'}</p>
            {issue.evidence.length > 0 && (
              <>
                <h3 className="mt-4 flex items-center gap-2 font-semibold"><Paperclip size={16} /> Notes & evidence</h3>
                <ul className="mt-2 grid gap-2">
                  {issue.evidence.map((e) => (
                    <li key={e.id} className="rounded-xl bg-surface-2 p-3 text-sm">
                      {e.kind === 'photo' ? <img src={e.dataUrl} alt="Attached evidence" className="max-h-56 rounded-lg" /> : <p>{e.text}</p>}
                      <p className="mt-1 text-xs text-muted">{fmtDate(e.at, true)}</p>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>
          <Card>
            <CardTitle icon={<FileClock size={20} />}>Timeline</CardTitle>
            <ol className="relative grid gap-4 border-l-2 border-line pl-5">
              {history.map((h) => (
                <li key={h.id} className="relative">
                  <span className={cx('absolute -left-[27px] top-1 h-3.5 w-3.5 rounded-full border-2 border-surface', h.by === 'system' ? 'bg-info' : h.by === 'staff' ? 'bg-primary' : 'bg-secondary')} aria-hidden="true" />
                  <p className="text-xs text-muted">{fmtDate(h.at, true)} · {h.by === 'system' ? 'HomeBridge' : h.by === 'staff' ? 'Staff' : 'Resident'}</p>
                  <p className="text-ink">{h.text}</p>
                </li>
              ))}
            </ol>
          </Card>
        </div>
        <div className="grid content-start gap-5">
          {staff ? (
            <Card>
              <CardTitle>Update status</CardTitle>
              <div className="grid gap-3">
                <SelectField label="Status" value={status} onChange={(e) => setStatus(e.target.value as IssueStatus)} options={(Object.keys(STATUS_LABEL) as IssueStatus[]).map((s) => ({ value: s, label: STATUS_LABEL[s] }))} />
                <TextField label="Note for the resident (optional)" value={statusNote} onChange={(e) => setStatusNote(e.target.value)} />
                <Button variant="primary" onClick={changeStatus}>Save status</Button>
              </div>
            </Card>
          ) : (
            <Card>
              <CardTitle>Status</CardTitle>
              <p className="text-sm text-muted">Staff update the status. You’ll see each change in the timeline.</p>
              {issue.status === 'resolved' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="primary" onClick={() => residentResponse(true)}><Check size={16} /> Confirm it’s fixed</Button>
                  <Button size="sm" onClick={() => residentResponse(false)}>Still a problem</Button>
                </div>
              )}
              <p className="mt-3 text-xs text-muted">Switch to the staff view in the header to try updating it.</p>
            </Card>
          )}
          <Card>
            <CardTitle>Add a note or photo</CardTitle>
            <div className="grid gap-3">
              <TextArea label="Note" value={note} onChange={(e) => setNote(e.target.value)} />
              <div className="flex flex-wrap gap-2">
                <Button onClick={addNote}>Add note</Button>
                <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-4 font-semibold focus-within:ring-2 focus-within:ring-focus hover:bg-surface-2">
                  <Camera size={18} /> Add photo
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => addPhoto(e.target.files?.[0])} />
                </label>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
