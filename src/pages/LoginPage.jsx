import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { login } from '../store/authSlice';

export default function LoginPage() {
  const dispatch = useDispatch();
  const { status, error } = useSelector((state) => state.auth);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const submit = (event) => { event.preventDefault(); dispatch(login({ username, password, remember: true })); };

  return <main className="login-shell">
    <section className="login-card">
      <div className="login-brand"><div className="brand-mark" aria-hidden="true">◉</div><p>GONG</p></div>
      <h1>Welcome back.</h1>
      <form onSubmit={submit}>
        <label>Username<input autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required /></label>
        <label>Password<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-button" disabled={status === 'loading'}>{status === 'loading' ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </section>
  </main>;
}
