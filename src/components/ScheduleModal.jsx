import { useEffect, useState } from 'react';

const localDateTime = () => {
  const date = new Date(Date.now() + 2 * 60_000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

export default function ScheduleModal({ basic, staticData, token, editingGong, onClose, onSaved }) {
  const [kind, setKind] = useState(editingGong ? 'manual' : null);
  const [minimumTime] = useState(localDateTime);
  const [initialTime] = useState(() => editingGong?.raw?.time ? new Date(editingGong.raw.time - new Date(editingGong.raw.time).getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : minimumTime);
  const [date, setDate] = useState(initialTime.slice(0, 10));
  const [hour, setHour] = useState(initialTime.slice(11, 13));
  const [minute, setMinute] = useState(initialTime.slice(14, 16));
  const [gongType, setGongType] = useState(editingGong?.raw?.gong?.gongType ? String(editingGong.raw.gong.gongType) : '');
  const [areas, setAreas] = useState(editingGong?.raw?.gong?.areas || [0]);
  const [volume, setVolume] = useState(editingGong?.raw?.gong?.volume ?? 100);
  const [repeat, setRepeat] = useState(editingGong?.raw?.gong?.repeat ?? 1);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const gongTypes = staticData?.gongTypes || [];
  const areaList = Object.entries(basic?.areas || {}).map(([id, name]) => ({ id: Number(id), name }));

  useEffect(() => { if (!gongType && gongTypes[0]) setGongType(String(gongTypes[0].id)); }, [gongType, gongTypes]);
  const toggleArea = (id) => setAreas((selected) => {
    if (id === 0) return selected.includes(0) ? [] : [0, ...areaList.filter((area) => area.id !== 0).map((area) => area.id)];
    const next = selected.includes(id) ? selected.filter((areaId) => areaId !== id) : [...selected.filter((areaId) => areaId !== 0), id];
    const nonAllIds = areaList.filter((area) => area.id !== 0).map((area) => area.id);
    return nonAllIds.length && nonAllIds.every((areaId) => next.includes(areaId)) ? [0, ...nonAllIds] : next;
  });
  const selectedTime = `${date}T${hour}:${minute}`;
  const updateDate = (value) => {
    if (value < minimumTime.slice(0, 10)) {
      setDate(minimumTime.slice(0, 10));
      setHour(minimumTime.slice(11, 13));
      setMinute(minimumTime.slice(14, 16));
      setError('Choose a time at least two minutes from now.');
      return;
    }
    setError('');
    setDate(value);
  };
  const submit = async (event) => {
    event.preventDefault();
    if (selectedTime < minimumTime) { setError('Choose a time at least two minutes from now.'); return; }
    setStatus('saving'); setError('');
    if (editingGong) {
      const removeResponse = await fetch('/api/data/gong/remove', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ time: editingGong.raw.time }) });
      if (!removeResponse.ok) { setStatus('idle'); setError('Unable to replace the existing gong.'); return; }
    }
    const response = await fetch('/api/data/gong/add', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ time: new Date(selectedTime).getTime(), isActive: true, gong: { gongType: Number(gongType), areas, volume: Number(volume), repeat: Number(repeat) } }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.ok === false) { setStatus('idle'); setError(body.message || 'Unable to schedule gong.'); return; }
    onSaved(); onClose();
  };

  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="schedule-modal" role="dialog" aria-modal="true" aria-labelledby="schedule-title" onMouseDown={(event) => event.stopPropagation()}>
      <header><div><p className="eyebrow">SCHEDULE</p><h2 id="schedule-title">{editingGong ? 'Edit gong' : 'Add a gong'}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close">×</button></header>
      {!kind && <div className="schedule-choice"><p>What would you like to schedule?</p><div className="choice-grid"><button onClick={() => setKind('manual')}><span>◉</span><b>Manual gong</b><small>Set one gong for a specific date and time.</small></button><button className="disabled-choice" disabled><span>▦</span><b>Course</b><small>Course scheduling is coming next.</small></button></div></div>}
      {kind === 'manual' && <form className="manual-form" onSubmit={submit}>
        <button type="button" className="back-button" onClick={() => setKind(null)}>← Back to choices</button>
        <fieldset className="when-fieldset"><legend>When</legend><div className="form-grid"><label>Date<input type="date" min={minimumTime.slice(0, 10)} value={date} onChange={(event) => updateDate(event.target.value)} required /></label><label>Time<div className="clock-picker"><select aria-label="Hour" value={hour} onChange={(event) => setHour(event.target.value)}>{Array.from({ length: 24 }, (_, value) => String(value).padStart(2, '0')).map((value) => <option key={value} value={value} disabled={date === minimumTime.slice(0, 10) && value < minimumTime.slice(11, 13)}>{value}</option>)}</select><span>:</span><select aria-label="Minute" value={minute} onChange={(event) => setMinute(event.target.value)}>{Array.from({ length: 60 }, (_, value) => String(value).padStart(2, '0')).map((value) => <option key={value} value={value} disabled={date === minimumTime.slice(0, 10) && hour === minimumTime.slice(11, 13) && value < minimumTime.slice(14, 16)}>{value}</option>)}</select></div></label></div></fieldset>
        <fieldset><legend>Where</legend><div className="area-options">{areaList.map((area) => <label key={area.id} className="area-check"><input type="checkbox" checked={areas.includes(area.id)} onChange={() => toggleArea(area.id)} /><span>{area.name || 'All areas'}</span></label>)}</div></fieldset>
        <label>Gong type<select value={gongType} onChange={(event) => setGongType(event.target.value)} required>{gongTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label>
        <div className="form-grid controls-grid"><label>Volume <output>{volume}%</output><input type="range" min="1" max="100" value={volume} onChange={(event) => setVolume(event.target.value)} /></label><label>Repeats<div className="repeat-control"><button type="button" onClick={() => setRepeat(Math.max(1, repeat - 1))}>−</button><output>{repeat}</output><button type="button" onClick={() => setRepeat(Math.min(20, repeat + 1))}>+</button></div></label></div>
        {error && <p className="form-error">{error}</p>}<footer><button type="button" className="cancel-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={status === 'saving' || !gongType || !areas.length}>{status === 'saving' ? 'Saving…' : editingGong ? 'Save changes' : 'Schedule gong'}</button></footer>
      </form>}
    </section>
  </div>;
}
