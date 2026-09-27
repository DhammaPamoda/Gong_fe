import { useEffect, useMemo, useState } from 'react';

const asAreas = (areas) => Object.entries(areas || {}).map(([id, name]) => ({ id: Number(id), name })).sort((a, b) => a.id - b.id);

export default function SettingsModal({ areas: initialAreas, token, onClose, onSaved }) {
  const [areas, setAreas] = useState(() => asAreas(initialAreas));
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [isAdding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [draftName, setDraftName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => setAreas(asAreas(initialAreas)), [initialAreas]);
  const editableAreas = useMemo(() => areas.filter((area) => area.id !== 0), [areas]);
  const duplicateId = newId !== '' && editableAreas.some((area) => area.id === Number(newId));
  const request = async (path, options = {}) => {
    const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.ok === false) throw new Error(body.message || 'Unable to save area.');
    return body.data;
  };
  const closeAddForm = () => { setAdding(false); setNewId(''); setNewName(''); setError(''); };
  const addArea = async (event) => {
    event.preventDefault();
    const id = Number(newId);
    const name = newName.trim();
    if (!Number.isInteger(id) || id <= 0 || !name || duplicateId) return;
    setBusy(true); setError('');
    try { const area = await request('/api/data/areas', { method: 'POST', body: JSON.stringify({ id, name }) }); setAreas((current) => [...current, area].sort((a, b) => a.id - b.id)); closeAddForm(); onSaved(); } catch (reason) { setError(reason.message); } finally { setBusy(false); }
  };
  const renameArea = async (area) => {
    const name = draftName.trim();
    if (!name || name === area.name) { setEditing(null); return; }
    setBusy(true); setError('');
    try { const updated = await request(`/api/data/areas/${area.id}`, { method: 'PUT', body: JSON.stringify({ name }) }); setAreas((current) => current.map((item) => item.id === area.id ? updated : item)); setEditing(null); onSaved(); } catch (reason) { setError(reason.message); } finally { setBusy(false); }
  };
  const deleteArea = async () => {
    const area = pendingDelete;
    if (!area) return;
    setBusy(true); setError('');
    try { await request(`/api/data/areas/${area.id}`, { method: 'DELETE' }); setAreas((current) => current.filter((item) => item.id !== area.id)); setPendingDelete(null); onSaved(); } catch (reason) { setError(reason.message); } finally { setBusy(false); }
  };

  return <div className="modal-backdrop" role="presentation" onMouseDown={!busy ? onClose : undefined}>
    <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title" onMouseDown={(event) => event.stopPropagation()}>
      <aside className="settings-menu"><div className="settings-menu-brand">SETTINGS</div><button className="settings-menu-item active" type="button"><span>▦</span> Areas</button></aside>
      <div className="settings-content"><header><div><p className="eyebrow">CONFIGURATION</p><h2 id="settings-title">Areas</h2><p className="settings-description">Create and name the areas where gongs can be played.</p></div><button className="icon-button" onClick={onClose} disabled={busy} aria-label="Close">×</button></header>
        <div className="area-editor"><div className="area-editor-heading"><div><h3>Manage areas</h3><p>Areas are available when scheduling a gong.</p></div><div className="area-editor-actions"><button className="small-primary" type="button" disabled={busy} onClick={() => setAdding(true)}>+ Add area</button></div></div>
          <div className="area-list">{editableAreas.map((area) => <div className="area-editor-row" key={area.id}>{editing === area.id ? <form className="rename-area-form" onSubmit={(event) => { event.preventDefault(); renameArea(area); }}><input autoFocus value={draftName} onChange={(event) => setDraftName(event.target.value)} aria-label={`Name for ${area.name}`} /><button className="small-primary" disabled={busy}>Save</button><button type="button" className="text-button" disabled={busy} onClick={() => setEditing(null)}>Cancel</button></form> : <><div><b>{area.name}</b><small>Area id: {area.id}</small></div><div className="area-row-actions"><button className="text-button" disabled={busy} onClick={() => { setEditing(area.id); setDraftName(area.name); }}>Rename</button><button className="delete-area" disabled={busy} onClick={() => { setError(''); setPendingDelete(area); }}>Delete</button></div></>}</div>)}</div>
          {error && <p className="form-error">{error}</p>}
        </div>
      </div>
    </section>
    {isAdding && <div className="modal-backdrop nested-modal" role="presentation" onMouseDown={!busy ? closeAddForm : undefined}><section className="confirm-modal area-form-modal" role="dialog" aria-modal="true" aria-labelledby="add-area-title" onMouseDown={(event) => event.stopPropagation()}><p className="eyebrow">AREAS</p><h2 id="add-area-title">Add an area</h2><form onSubmit={addArea}><label>Area id<input className="area-id-input" autoFocus type="number" min="1" step="1" value={newId} onChange={(event) => setNewId(event.target.value)} required aria-invalid={duplicateId} /></label>{duplicateId && <p className="form-error">Area id {newId} is already in use. Choose a different id.</p>}<label>Area name<input placeholder="e.g. Meditation hall" value={newName} onChange={(event) => setNewName(event.target.value)} maxLength="100" required /></label><footer><button type="button" className="cancel-button" disabled={busy} onClick={closeAddForm}>Cancel</button><button className="primary-button" disabled={busy || !newName.trim() || !newId || duplicateId}>{busy ? 'Adding…' : 'Add area'}</button></footer></form></section></div>}
    {pendingDelete && <div className="modal-backdrop nested-modal" role="presentation" onMouseDown={!busy ? () => setPendingDelete(null) : undefined}><section className="confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-area-title" onMouseDown={(event) => event.stopPropagation()}><p className="eyebrow">DELETE AREA</p><h2 id="delete-area-title">Remove this area?</h2><p><b>{pendingDelete.name}</b> (Area id: {pendingDelete.id}) will be removed. Areas in use cannot be deleted.</p>{error && <p className="form-error">{error}</p>}<footer><button className="cancel-button" disabled={busy} onClick={() => setPendingDelete(null)}>Keep area</button><button className="danger-button" disabled={busy} onClick={deleteArea}>{busy ? 'Deleting…' : 'Delete area'}</button></footer></section></div>}
  </div>;
}
