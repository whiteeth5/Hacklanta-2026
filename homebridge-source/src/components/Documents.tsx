import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import type { DocExplanation } from '../types';
import { SAMPLE_DOCS, claudePrompt, explainBuiltin, fromClaude } from '../lib/documents';
import { uid } from '../lib/defaults';
import { Button, Card, CardTitle, Notice, PageHeader, cx, fmtDate } from './ui';
import { CalendarPlus, Camera, Check, CircleAlert, FileSearch, FileText, Lock, ScanText, Trash, Upload, X } from '../icons';

type SampleFn = ((input: string, opts?: Record<string, unknown>) => Promise<{ text: string }>) & {
  json: (input: string, opts?: Record<string, unknown>) => Promise<unknown>;
  limits: () => Promise<{ images?: { maxCount: number; mediaTypes: string[] } }>;
};
declare global {
  interface Window { claude?: { use: (name: string) => Promise<unknown> } }
}

const ERR_COPY: Record<string, string> = {
  not_granted: 'You chose not to let this page use Claude, so HomeBridge used its built-in reader instead.',
  sampling_disabled: 'Claude isn’t available on this account, so HomeBridge used its built-in reader.',
  rate_limited: 'Claude is busy or you’ve reached a usage limit. Try again in a little while.',
  refused: 'Claude couldn’t help with this document. Try a different part of it, or ask staff.',
  prompt_too_large: 'That document is too long. Paste just the first page or the part with dates.',
  image_rejected: 'That photo couldn’t be read. Try a clearer, smaller photo.',
  invalid_json: 'The answer came back in an unexpected format. Try again.',
};

export function DocumentsPage() {
  const { state, update, toast } = useStore();
  const [name, setName] = useState('My document');
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [result, setResult] = useState<DocExplanation | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [sample, setSample] = useState<SampleFn | null>(null);
  const [canImages, setCanImages] = useState(false);
  const ctl = useRef<AbortController | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const s = (await window.claude?.use('sample')) as SampleFn | null | undefined;
        if (!live || !s) return;
        setSample(() => s);
        const lim = await s.limits().catch(() => null);
        if (live) setCanImages(!!lim?.images);
      } catch { /* not available: built-in reader */ }
    })();
    return () => { live = false; ctl.current?.abort(); };
  }, []);

  const loadSample = (id: string) => {
    const d = SAMPLE_DOCS.find((x) => x.id === id)!;
    setName(d.name); setText(d.text); setPhoto(null); setResult(null); setError(''); setNote('');
  };
  const onFile = async (f?: File) => {
    if (!f) return;
    setError('');
    if (f.type.startsWith('image/')) {
      if (!canImages) { setError('Reading photos needs the claude.ai version of HomeBridge. Here, paste the text instead.'); return; }
      setPhoto(f); setName(f.name.replace(/\.[^.]+$/, '')); setText(''); return;
    }
    if (f.type === 'text/plain' || /\.(txt|md|csv)$/i.test(f.name)) {
      const t = await f.text(); setText(t.slice(0, 20000)); setName(f.name.replace(/\.[^.]+$/, '')); setPhoto(null); return;
    }
    setError('That file type can’t be read here. Copy the text from the document (for a PDF, select all and copy) and paste it below, or upload a .txt file.');
  };

  const explain = async () => {
    if (!text.trim() && !photo) { setError('Paste the document’s text, upload a file, or pick a sample first.'); return; }
    setError(''); setNote(''); setResult(null);
    const id = uid('doc');
    if (sample) {
      setBusy(true);
      ctl.current = new AbortController();
      try {
        const prompt = photo ? claudePrompt('(The document is in the attached photo. Read it from the image.)') : claudePrompt(text);
        const raw = await sample.json(prompt, { signal: ctl.current.signal, ...(photo ? { images: photo } : {}) });
        setResult(fromClaude(name, id, raw));
      } catch (e) {
        const code = (e as { code?: string })?.code ?? 'upstream_error';
        if (code === 'cancelled') { setBusy(false); return; }
        if (photo) { setError(ERR_COPY[code] ?? 'Something went wrong reading the photo. Try again, or paste the text.'); }
        else {
          setResult(explainBuiltin(name, text, id));
          setNote(ERR_COPY[code] ?? 'Claude couldn’t be reached, so HomeBridge used its built-in reader.');
          if (code === 'not_granted' || code === 'sampling_disabled') setSample(null);
        }
      } finally { setBusy(false); }
    } else {
      setResult(explainBuiltin(name, text, id));
    }
  };

  const addDate = (date: string, what: string) => {
    update((s) => ({ ...s, calendar: [...s.calendar, { id: uid('cal'), title: what.length > 60 ? `${result?.docType ?? 'Document'} date` : what, date, time: '', kind: /court|hearing/i.test(result?.docType ?? '') ? 'court' : 'deadline', notes: `From “${name}”: ${what}`, source: 'document', remind: true }] }));
    toast('Added to your calendar.');
  };
  const onCal = (date: string) => state.calendar.some((c) => c.source === 'document' && c.date === date);
  const saved = result && state.docs.some((d) => d.id === result.id);

  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader eyebrow="Document Helper" title="What is this paper?" intro="Paste or upload a letter, lease, notice or form. HomeBridge explains what it is, what it’s for, the dates that matter and what to do next." />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardTitle icon={<FileText size={20} />}>Your document</CardTitle>
          <div className="mb-3">
            <p className="mb-2 text-sm font-semibold">Try a sample</p>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_DOCS.map((d) => (
                <button key={d.id} type="button" onClick={() => loadSample(d.id)} className="min-h-[40px] rounded-full border border-line bg-surface px-3 text-sm font-semibold hover:bg-surface-2">{d.name.replace(' (sample)', '')}</button>
              ))}
            </div>
          </div>
          <div className="grid gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="doc-name" className="text-sm font-semibold">Name it (optional)</label>
              <input id="doc-name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} className="min-h-[44px] rounded-xl border border-line bg-surface px-3 outline-none focus:ring-2 focus:ring-focus" />
            </div>
            {photo ? (
              <div className="flex items-center justify-between gap-2 rounded-xl bg-surface-2 p-3 text-sm">
                <span className="flex items-center gap-2"><Camera size={16} /> {photo.name}</span>
                <Button size="sm" variant="ghost" aria-label="Remove photo" onClick={() => setPhoto(null)}><X size={16} /></Button>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <label htmlFor="doc-text" className="text-sm font-semibold">Paste the text</label>
                <textarea id="doc-text" value={text} onChange={(e) => setText(e.target.value)} rows={10} placeholder="Copy the words from the document and paste them here." className="rounded-xl border border-line bg-surface px-3 py-2 font-body text-sm outline-none focus:ring-2 focus:ring-focus" />
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-4 font-semibold focus-within:ring-2 focus-within:ring-focus hover:bg-surface-2">
                <Upload size={18} /> Upload {canImages ? 'a photo or .txt' : 'a .txt file'}
                <input type="file" accept={canImages ? 'image/*,.txt,text/plain' : '.txt,text/plain'} className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
              </label>
              <Button variant="primary" onClick={explain} disabled={busy}><ScanText size={18} /> {busy ? 'Reading…' : 'Explain this document'}</Button>
              {busy && <Button variant="ghost" onClick={() => ctl.current?.abort()}>Stop</Button>}
            </div>
            {error && <p role="alert" className="flex gap-1.5 text-sm font-semibold text-danger"><CircleAlert size={16} className="mt-0.5 shrink-0" />{error}</p>}
            <p className="flex gap-1.5 text-xs text-muted">
              <Lock size={14} className="mt-0.5 shrink-0" />
              {sample
                ? 'When you press Explain, the text or photo is sent to Claude using your own Claude account. HomeBridge doesn’t keep the document itself; you can save the explanation.'
                : 'Your document is read on this device with HomeBridge’s built-in reader. Nothing is sent anywhere.'}
            </p>
          </div>
        </Card>

        <Card aria-live="polite">
          <CardTitle icon={<FileSearch size={20} />} action={result ? <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-muted">{result.engine === 'claude' ? 'Explained by Claude' : 'Built-in reader'}</span> : undefined}>Explanation</CardTitle>
          {busy && <p className="text-muted">Reading your document… this can take up to a minute.</p>}
          {!busy && !result && <p className="text-muted">Pick a sample or paste a document, then press “Explain this document”.</p>}
          {note && <Notice tone="warn">{note}</Notice>}
          {result && !busy && (
            <div className="fade-in grid gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-primary">{result.docType}</p>
                <p className="mt-1 text-ink">{result.summary}</p>
              </div>
              <div className="rounded-xl bg-surface-2 p-3"><p className="font-semibold">What it’s for</p><p className="text-sm">{result.purpose}</p></div>
              {result.keyDates.length > 0 && (
                <div>
                  <p className="font-semibold">Dates that matter</p>
                  <ul className="mt-1 grid gap-2">
                    {result.keyDates.map((d) => (
                      <li key={d.date} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line p-2.5 text-sm">
                        <span className="min-w-0"><strong className="tabular-nums">{fmtDate(d.date)}</strong><span className="block text-muted">{d.what}</span></span>
                        <Button size="sm" variant={onCal(d.date) ? 'secondary' : 'primary'} disabled={onCal(d.date)} onClick={() => addDate(d.date, d.what)}>{onCal(d.date) ? <Check size={16} /> : <CalendarPlus size={16} />}{onCal(d.date) ? 'Added' : 'Add to calendar'}</Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.actions.length > 0 && <div><p className="font-semibold">What to do next</p><ul className="mt-1 list-disc space-y-1 pl-5 text-sm">{result.actions.map((a) => <li key={a}>{a}</li>)}</ul></div>}
              {result.questions.length > 0 && <div><p className="font-semibold">Questions worth asking</p><ul className="mt-1 list-disc space-y-1 pl-5 text-sm">{result.questions.map((a) => <li key={a}>{a}</li>)}</ul></div>}
              {result.caution && <Notice tone="warn">{result.caution}</Notice>}
              <p className="text-xs text-muted">This is a plain-language guide, not legal advice. For anything about court, money owed or your housing, check with staff, a caseworker or legal aid.</p>
              <div><Button size="sm" disabled={!!saved} onClick={() => { update((s) => ({ ...s, docs: [result, ...s.docs].slice(0, 20) })); toast('Explanation saved.'); }}>{saved ? <Check size={16} /> : null}{saved ? 'Saved' : 'Save explanation'}</Button></div>
            </div>
          )}
        </Card>
      </div>

      {state.docs.length > 0 && (
        <Card>
          <CardTitle icon={<FileText size={20} />}>Saved explanations</CardTitle>
          <ul className="grid gap-2">
            {state.docs.map((d) => (
              <li key={d.id} className={cx('flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2')}>
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => { setResult(d); setNote(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                  <span className="block font-semibold">{d.name}</span>
                  <span className="text-xs text-muted">{d.docType} · {fmtDate(d.at, true)}</span>
                </button>
                <Button size="sm" variant="ghost" aria-label={`Delete ${d.name}`} onClick={() => update((s) => ({ ...s, docs: s.docs.filter((x) => x.id !== d.id) }))}><Trash size={16} /></Button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
