import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loadDashboard } from '../store/gongSlice';
import { logout } from '../store/authSlice';
import ScheduleModal from '../components/ScheduleModal';
import CourseScheduleModal from '../components/CourseScheduleModal';
import SettingsModal from '../components/SettingsModal';

const formatTime = (value) => value ? new Intl.DateTimeFormat([], { hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '—';
const formatDateTime = (value) => value ? new Intl.DateTimeFormat([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : 'No gong scheduled';

function scheduledCourseRows(coursesSchedule, staticData) {
  const templates = new Map((staticData?.courses || []).map((course) => [course.course_name, course]));
  const gongNames = new Map((staticData?.gongTypes || []).map((type) => [type.id, type.name]));
  return coursesSchedule.flatMap((schedule) => {
    const course = templates.get(schedule.course_name);
    if (!course?.course_agenda || !schedule.date) return [];
    const startFromDay = Number(schedule.startFromDay || 0);
    return course.course_agenda.flatMap((agenda, agendaIndex) => agenda.days.flatMap((day) => agenda.gongs.times.flatMap((time) => {
      if (Number(day) < startFromDay) return [];
      const normalizedTime = time.startsWith(':') ? `00${time}` : time;
      const [hour, minute] = normalizedTime.split(':').map(Number);
      const baseTime = new Date(`${schedule.date}T00:00:00`);
      baseTime.setDate(baseTime.getDate() + Number(day) - startFromDay);
      baseTime.setHours(hour, minute, 0, 0);
      const times = course.test && schedule.testHoursRange
        ? Array.from({ length: Number(schedule.testHoursRange.end) - Number(schedule.testHoursRange.start) + 1 }, (_, index) => {
          const when = new Date(baseTime);
          when.setHours(when.getHours() + Number(schedule.testHoursRange.start) + index);
          return when;
        }) : [baseTime];
      return times.map((when, index) => ({ id: `course-${schedule.id}-${agendaIndex}-${day}-${time}-${index}`, when, title: gongNames.get(agenda.gongs.type) || 'Course gong', detail: schedule.course_name, source: 'Course', courseId: schedule.id, courseDay: Number(day), courseTime: time, isActive: !schedule.exceptions?.some((exception) => Number(exception.day_number) === Number(day) && exception.time === time) }));
    })));
  });
}

export default function DashboardPage() {
  const dispatch = useDispatch();
  const { username, token } = useSelector((state) => state.auth);
  const role = useMemo(() => { try { return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role; } catch { return null; } }, [token]);
  const dashboard = useSelector((state) => state.gong);
  const canViewSettings = role === 'dev' || (dashboard.staticData?.permissions || []).find((permission) => permission.action === 'view_config')?.roles?.includes(role);
  const [now, setNow] = useState(Date.now());
  const [isScheduleOpen, setScheduleOpen] = useState(false);
  const [isCourseScheduleOpen, setCourseScheduleOpen] = useState(false);
  const [scheduleView, setScheduleView] = useState('course');
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [deletingTime, setDeletingTime] = useState(null);
  const [unschedulingCourse, setUnschedulingCourse] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [pendingCourseDelete, setPendingCourseDelete] = useState(null);
  const [pendingCourseGongToggle, setPendingCourseGongToggle] = useState(null);
  const [togglingCourseGong, setTogglingCourseGong] = useState(null);
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
      .filter((row) => row.when.getTime() >= now)
      .sort((a, b) => a.when - b.when);
  }, [dashboard, now]);
  const courseGroups = useMemo(() => {
    const groups = new Map();
    rows.filter((row) => row.source === 'Course').forEach((row) => {
      if (!groups.has(row.courseId)) groups.set(row.courseId, { id: row.courseId, name: row.detail, days: new Map() });
      const course = groups.get(row.courseId);
      if (!course.days.has(row.courseDay)) course.days.set(row.courseDay, []);
      course.days.get(row.courseDay).push(row);
    });
    return [...groups.values()].map((course) => ({ ...course, days: [...course.days.entries()] }));
  }, [rows]);
  const manualRows = useMemo(() => rows.filter((row) => row.source === 'Manual'), [rows]);
  const selectedCourse = courseGroups.find((course) => course.id === selectedCourseId);
  useEffect(() => {
    if (scheduleView === 'course' && !selectedCourseId && dashboard.coursesSchedule[0]) setSelectedCourseId(dashboard.coursesSchedule[0].id);
  }, [scheduleView, selectedCourseId, dashboard.coursesSchedule]);

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
  const unscheduleCourse = async () => {
    const id = pendingCourseDelete?.id;
    if (!id) return;
    setUnschedulingCourse(id);
    setDeleteError('');
    try {
      const response = await fetch('/api/data/coursesSchedule/remove', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ id }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body.ok === false) throw new Error(body.message || 'Unable to unschedule course.');
      setPendingCourseDelete(null);
      dispatch(loadDashboard());
    } catch (error) { setDeleteError(error.message); } finally { setUnschedulingCourse(null); }
  };
  const toggleCourseGong = async () => {
    const gong = pendingCourseGongToggle;
    if (!gong) return;
    setTogglingCourseGong(gong.id); setDeleteError('');
    try {
      const response = await fetch('/api/data/gong/toggle', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ course_id: gong.courseId, day_number: gong.courseDay, time: gong.courseTime }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body.ok === false) throw new Error(body.message || 'Unable to update course gong.');
      setPendingCourseGongToggle(null); dispatch(loadDashboard());
    } catch (error) { setDeleteError(error.message); } finally { setTogglingCourseGong(null); }
  };
  const renderGongRow = (row) => <div className={`gong-row ${row.isActive === false ? 'gong-inactive' : ''}`} key={row.id}><time><b>{formatTime(row.when)}</b><span>{new Intl.DateTimeFormat([], { month: 'short', day: 'numeric' }).format(row.when)}</span></time><div><b>{row.title}</b>{row.source === 'Manual' && <span>{row.detail}</span>}</div>{row.source === 'Manual' ? <span className="source-tag manual">Manual</span> : row.isActive === false ? <span className="gong-status">Deactivated</span> : <span />}{row.source === 'Manual' && <div className="gong-menu"><button className="menu-trigger" aria-label={`Actions for ${row.title}`} onClick={() => setOpenMenu(openMenu === row.id ? null : row.id)}>•••</button>{openMenu === row.id && <div className="menu-popover"><button onClick={() => { setOpenMenu(null); setEditingGong(row); setScheduleOpen(true); }}>Edit</button><button className="menu-delete" disabled={deletingTime === row.deleteTime} onClick={() => { setDeleteError(''); setOpenMenu(null); setPendingDelete(row); }}>Delete</button></div>}</div>}{row.source === 'Course' && <div className="gong-menu"><button className="menu-trigger" aria-label={`Actions for ${row.title}`} onClick={() => setOpenMenu(openMenu === row.id ? null : row.id)}>•••</button>{openMenu === row.id && <div className="menu-popover"><button className="menu-delete" onClick={() => { setDeleteError(''); setOpenMenu(null); setPendingCourseGongToggle(row); }}>{row.isActive === false ? 'Reactivate' : 'Deactivate'}</button></div>}</div>}</div>;
  const nextGong = dashboard.basic?.nextScheduledJob;
  const nextGongTime = nextGong?.time ?? dashboard.basic?.nextScheduledJobTime;
  const nextGongData = nextGong?.data ?? nextGong?.gong ?? nextGong;
  const nextGongType = (dashboard.staticData?.gongTypes || []).find((type) => Number(type.id) === Number(nextGongData?.gongType))?.name;
  const nextGongAreas = (nextGongData?.areas || []).includes(0)
    ? 'All areas'
    : (nextGongData?.areas || []).map((id) => dashboard.basic?.areas?.[id]).filter(Boolean).join(', ');
  const nextGongVolume = nextGongData?.volume;
  return <main className="app-shell">
    <header className="topbar"><div className="topbar-brand"><span>◉</span> GONG</div><div className="topbar-actions"><span className="user-name">{username}</span><button aria-label="Help" title="Help">?</button>{canViewSettings && <button aria-label="Settings" title="Settings" onClick={() => setSettingsOpen(true)}>⚙</button>}<button className="sign-out" onClick={() => dispatch(logout())}>Sign out</button></div></header>
    <section className="dashboard">
      <div className="page-heading"><div><p className="eyebrow">TODAY’S RHYTHM</p><h1>Good day, {username}.</h1></div><button className="refresh" onClick={() => dispatch(loadDashboard())}>↻ Refresh</button></div>
      {dashboard.error && <p className="form-error">{dashboard.error}</p>}
      <div className="overview-grid">
        <article className="next-card"><p className="card-label">NEXT GONG</p><h2>{formatDateTime(nextGongTime)}</h2>{nextGongTime && <div className="next-gong-details" style={{ color: '#7d7770', fontSize: '13px' }}>{[nextGongType, nextGongAreas, nextGongVolume != null ? `Volume ${nextGongVolume}%` : null].filter(Boolean).join(' · ')}</div>}</article>
        <article className="time-card"><p className="card-label">CURRENT SERVER TIME</p><time>{formatTime(now)}</time><span>{new Intl.DateTimeFormat([], { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(now))}</span></article>
      </div>
      <section className="schedule-card main-schedule-card"><div className="schedule-title"><div><p className="eyebrow">SCHEDULE</p><h2>Gongs</h2><nav className="schedule-tabs" aria-label="Gong schedule type"><button className={scheduleView === 'course' ? 'is-selected' : ''} onClick={() => setScheduleView('course')}>Course</button><button className={scheduleView === 'manual' ? 'is-selected' : ''} onClick={() => setScheduleView('manual')}>Manual</button></nav></div><div className="schedule-actions"><button className="schedule-button" onClick={() => scheduleView === 'course' ? setCourseScheduleOpen(true) : setScheduleOpen(true)}>+ Schedule</button></div></div>
        {dashboard.status === 'loading' && <p className="empty-state">Loading schedule…</p>}
        {scheduleView === 'manual' && dashboard.status !== 'loading' && manualRows.length === 0 && <p className="empty-state">No upcoming manual gongs found.</p>}
        {scheduleView === 'manual' && manualRows.length > 0 && <div className="gong-table"><div className="course-gong-group"><h3>Manual gongs</h3>{manualRows.map(renderGongRow)}</div></div>}
        {scheduleView === 'course' && dashboard.status !== 'loading' && dashboard.coursesSchedule.length === 0 && <p className="empty-state">No courses scheduled.</p>}
        {scheduleView === 'course' && dashboard.coursesSchedule.length > 0 && <><h3 className="schedule-section-title">Scheduled courses</h3><div className="course-table course-picker">{dashboard.coursesSchedule.map((course) => <div className={`course-row ${selectedCourseId === course.id ? 'selected' : ''}`} key={course.id} onClick={() => setSelectedCourseId(course.id)} role="button" tabIndex={0}><div><b>{course.course_name}</b><span>Starts on {new Intl.DateTimeFormat([], { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${course.date}T00:00:00`))}</span></div><div className="gong-menu"><button className="menu-trigger" aria-label={`Actions for ${course.course_name}`} onClick={(event) => { event.stopPropagation(); setOpenMenu(openMenu === `course-${course.id}` ? null : `course-${course.id}`); }}>•••</button>{openMenu === `course-${course.id}` && <div className="menu-popover"><button className="menu-delete" onClick={() => { setDeleteError(''); setOpenMenu(null); setPendingCourseDelete(course); }}>Unschedule</button></div>}</div></div>)}</div>{selectedCourse && <><h3 className="schedule-section-title">Upcoming gongs</h3><div className="gong-table selected-course-gongs"><h3>{selectedCourse.name}</h3>{selectedCourse.days.map(([day, dayRows]) => <div className="gong-day-group" key={day}><h4>Day {day}</h4>{dayRows.map(renderGongRow)}</div>)}</div></>}</>}
      </section>
      {isScheduleOpen && <ScheduleModal basic={dashboard.basic} staticData={dashboard.staticData} token={token} editingGong={editingGong} onClose={() => { setScheduleOpen(false); setEditingGong(null); }} onSaved={() => dispatch(loadDashboard())} />}
      {isCourseScheduleOpen && <CourseScheduleModal courses={dashboard.staticData?.courses || []} token={token} onClose={() => setCourseScheduleOpen(false)} onSaved={() => dispatch(loadDashboard())} />}
      {isSettingsOpen && <SettingsModal areas={dashboard.basic?.areas} gongTypes={dashboard.staticData?.gongTypes} permissions={dashboard.staticData?.permissions} token={token} username={username} role={role} onClose={() => setSettingsOpen(false)} onSaved={() => dispatch(loadDashboard())} />}
      {pendingDelete && <div className="modal-backdrop" role="presentation" onMouseDown={() => !deletingTime && setPendingDelete(null)}><section className="confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-title" onMouseDown={(event) => event.stopPropagation()}><p className="eyebrow">DELETE MANUAL GONG</p><h2 id="delete-title">Remove this scheduled gong?</h2><p>{pendingDelete.title} at {formatDateTime(pendingDelete.when)} will be removed from the schedule.</p>{deleteError && <p className="form-error">{deleteError}</p>}<footer><button className="cancel-button" disabled={Boolean(deletingTime)} onClick={() => setPendingDelete(null)}>Keep gong</button><button className="danger-button" disabled={Boolean(deletingTime)} onClick={deleteManualGong}>{deletingTime ? 'Deleting…' : 'Delete gong'}</button></footer></section></div>}
      {pendingCourseDelete && <div className="modal-backdrop" role="presentation" onMouseDown={() => !unschedulingCourse && setPendingCourseDelete(null)}><section className="confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="unschedule-title" onMouseDown={(event) => event.stopPropagation()}><p className="eyebrow">UNSCHEDULE COURSE</p><h2 id="unschedule-title">Unschedule this course?</h2><p>{pendingCourseDelete.course_name} and its remaining course gongs will be removed from the schedule.</p>{deleteError && <p className="form-error">{deleteError}</p>}<footer><button className="cancel-button" disabled={Boolean(unschedulingCourse)} onClick={() => setPendingCourseDelete(null)}>Keep course</button><button className="danger-button" disabled={Boolean(unschedulingCourse)} onClick={unscheduleCourse}>{unschedulingCourse ? 'Unscheduling…' : 'Unschedule course'}</button></footer></section></div>}
      {pendingCourseGongToggle && <div className="modal-backdrop" role="presentation" onMouseDown={() => !togglingCourseGong && setPendingCourseGongToggle(null)}><section className="confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="toggle-course-gong-title" onMouseDown={(event) => event.stopPropagation()}><p className="eyebrow">{pendingCourseGongToggle.isActive === false ? 'REACTIVATE GONG' : 'DEACTIVATE GONG'}</p><h2 id="toggle-course-gong-title">{pendingCourseGongToggle.isActive === false ? 'Reactivate this gong?' : 'Deactivate this gong?'}</h2><p>{pendingCourseGongToggle.title} on Day {pendingCourseGongToggle.courseDay} will {pendingCourseGongToggle.isActive === false ? 'be restored to' : 'be removed from'} the course schedule.</p>{deleteError && <p className="form-error">{deleteError}</p>}<footer><button className="cancel-button" disabled={Boolean(togglingCourseGong)} onClick={() => setPendingCourseGongToggle(null)}>Cancel</button><button className="danger-button" disabled={Boolean(togglingCourseGong)} onClick={toggleCourseGong}>{togglingCourseGong ? 'Saving…' : pendingCourseGongToggle.isActive === false ? 'Reactivate gong' : 'Deactivate gong'}</button></footer></section></div>}
    </section>
  </main>;
}
