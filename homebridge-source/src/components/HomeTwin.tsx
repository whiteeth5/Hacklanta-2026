import type { KeyboardEvent, ReactNode } from 'react';
import { useStore } from '../store';
import type { Role, Room, SensorKind } from '../types';
import { ROOMS, SENSOR_LABEL, canSeeRoom, readings, roomLevel, roomName, type Reading } from '../lib/residence';
import { Bath, BedDouble, Briefcase, CookingPot, Droplet, Droplets, Lock, Shirt, Sofa, Thermometer, Wind, WifiOff, Wrench } from '../icons';
import { Button, SourceBadge, fmtDate } from './ui';

const S = 10; // floor-plan unit → svg px

const ROOM_ICON: Record<Room['icon'], (p: { size?: number; x?: number; y?: number; className?: string }) => ReactNode> = {
  bed: BedDouble, bath: Bath, laundry: Shirt, sofa: Sofa, kitchen: CookingPot, office: Briefcase, door: Lock,
};
const SENSOR_ICON: Record<SensorKind, (p: { size?: number; x?: number; y?: number }) => ReactNode> = { temperature: Thermometer, humidity: Droplets, air: Wind, leak: Droplet };

const levelColor = (l: Reading['level']) => (l === 'alert' ? 'var(--danger)' : l === 'watch' ? 'var(--warn)' : l === 'offline' ? 'var(--muted)' : 'var(--ok)');
const levelWord = (l: Reading['level']) => (l === 'alert' ? 'Alert' : l === 'watch' ? 'Watch' : l === 'offline' ? 'Offline' : 'Normal');

export function HomeTwin({ selected, onSelect, highlight, compact = false }: { selected?: string | null; onSelect?: (id: string) => void; highlight?: string | null; compact?: boolean }) {
  void compact;
  const { state } = useStore();
  const role = state.role;
  const rs = readings(state.events);

  const key = (e: KeyboardEvent, id: string) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect?.(id); }
  };

  return (
    <div className="w-full">
      <svg viewBox="-16 -16 1032 672" className="block h-auto w-full" role="group" aria-label={`Floor plan of ${state.profile.residence}. Select a room to see its readings.`}>
        <defs>
          <pattern id="hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="10" stroke="var(--line)" strokeWidth="4" />
          </pattern>
        </defs>
        <rect x={-6} y={-6} width={1012} height={652} rx={18} fill="var(--surface-2)" stroke="var(--ink)" strokeOpacity={0.55} strokeWidth={6} />
        {ROOMS.map((room) => {
          const visible = canSeeRoom(room, role);
          const lvl = visible ? roomLevel(room.id, rs) : 'normal';
          const isSel = selected === room.id;
          const isHi = highlight === room.id;
          const x = room.x * S, y = room.y * S, w = room.w * S, h = room.h * S;
          const Icon = ROOM_ICON[room.icon];
          const fill = room.scope === 'mine' ? 'var(--primary-soft)' : room.scope === 'private' ? 'url(#hatch)' : room.scope === 'staff' ? 'var(--surface-2)' : 'var(--surface)';
          const label = `${roomName(room)}${room.scope === 'mine' ? ' (yours)' : ''}. ${visible ? `Status ${levelWord(lvl)}.` : 'Private. No readings shown.'}`;
          const roomSensors = rs.filter((r) => r.roomId === room.id);
          return (
            <g
              key={room.id}
              role="button"
              tabIndex={0}
              aria-label={label}
              aria-pressed={isSel}
              onClick={() => onSelect?.(room.id)}
              onKeyDown={(e) => key(e, room.id)}
              className="cursor-pointer outline-none [&:focus-visible>rect.outline]:stroke-[var(--focus)]"
            >
              <rect x={x + 6} y={y + 6} width={w - 12} height={h - 12} rx={12} fill={fill} stroke={isSel ? 'var(--primary)' : 'var(--line)'} strokeWidth={isSel ? 5 : 2} className="outline transition-[stroke] duration-200" />
              {room.scope === 'private' && <rect x={x + 6} y={y + 6} width={w - 12} height={h - 12} rx={12} fill="var(--surface)" opacity={0.55} pointerEvents="none" />}
              {visible && lvl !== 'normal' && (
                <rect x={x + 6} y={y + 6} width={w - 12} height={h - 12} rx={12} fill={levelColor(lvl)} fillOpacity={lvl === 'alert' ? 0.16 : 0.1} stroke={levelColor(lvl)} strokeWidth={4} pointerEvents="none" />
              )}
              {isHi && <rect x={x + 2} y={y + 2} width={w - 4} height={h - 4} rx={14} fill="none" stroke="var(--danger)" strokeWidth={3} strokeDasharray="10 8" pointerEvents="none" />}
              <g color={room.scope === 'mine' ? 'var(--primary)' : 'var(--muted)'} pointerEvents="none">
                <Icon size={34} x={x + 22} y={y + 22} />
              </g>
              {room.name.split(' / ').map((line, li) => (
                <text key={line} x={x + 24} y={y + 92 + li * 36} fontSize={32} fontWeight={700} fill="var(--ink)" pointerEvents="none" fontFamily="Sora, system-ui, sans-serif">{line}</text>
              ))}
              {room.scope === 'private' && (
                <text x={x + 24} y={y + 92 + room.name.split(' / ').length * 36} fontSize={26} fill="var(--muted)" pointerEvents="none">Private</text>
              )}
              {room.scope === 'staff' && role === 'resident' && (
                <text x={x + 24} y={y + 92 + room.name.split(' / ').length * 36} fontSize={26} fill="var(--muted)" pointerEvents="none">Staff only</text>
              )}
              {room.scope === 'mine' && role === 'staff' && (
                <text x={x + 24} y={y + 92 + room.name.split(' / ').length * 36} fontSize={26} fill="var(--muted)" pointerEvents="none">Resident room</text>
              )}
              {visible && (
                <g pointerEvents="none">
                  {roomSensors.map((r, i) => {
                    const SI = SENSOR_ICON[r.kind];
                    const cx0 = x + 22 + i * 58, cy0 = y + h - 60;
                    return (
                      <g key={r.kind} color={levelColor(r.level)}>
                        <circle cx={cx0 + 20} cy={cy0 + 20} r={24} fill="var(--surface)" stroke={levelColor(r.level)} strokeWidth={3} />
                        <SI size={26} x={cx0 + 7} y={cy0 + 7} />
                      </g>
                    );
                  })}
                </g>
              )}
              {visible && lvl === 'alert' && (
                <g pointerEvents="none">
                  <circle cx={x + w - 36} cy={y + 36} r={12} fill="var(--danger)" />
                  <circle cx={x + w - 36} cy={y + 36} r={12} fill="none" stroke="var(--danger)" strokeWidth={3} className="pulse" />
                </g>
              )}
            </g>
          );
        })}
      </svg>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-label="Legend">
        <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-primary-soft ring-1 ring-primary" />Your room</li>
        <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-surface ring-1 ring-line" />Shared</li>
        <li className="flex items-center gap-1.5"><Lock size={12} />Private: never shown</li>
        <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full ring-2 ring-[var(--ok)]" />Normal</li>
        <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full ring-2 ring-[var(--warn)]" />Watch</li>
        <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-danger" />Alert</li>
      </ul>
    </div>
  );
}

export function RoomPanel({ roomId, role }: { roomId: string; role: Role }) {
  const { state, go } = useStore();
  const room = ROOMS.find((r) => r.id === roomId)!;
  const visible = canSeeRoom(room, role);
  const rs = readings(state.events).filter((r) => r.roomId === roomId);
  const issues = state.issues.filter((i) => i.roomId === roomId && i.status !== 'resolved');
  const run = state.runs.find((r) => !r.resolved && r.roomId === roomId);

  return (
    <div className="fade-in grid gap-3" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg font-semibold text-ink">{roomName(room)}</h3>
        {visible ? <SourceBadge source={room.scope === 'mine' ? 'private' : 'building'} /> : <SourceBadge source="private" />}
      </div>
      {!visible ? (
        <p className="text-sm text-muted">
          {room.scope === 'private'
            ? 'This is another resident’s room. HomeBridge never shows readings or details from other residents’ rooms.'
            : room.scope === 'staff'
              ? 'Staff-only area. Readings here are visible in the staff view.'
              : 'This is a resident’s private room. Staff can’t see its readings unless the resident shares an alert.'}
        </p>
      ) : (
        <>
          {run && (
            <button type="button" onClick={() => go('engine', run.id)} className="rounded-xl border border-danger bg-danger-soft px-3 py-2 text-left text-sm font-semibold text-danger">
              Active alert in this room. Open the Impact Engine →
            </button>
          )}
          <ul className="grid gap-2">
            {rs.map((r) => {
              const meta = SENSOR_LABEL[r.kind];
              const SI = SENSOR_ICON[r.kind];
              return (
                <li key={r.kind} className="rounded-xl bg-surface-2 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                      <span style={{ color: levelColor(r.level) }}>{r.level === 'offline' ? <WifiOff size={18} /> : <SI size={18} />}</span>
                      {meta.name}
                    </span>
                    <span className="text-xs font-bold uppercase" style={{ color: levelColor(r.level) }}>{levelWord(r.level)}</span>
                  </div>
                  <p className="mt-1 font-display text-xl font-bold tabular-nums text-ink">
                    {r.value}
                    {typeof r.value === 'number' && <span className="ml-1 text-sm font-normal text-muted">{r.unit}</span>}
                  </p>
                  <p className="text-xs text-muted">{meta.detects} {meta.notDetect}</p>
                </li>
              );
            })}
          </ul>
          <p className="flex flex-wrap items-center gap-2 text-xs text-muted"><SourceBadge source="simulated" /> Updated {fmtDate(rs[0]?.at ?? new Date().toISOString(), true)}</p>
        </>
      )}
      {issues.length > 0 && (
        <div className="text-sm">
          <p className="font-semibold text-ink">Open reports here</p>
          <ul className="mt-1 grid gap-1">
            {issues.map((i) => (
              <li key={i.id}>
                <button type="button" className="text-left text-primary underline underline-offset-2" onClick={() => go('maintenance', `issue:${i.id}`)}>{i.title}</button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {room.scope !== 'private' && (role === 'staff' || room.scope !== 'staff') && (
        <div><Button size="sm" onClick={() => go('maintenance', `new:${room.id}`)}><Wrench size={16} /> Report a problem here</Button></div>
      )}
    </div>
  );
}

