import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { login } from '../store/authSlice';

export default function LoginPage() {
  const dispatch = useDispatch();
  const { status, error } = useSelector((state) => state.auth);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const submit = (event) => { event.preventDefault(); dispatch(login({ username, password, remember })); };

  return <main className="login-shell">
    <section className="login-card">
      <div className="brand-mark" aria-hidden="true">◉</div>
      <p className="eyebrow">GONG CONTROL</p>
      <h1>Welcome back.</h1>
      <p className="subtle">Sign in to see what’s ringing next.</p>
      <form onSubmit={submit}>
        <label>Username<input autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required /></label>
        <label>Password<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        <label className="remember-pill"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /><span>Remember me</span></label>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-button" disabled={status === 'loading'}>{status === 'loading' ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </section>
  </main>;
}
