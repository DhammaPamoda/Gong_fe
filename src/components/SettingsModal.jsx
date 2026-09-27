import { useEffect, useMemo, useRef, useState } from 'react';
import AccessSettings from './AccessSettings';

const asAreas = (areas) => Object.entries(areas || {}).map(([id, name]) => ({ id: Number(id), name })).sort((a, b) => a.id - b.id);

export default function SettingsModal({ areas: initialAreas, gongTypes = [], permissions = [], token, username, role, onClose, onSaved }) {
  const [section, setSection] = useState('areas');
  const [areas, setAreas] = useState(() => asAreas(initialAreas));
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [addAreaError, setAddAreaError] = useState('');
  const [editingArea, setEditingArea] = useState(null);
  const [editingGong, setEditingGong] = useState(null);
  const [draftName, setDraftName] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadName, setUploadName] = useState('');
  const [busy, setBusy] = useState(false);
  const [playingId, setPlayingId] = useState(null);
  const [openSoundMenu, setOpenSoundMenu] = useState(null);
  const [openAreaMenu, setOpenAreaMenu] = useState(null);
  const [error, setError] = useState('');
  const [keypad, setKeypad] = useState(null);
  const [keypadDraft, setKeypadDraft] = useState(null);
  const [openKeypadMenu, setOpenKeypadMenu] = useState(null);
  const [pendingSequenceDelete, setPendingSequenceDelete] = useState(null);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [orefDraft, setOrefDraft] = useState(null);
  const [orefTest, setOrefTest] = useState(null);
  const audioRef = useRef(null);
  const audioUrlRef = useRef(null);

  useEffect(() => setAreas(asAreas(initialAreas)), [initialAreas]);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);
  useEffect(() => () => { audioRef.current?.pause(); if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current); }, []);
  const editableAreas = useMemo(() => areas.filter((area) => area.id !== 0), [areas]);
  const duplicateKeypadSequence = Boolean(keypadDraft && /^[1-4]{4}$/.test(keypadDraft.sequence) && keypadDraft.sequence !== keypadDraft.original && keypad?.sequences?.[keypadDraft.sequence]);
  const request = async (path, options = {}) => {
    const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.ok === false) throw new Error(body.message || 'Unable to save changes.');
    return body.data;
  };
  const addArea = async (event) => {
    event.preventDefault(); const id = Number(newId); const name = newName.trim();
    if (!Number.isInteger(id) || id <= 0 || !name) return;
    setBusy(true); setAddAreaError('');
    try { const area = await request('/api/data/areas', { method: 'POST', body: JSON.stringify({ id, name }) }); setAreas((current) => [...current, area].sort((a, b) => a.id - b.id)); setAdding(false); setNewId(''); setNewName(''); onSaved(); } catch (reason) { setAddAreaError(reason.message); } finally { setBusy(false); }
  };
  const renameArea = async (area) => {
    const name = draftName.trim(); if (!name || name === area.name) { setEditingArea(null); return; }
    setBusy(true); setError('');
    try { const updated = await request(`/api/data/areas/${area.id}`, { method: 'PUT', body: JSON.stringify({ name }) }); setAreas((current) => current.map((item) => item.id === area.id ? updated : item)); setEditingArea(null); onSaved(); } catch (reason) { setError(reason.message); } finally { setBusy(false); }
  };
  const renameGong = async (gong) => {
    const name = draftName.trim(); if (!name || name === gong.name) { setEditingGong(null); return; }
    setBusy(true); setError('');
    try { await request(`/api/data/gongs/${gong.id}`, { method: 'PUT', body: JSON.stringify({ name }) }); setEditingGong(null); onSaved(); } catch (reason) { setError(reason.message); } finally { setBusy(false); }
  };
  const togglePreview = async (gong) => {
    if (playingId === gong.id && audioRef.current) { audioRef.current.pause(); setPlayingId(null); return; }
    audioRef.current?.pause(); setPlayingId(gong.id); setError('');
    try {
      const response = await fetch(`/api/data/gongs/${gong.id}/audio`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error('Unable to load this gong sound.');
      const url = URL.createObjectURL(await response.blob());
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      const audio = new Audio(url); audioRef.current = audio; audioUrlRef.current = url;
      audio.onended = audio.onerror = () => { URL.revokeObjectURL(url); audioRef.current = null; audioUrlRef.current = null; setPlayingId(null); };
      await audio.play();
    } catch (reason) { setError(reason.message); setPlayingId(null); }
  };
  const uploadGong = async (event) => {
    event.preventDefault(); if (!uploadFile) return;
    setBusy(true); setError(''); const form = new FormData(); form.append('file', uploadFile); if (uploadName.trim()) form.append('name', uploadName.trim());
    try { const response = await fetch('/api/data/gong/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form }); const body = await response.json().catch(() => ({})); if (!response.ok || body.ok === false) throw new Error(body.message || 'Unable to upload gong.'); setUploadOpen(false); setUploadFile(null); setUploadName(''); onSaved(); } catch (reason) { setError(reason.message); } finally { setBusy(false); }
  };
  const startRename = (kind, item) => { setDraftName(item.name); if (kind === 'area') setEditingArea(item.id); else setEditingGong(item.id); };
  const keypadRequest = async (path, options = {}) => {
    const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || 'Unable to save keypad settings.');
    return body;
  };
  const openKeypad = async () => { setSection('keypad'); setError(''); try { setKeypad(await keypadRequest('/api/hk4')); } catch (reason) { setError(reason.message); } };
  const saveKeypad = async (next) => { setBusy(true); setError(''); try { setKeypad(await keypadRequest('/api/hk4', { method: 'POST', body: JSON.stringify(next) })); return true; } catch (reason) { setError(reason.message); return false; } finally { setBusy(false); } };
  const editSequence = (sequence = '', config = {}) => setKeypadDraft({ original: sequence, sequence, gongType: config.gongType ?? gongTypes[0]?.id ?? '', areas: config.areas ?? [], volume: config.volume ?? 100, repeat: config.repeat ?? 1 });
  const submitSequence = async (event) => { event.preventDefault(); const draft = keypadDraft; if (!/^[1-4]{4}$/.test(draft.sequence) || duplicateKeypadSequence || !draft.gongType || !draft.areas.length) return; const sequences = { ...(keypad.sequences || {}) }; if (draft.original && draft.original !== draft.sequence) delete sequences[draft.original]; sequences[draft.sequence] = { gongType: Number(draft.gongType), areas: draft.areas, volume: Number(draft.volume), repeat: Number(draft.repeat) }; if (await saveKeypad({ enabled: keypad.enabled !== false, sequences })) setKeypadDraft(null); };
  const removeSequence = async (sequence) => { const sequences = { ...(keypad.sequences || {}) }; delete sequences[sequence]; if (await saveKeypad({ enabled: keypad.enabled !== false, sequences })) setPendingSequenceDelete(null); };
  const changeStatus = async () => { const enabled = pendingStatus; setBusy(true); setError(''); try { setKeypad(await keypadRequest('/api/hk4/status', { method: 'POST', body: JSON.stringify({ enabled }) })); setPendingStatus(null); } catch (reason) { setError(reason.message); } finally { setBusy(false); } };
  const orefRequest = async (path, options = {}) => {
    const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.ok === false) throw new Error(body.message || 'Unable to update Oref settings.');
    return body.data ?? body;
  };
  const openOref = async () => {
    setSection('oref'); setError('');
    try {
      const settings = await orefRequest('/api/systemSettings');
      setOrefDraft({ runSecurityCheck: Boolean(settings.runSecurityCheck), testing: Boolean(settings.testing), alertLocation: settings.alertLocation || '', pollingInterval: settings.pollingInterval || 10, overrideOrefUrl: settings.overrideOrefUrl || '' });
    } catch (reason) { setError(reason.message); }
  };
  const saveOref = async (event) => {
    event.preventDefault();
    if (!orefDraft?.alertLocation.trim() || Number(orefDraft.pollingInterval) < 1) return;
    setBusy(true); setError('');
    try {
      const settings = await orefRequest('/api/systemSettings', { method: 'POST', body: JSON.stringify({ ...orefDraft, alertLocation: orefDraft.alertLocation.trim(), pollingInterval: Number(orefDraft.pollingInterval), overrideOrefUrl: orefDraft.overrideOrefUrl.trim() || null }) });
      setOrefDraft({ runSecurityCheck: Boolean(settings.runSecurityCheck), testing: Boolean(settings.testing), alertLocation: settings.alertLocation || '', pollingInterval: settings.pollingInterval || 10, overrideOrefUrl: settings.overrideOrefUrl || '' });
    } catch (reason) { setError(reason.message); } finally { setBusy(false); }
  };
  const triggerOrefTest = async (category) => {
    setBusy(true); setError('');
    try { await orefRequest('/api/data/testEmergency', { method: 'POST', body: JSON.stringify({ category }) }); setOrefTest(category); } catch (reason) { setError(reason.message); } finally { setBusy(false); }
  };
  const cancelOrefTest = async () => {
    setBusy(true); setError('');
    try { await orefRequest('/api/relay/cancelGong', { method: 'POST', body: JSON.stringify({}) }); setOrefTest(null); } catch (reason) { setError(reason.message); } finally { setBusy(false); }
  };

  const list = section === 'areas' ? editableAreas : gongTypes;
  const accessSection = section === 'users' || section === 'permissions';
  if (accessSection) return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title" onMouseDown={(event) => event.stopPropagation()}><aside className="settings-menu"><div className="settings-menu-brand">SETTINGS</div><button className="settings-menu-item" type="button" onClick={() => setSection('areas')}><span className="settings-menu-icon">▦</span> Areas</button><button className="settings-menu-item" type="button" onClick={() => setSection('gongs')}><span className="settings-menu-icon">◉</span> Gong sounds</button><button className="settings-menu-item" type="button" onClick={openKeypad}><span className="settings-menu-icon">⌨</span> Keypad</button><button className={`settings-menu-item ${section === 'users' ? 'active' : ''}`} type="button" onClick={() => setSection('users')}><span className="settings-menu-icon">♙</span> Users</button><button className={`settings-menu-item ${section === 'permissions' ? 'active' : ''}`} type="button" onClick={() => setSection('permissions')}><span className="settings-menu-icon">✓</span> Permissions</button><button className="settings-menu-item" type="button" onClick={openOref}><span className="settings-menu-icon">⚠</span> Oref alarm</button></aside><div className="settings-content"><header><div><p className="eyebrow">ACCESS CONTROL</p><h2 id="settings-title">{section === 'users' ? 'Users' : 'Permissions'}</h2><p className="settings-description">{section === 'users' ? 'Manage accounts and their access roles.' : 'Control which roles can use each action.'}</p></div><button className="icon-button" onClick={onClose} aria-label="Close">×</button></header><AccessSettings section={section} permissions={permissions} token={token} username={username} role={role} onSaved={onSaved} /></div></section></div>;
  return <div className="modal-backdrop" role="presentation" onMouseDown={!busy ? onClose : undefined}>
    <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title" onMouseDown={(event) => event.stopPropagation()}>
      <aside className="settings-menu"><div className="settings-menu-brand">SETTINGS</div><button className={`settings-menu-item ${section === 'areas' ? 'active' : ''}`} type="button" onClick={() => setSection('areas')}><span className="settings-menu-icon">▦</span> Areas</button><button className={`settings-menu-item ${section === 'gongs' ? 'active' : ''}`} type="button" onClick={() => setSection('gongs')}><span className="settings-menu-icon">◉</span> Gong sounds</button><button className={`settings-menu-item ${section === 'keypad' ? 'active' : ''}`} type="button" onClick={openKeypad}><span className="settings-menu-icon">⌨</span> Keypad</button><button className={`settings-menu-item ${section === 'users' ? 'active' : ''}`} type="button" onClick={() => setSection('users')}><span className="settings-menu-icon">♙</span> Users</button><button className={`settings-menu-item ${section === 'permissions' ? 'active' : ''}`} type="button" onClick={() => setSection('permissions')}><span className="settings-menu-icon">✓</span> Permissions</button><button className={`settings-menu-item ${section === 'oref' ? 'active' : ''}`} type="button" onClick={openOref}><span className="settings-menu-icon">⚠</span> Oref alarm</button></aside>
      <div className="settings-content"><header><div><p className="eyebrow">{section === 'keypad' ? 'HARDWARE' : section === 'oref' ? 'EMERGENCY ALERTS' : accessSection ? 'ACCESS CONTROL' : section === 'areas' ? 'CONFIGURATION' : 'SOUND LIBRARY'}</p><h2 id="settings-title">{section === 'keypad' ? 'HK4 keypad' : section === 'oref' ? 'Oref alarm' : section === 'areas' ? 'Areas' : section === 'gongs' ? 'Gong sounds' : section === 'users' ? 'Users' : 'Permissions'}</h2><p className="settings-description">{section === 'keypad' ? 'Assign four-key sequences to play gongs in selected areas.' : section === 'oref' ? 'Monitor Oref alerts and play the configured emergency sounds for a selected location.' : section === 'areas' ? 'Create and name the areas where gongs can be played.' : section === 'gongs' ? 'Preview and rename the sounds available when scheduling a gong.' : section === 'users' ? 'Manage accounts and their access roles.' : 'Control which roles can use each action.'}</p></div><button className="icon-button" onClick={onClose} disabled={busy} aria-label="Close">×</button></header>
        {section === 'oref' ? <div className="area-editor">{!orefDraft ? <p className="empty-state">Loading Oref settings…</p> : <form className="oref-form" onSubmit={saveOref}><div className="keypad-status-section oref-status-section"><h3>Status</h3><div className="keypad-status"><div><b>{orefDraft.runSecurityCheck ? 'Enabled' : 'Disabled'}</b><p>Turn Oref monitoring and matching emergency alarms on or off.</p></div><button className={`status-switch ${orefDraft.runSecurityCheck ? 'on' : ''}`} type="button" role="switch" aria-checked={orefDraft.runSecurityCheck} disabled={busy} onClick={() => setOrefDraft({ ...orefDraft, runSecurityCheck: !orefDraft.runSecurityCheck })}><span /></button></div></div><div className="keypad-status oref-testing-mode"><div><b>Testing mode</b><p>Process alerts without playing audio.</p></div><button className={`status-switch ${orefDraft.testing ? 'on' : ''}`} type="button" role="switch" aria-checked={orefDraft.testing} disabled={busy} onClick={() => setOrefDraft({ ...orefDraft, testing: !orefDraft.testing })}><span /></button></div><label>Alert location<input value={orefDraft.alertLocation} disabled={busy} onChange={(event) => setOrefDraft({ ...orefDraft, alertLocation: event.target.value })} required placeholder="e.g. דגניה" /></label><label>Polling interval (seconds)<input type="number" min="1" value={orefDraft.pollingInterval} disabled={busy} onChange={(event) => setOrefDraft({ ...orefDraft, pollingInterval: event.target.value })} required /></label><label>Alternative Oref URL <small>Optional; intended for local test feeds.</small><input type="url" value={orefDraft.overrideOrefUrl} disabled={busy} onChange={(event) => setOrefDraft({ ...orefDraft, overrideOrefUrl: event.target.value })} placeholder="http://localhost:8080/alerts.json" /></label><footer><button className="primary-button" disabled={busy || !orefDraft.alertLocation.trim() || Number(orefDraft.pollingInterval) < 1}>{busy ? 'Saving…' : 'Save Oref settings'}</button></footer><div className="oref-test-panel"><div><h3>Test Oref alerts</h3><p>Triggers the selected alert category for the configured location.</p></div><div className="oref-test-actions"><button type="button" className="small-primary" disabled={busy || !orefDraft.runSecurityCheck} onClick={() => triggerOrefTest('prepare')}>Test prepare</button><button type="button" className="danger-button" disabled={busy || !orefDraft.runSecurityCheck} onClick={() => triggerOrefTest('siren')}>Test siren</button><button type="button" className="cancel-button" disabled={busy || !orefDraft.runSecurityCheck} onClick={() => triggerOrefTest('end')}>Test event end</button>{orefTest && <button type="button" className="danger-button" disabled={busy} onClick={cancelOrefTest}>Stop audio</button>}</div></div></form>}</div> : section === 'keypad' ? <div className="area-editor">{!keypad ? <p className="empty-state">Loading keypad settings…</p> : <><div className="area-editor-heading"><div><h3>Sequences</h3><p>Keys 1–4 only; each sequence is four keys long.</p></div><button className="small-primary" disabled={busy || !gongTypes.length} onClick={() => editSequence()}>+ Add sequence</button></div><div className="area-list">{Object.entries(keypad.sequences || {}).map(([sequence, config]) => <div className="area-editor-row" key={sequence}><div><b className="sequence-key">{sequence}</b><small>{gongTypes.find((gong) => Number(gong.id) === Number(config.gongType))?.name || `Gong ${config.gongType}`} · Volume {config.volume} · Repeat {config.repeat || 1}</small></div><div className="gong-menu"><button className="menu-trigger" type="button" aria-label={`Actions for ${sequence}`} onClick={() => setOpenKeypadMenu(openKeypadMenu === sequence ? null : sequence)}>•••</button>{openKeypadMenu === sequence && <div className="menu-popover"><button type="button" onClick={() => { setOpenKeypadMenu(null); editSequence(sequence, config); }}>Edit</button><button className="menu-delete" type="button" onClick={() => { setOpenKeypadMenu(null); setPendingSequenceDelete(sequence); }}>Delete</button></div>}</div></div>)}{Object.keys(keypad.sequences || {}).length === 0 && <p className="empty-state">No keypad sequences configured.</p>}</div><div className="keypad-status-section"><h3>Status</h3><div className="keypad-status"><div><b>{keypad.enabled === false ? 'Disabled' : 'Enabled'}</b><p>Turn HK4 keypad actions on or off.</p></div><button className={`status-switch ${keypad.enabled === false ? '' : 'on'}`} type="button" role="switch" aria-checked={keypad.enabled !== false} disabled={busy} onClick={() => setPendingStatus(keypad.enabled === false)}><span /></button></div></div></>}</div> : <div className="area-editor"><div className="area-editor-heading"><div><h3>{section === 'areas' ? 'Manage areas' : 'Available sounds'}</h3><p>{section === 'areas' ? 'Areas are available when scheduling a gong.' : `${gongTypes.length} sound${gongTypes.length === 1 ? '' : 's'} in the library.`}</p></div><button className="small-primary" type="button" disabled={busy} onClick={() => section === 'areas' ? (setAddAreaError(''), setAdding(true)) : setUploadOpen(true)}>{section === 'areas' ? '+ Add area' : '+ Upload sound'}</button></div>
          <div className="area-list gong-sound-list">{list.map((item) => { const editing = section === 'areas' ? editingArea === item.id : editingGong === item.id; return <div className="area-editor-row" key={item.id}>{editing ? <form className="rename-area-form" onSubmit={(event) => { event.preventDefault(); section === 'areas' ? renameArea(item) : renameGong(item); }}><input autoFocus value={draftName} onChange={(event) => setDraftName(event.target.value)} maxLength="100" /><button className="small-primary" disabled={busy}>Save</button><button className="text-button" type="button" onClick={() => { setEditingArea(null); setEditingGong(null); }}>Cancel</button></form> : <><div><b>{item.name}</b><small>{section === 'areas' ? `Area id: ${item.id}` : item.pathName}</small></div>{section === 'gongs' ? <div className="sound-row-actions"><button className="sound-icon-button" type="button" disabled={busy} onClick={() => togglePreview(item)} aria-label={playingId === item.id ? `Pause ${item.name}` : `Play ${item.name}`} title={playingId === item.id ? 'Pause' : 'Play'}>{playingId === item.id ? '❚❚' : '▶'}</button><div className="gong-menu"><button className="menu-trigger" type="button" aria-label={`Actions for ${item.name}`} onClick={() => setOpenSoundMenu(openSoundMenu === item.id ? null : item.id)}>•••</button>{openSoundMenu === item.id && <div className="menu-popover"><button type="button" onClick={() => { setOpenSoundMenu(null); startRename('gong', item); }}>Rename</button></div>}</div></div> : <div className="gong-menu"><button className="menu-trigger" type="button" aria-label={`Actions for ${item.name}`} onClick={() => setOpenAreaMenu(openAreaMenu === item.id ? null : item.id)}>•••</button>{openAreaMenu === item.id && <div className="menu-popover"><button type="button" onClick={() => { setOpenAreaMenu(null); startRename('area', item); }}>Rename</button></div>}</div>}</>}</div>; })}{list.length === 0 && <p className="empty-state">No {section === 'areas' ? 'areas' : 'gong sounds'} yet.</p>}</div>{error && <p className="form-error">{error}</p>}</div>}
      </div>
    </section>
    {adding && <div className="modal-backdrop nested-modal" role="presentation" onMouseDown={!busy ? () => setAdding(false) : undefined}><section className="confirm-modal area-form-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><p className="eyebrow">AREAS</p><h2>Add an area</h2><form onSubmit={addArea}><label>Area id<input autoFocus type="number" min="1" value={newId} onChange={(event) => setNewId(event.target.value)} required /></label><label>Area name<input value={newName} onChange={(event) => setNewName(event.target.value)} required /></label>{addAreaError && <p className="form-error" role="alert">{addAreaError}</p>}<footer><button className="cancel-button" type="button" onClick={() => setAdding(false)}>Cancel</button><button className="primary-button" disabled={busy}>Add area</button></footer></form></section></div>}
    {uploadOpen && <div className="modal-backdrop nested-modal" role="presentation" onMouseDown={!busy ? () => setUploadOpen(false) : undefined}><section className="confirm-modal area-form-modal" role="dialog" aria-modal="true" aria-labelledby="upload-gong-title" onMouseDown={(event) => event.stopPropagation()}><p className="eyebrow">GONG SOUNDS</p><h2 id="upload-gong-title">Upload a gong sound</h2><form className="gong-upload-form" onSubmit={uploadGong}><label>Sound file<input autoFocus type="file" accept="audio/*,.wav,.mp3,.m4a,.ogg" onChange={(event) => setUploadFile(event.target.files?.[0] || null)} required /></label><label>Display name <small>Optional — defaults to the file name.</small><input value={uploadName} onChange={(event) => setUploadName(event.target.value)} maxLength="100" placeholder="e.g. Evening meditation" /></label>{error && <p className="form-error">{error}</p>}<footer><button className="cancel-button" type="button" disabled={busy} onClick={() => setUploadOpen(false)}>Cancel</button><button className="primary-button" disabled={busy || !uploadFile}>{busy ? 'Uploading…' : 'Upload sound'}</button></footer></form></section></div>}
    {keypadDraft && <div className="modal-backdrop nested-modal" role="presentation" onMouseDown={!busy ? () => setKeypadDraft(null) : undefined}><section className="confirm-modal keypad-editor-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><p className="eyebrow">HK4 KEYPAD</p><h2>{keypadDraft.original ? 'Edit sequence' : 'Add sequence'}</h2><form onSubmit={submitSequence}><label>Four-key sequence<input autoFocus inputMode="numeric" maxLength="4" value={keypadDraft.sequence} aria-invalid={duplicateKeypadSequence} onChange={(event) => setKeypadDraft({ ...keypadDraft, sequence: event.target.value.replace(/[^1-4]/g, '') })} placeholder="e.g. 1234" required /></label>{duplicateKeypadSequence && <p className="form-error" role="alert">This sequence is already configured.</p>}<label>Gong sound<select value={keypadDraft.gongType} onChange={(event) => setKeypadDraft({ ...keypadDraft, gongType: event.target.value })}>{gongTypes.map((gong) => <option key={gong.id} value={gong.id}>{gong.name}</option>)}</select></label><fieldset><legend>Areas</legend>{asAreas(initialAreas).map((area) => <label className="area-check" key={area.id}><input type="checkbox" checked={keypadDraft.areas.includes(area.id)} onChange={(event) => setKeypadDraft({ ...keypadDraft, areas: event.target.checked ? [...keypadDraft.areas, area.id] : keypadDraft.areas.filter((id) => id !== area.id) })} />{area.id === 0 ? 'All areas' : area.name}</label>)}</fieldset><div className="keypad-number-fields"><label>Volume<input type="number" min="0" max="100" value={keypadDraft.volume} onChange={(event) => setKeypadDraft({ ...keypadDraft, volume: event.target.value })} /></label><label>Repeat<input type="number" min="1" value={keypadDraft.repeat} onChange={(event) => setKeypadDraft({ ...keypadDraft, repeat: event.target.value })} /></label></div><footer><button className="cancel-button" type="button" onClick={() => setKeypadDraft(null)}>Cancel</button><button className="primary-button" disabled={busy || duplicateKeypadSequence || !/^[1-4]{4}$/.test(keypadDraft.sequence) || !keypadDraft.areas.length}>Save sequence</button></footer></form></section></div>}
    {pendingSequenceDelete && <div className="modal-backdrop nested-modal" role="presentation" onMouseDown={!busy ? () => setPendingSequenceDelete(null) : undefined}><section className="confirm-modal" role="alertdialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><p className="eyebrow">DELETE KEYPAD SEQUENCE</p><h2>Remove this sequence?</h2><p>Sequence <b>{pendingSequenceDelete}</b> will be removed from the keypad.</p><footer><button className="cancel-button" disabled={busy} onClick={() => setPendingSequenceDelete(null)}>Keep sequence</button><button className="danger-button" disabled={busy} onClick={() => removeSequence(pendingSequenceDelete)}>{busy ? 'Deleting…' : 'Delete'}</button></footer></section></div>}
    {pendingStatus !== null && <div className="modal-backdrop nested-modal" role="presentation" onMouseDown={!busy ? () => setPendingStatus(null) : undefined}><section className="confirm-modal" role="alertdialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><p className="eyebrow">KEYPAD STATUS</p><h2>{pendingStatus ? 'Enable keypad?' : 'Disable keypad?'}</h2><p>{pendingStatus ? 'Saved HK4 sequences will start triggering gongs again.' : 'Saved HK4 sequences will remain available, but keypad presses will not trigger gongs.'}</p><footer><button className="cancel-button" disabled={busy} onClick={() => setPendingStatus(null)}>Cancel</button><button className="primary-button" disabled={busy} onClick={changeStatus}>{busy ? 'Saving…' : 'Confirm'}</button></footer></section></div>}
  </div>;
}
