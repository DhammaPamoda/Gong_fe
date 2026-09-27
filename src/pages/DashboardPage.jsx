import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loadDashboard } from '../store/gongSlice';
import { logout } from '../store/authSlice';
import ScheduleModal from '../components/ScheduleModal';
import SettingsModal from '../components/SettingsModal';

const formatTime = (value) => value ? new Intl.DateTimeFormat([], { hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '—';
const formatDateTime = (value) => value ? new Intl.DateTimeFormat([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : 'No gong scheduled';

function scheduledCourseRows(coursesSchedule, staticData) {
  const templates = new Map((staticData?.courses || []).map((course) => [course.name, course]));
  const gongNames = new Map((staticData?.gongTypes || []).map((type) => [type.id, type.name]));
  return coursesSchedule.flatMap((schedule) => {
    const course = templates.get(schedule.name);
    if (!course?.routine || !schedule.date) return [];
    const start = new Date(schedule.date);
    return course.routine.map((gong, index) => ({
      id: `course-${schedule.id}-${index}`,
      when: new Date(start.getTime() + (gong.time || 0)),
      title: gong.gongTypeName || gongNames.get(gong.gongTypeId) || `Course gong ${gong.gongTypeId || ''}`,
      detail: schedule.name,
      source: 'Course',
      active: gong.isActive !== false,
    }));
  });
}

export default function DashboardPage() {
  const dispatch = useDispatch();
  const { username, token } = useSelector((state) => state.auth);
  const dashboard = useSelector((state) => state.gong);
  const [now, setNow] = useState(Date.now());
  const [isScheduleOpen, setScheduleOpen] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [deletingTime, setDeletingTime] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [openMenu, setOpenMenu] = useState(null);
  const [editingGong, setEditingGong] = useState(null);
  useEffect(() => { dispatch(loadDashboard()); }, [dispatch]);
  useEffect(() => {
    const serverNow = dashboard.basic?.currentServerTime;
    if (!serverNow) return undefined;
    const offset = Number(serverNow) - Date.now();
    const updateClock = () => setNow(Date.now() + offset);
    updateClock();
    const interval = window.setInterval(updateClock, 1_000);
    return () => window.clearInterval(interval);
  }, [dashboard.basic?.currentServerTime]);
  const rows = useMemo(() => {
    const gongNames = new Map((dashboard.staticData?.gongTypes || []).map((type) => [type.id, type.name]));
    const areaNames = new Map(Object.entries(dashboard.basic?.areas || {}).map(([id, name]) => [Number(id), name]));
    const manual = dashboard.manualGongs.map((gong, index) => {
      const areaIds = gong.gong?.areas || gong.areas || [];
      const detail = areaIds.includes(0) ? 'All' : areaIds.map((id) => areaNames.get(Number(id))).filter(Boolean).join(', ') || 'No areas selected';
      return { id: `manual-${index}`, when: new Date(gong.date || gong.time), title: gong.gongTypeName || gongNames.get(gong.gong?.gongType) || 'Manual gong', detail, source: 'Manual', active: gong.isActive !== false, deleteTime: gong.time, raw: gong };
    });
    return [...scheduledCourseRows(dashboard.coursesSchedule, dashboard.staticData), ...manual]
      .filter((row) => !Number.isNaN(row.when.getTime()))
      .sort((a, b) => a.when - b.when).slice(0, 12);
  }, [dashboard]);

  const deleteManualGong = async () => {
    const time = pendingDelete?.deleteTime;
    if (!time) return;
    setDeletingTime(time);
    setDeleteError('');
    try {
      const response = await fetch('/api/data/gong/remove', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ time }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body.ok === false) throw new Error(body.message || 'Unable to delete gong.');
      setPendingDelete(null);
      dispatch(loadDashboard());
    } catch (error) { setDeleteError(error.message); } finally { setDeletingTime(null); }
  };
  const nextGongTime = dashboard.basic?.nextScheduledJob?.time ?? dashboard.basic?.nextScheduledJobTime;
  return <main className="app-shell">
    <header className="topbar"><div className="topbar-brand"><span>◉</span> GONG</div><div className="topbar-actions"><span className="user-name">{username}</span><button aria-label="Help" title="Help">?</button><button aria-label="Settings" title="Settings" onClick={() => setSettingsOpen(true)}>⚙</button><button className="sign-out" onClick={() => dispatch(logout())}>Sign out</button></div></header>
    <section className="dashboard">
      <div className="page-heading"><div><p className="eyebrow">TODAY’S RHYTHM</p><h1>Good day, {username}.</h1></div><button className="refresh" onClick={() => dispatch(loadDashboard())}>↻ Refresh</button></div>
      {dashboard.error && <p className="form-error">{dashboard.error}</p>}
      <div className="overview-grid">
        <article className="next-card"><p className="card-label">NEXT GONG</p><h2>{formatDateTime(nextGongTime)}</h2><span className="status-dot">Schedule is active</span></article>
        <article className="time-card"><p className="card-label">CURRENT SERVER TIME</p><time>{formatTime(now)}</time><span>{new Intl.DateTimeFormat([], { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(now))}</span></article>
      </div>
      <section className="schedule-card"><div className="schedule-title"><div><p className="eyebrow">SCHEDULE</p><h2>Gongs</h2></div><div className="schedule-actions"><button className="schedule-button" onClick={() => setScheduleOpen(true)}>+ Schedule</button></div></div>
        {dashboard.status === 'loading' && <p className="empty-state">Loading schedule…</p>}
        {dashboard.status !== 'loading' && rows.length === 0 && <p className="empty-state">No upcoming course or manual gongs found.</p>}
        {rows.length > 0 && <div className="gong-table">{rows.map((row) => <div className="gong-row" key={row.id}><time><b>{formatTime(row.when)}</b><span>{new Intl.DateTimeFormat([], { month: 'short', day: 'numeric' }).format(row.when)}</span></time><div><b>{row.title}</b><span>{row.detail}</span></div><span className={`source-tag ${row.source.toLowerCase()}`}>{row.source}</span>{row.source === 'Course' && <span className={row.active ? 'active' : 'inactive'}>{row.active ? 'Active' : 'Paused'}</span>}{row.source === 'Manual' && <div className="gong-menu"><button className="menu-trigger" aria-label={`Actions for ${row.title}`} onClick={() => setOpenMenu(openMenu === row.id ? null : row.id)}>•••</button>{openMenu === row.id && <div className="menu-popover"><button onClick={() => { setOpenMenu(null); setEditingGong(row); setScheduleOpen(true); }}>Edit</button><button className="menu-delete" disabled={deletingTime === row.deleteTime} onClick={() => { setDeleteError(''); setOpenMenu(null); setPendingDelete(row); }}>Delete</button></div>}</div>}</div>)}</div>}
      </section>
      {isScheduleOpen && <ScheduleModal basic={dashboard.basic} staticData={dashboard.staticData} token={token} editingGong={editingGong} onClose={() => { setScheduleOpen(false); setEditingGong(null); }} onSaved={() => dispatch(loadDashboard())} />}
      {isSettingsOpen && <SettingsModal areas={dashboard.basic?.areas} token={token} onClose={() => setSettingsOpen(false)} onSaved={() => dispatch(loadDashboard())} />}
      {pendingDelete && <div className="modal-backdrop" role="presentation" onMouseDown={() => !deletingTime && setPendingDelete(null)}><section className="confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-title" onMouseDown={(event) => event.stopPropagation()}><p className="eyebrow">DELETE MANUAL GONG</p><h2 id="delete-title">Remove this scheduled gong?</h2><p>{pendingDelete.title} at {formatDateTime(pendingDelete.when)} will be removed from the schedule.</p>{deleteError && <p className="form-error">{deleteError}</p>}<footer><button className="cancel-button" disabled={Boolean(deletingTime)} onClick={() => setPendingDelete(null)}>Keep gong</button><button className="danger-button" disabled={Boolean(deletingTime)} onClick={deleteManualGong}>{deletingTime ? 'Deleting…' : 'Delete gong'}</button></footer></section></div>}
    </section>
  </main>;
}
