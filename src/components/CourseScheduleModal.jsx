import { useEffect, useMemo, useState } from 'react';

const today = () => new Date().toISOString().slice(0, 10);

export default function CourseScheduleModal({ courses, token, onClose, onSaved }) {
  const [courseName, setCourseName] = useState('');
  const [date, setDate] = useState(today);
  const [startFromDay, setStartFromDay] = useState('0');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const course = useMemo(() => courses.find((item) => item.course_name === courseName), [courses, courseName]);

  useEffect(() => { if (!courseName && courses[0]) setCourseName(courses[0].course_name); }, [courseName, courses]);
  useEffect(() => setStartFromDay('0'), [courseName]);
  const submit = async (event) => {
    event.preventDefault();
    setStatus('saving'); setError('');
    try {
      const response = await fetch('/api/data/coursesSchedule/add', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ course_name: courseName, date, startFromDay: Number(startFromDay) }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body.ok === false) throw new Error(body.message || 'Unable to schedule course.');
      onSaved(); onClose();
    } catch (requestError) { setError(requestError.message); } finally { setStatus('idle'); }
  };
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><section className="schedule-modal course-schedule-modal" role="dialog" aria-modal="true" aria-labelledby="course-schedule-title" onMouseDown={(event) => event.stopPropagation()}>
    <header><div><p className="eyebrow">COURSES</p><h2 id="course-schedule-title">Schedule a course</h2></div><button className="icon-button" onClick={onClose} aria-label="Close">×</button></header>
    <form className="manual-form" onSubmit={submit}>
      <label>Course name<select value={courseName} onChange={(event) => setCourseName(event.target.value)} required>{courses.map((item) => <option key={item.course_name} value={item.course_name}>{item.course_name}</option>)}</select></label>
      <fieldset className="when-fieldset"><legend>Start</legend><div className="form-grid"><label>Date<input type="date" min={today()} value={date} onChange={(event) => setDate(event.target.value)} required /></label><label>Start from course day<select value={startFromDay} onChange={(event) => setStartFromDay(event.target.value)}>{Array.from({ length: course?.days_count || 0 }, (_, index) => <option key={index} value={index}>Day {index + 1}</option>)}</select></label></div></fieldset>
      {course && <p className="course-hint">{course.days_count} days total. The selected date will run course day {Number(startFromDay) + 1}.</p>}{error && <p className="form-error">{error}</p>}
      <footer><button type="button" className="cancel-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={status === 'saving' || !courseName}>{status === 'saving' ? 'Scheduling…' : 'Schedule course'}</button></footer>
    </form>
  </section></div>;
}
