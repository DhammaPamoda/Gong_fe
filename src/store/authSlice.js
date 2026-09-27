import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

const tokenKey = 'access_token';

function readUser(token) {
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub || 'Gong user';
  } catch {
    return 'Gong user';
  }
}

export const login = createAsyncThunk('auth/login', async ({ username, password, remember }, { rejectWithValue }) => {
  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: username.trim().toLowerCase(), password }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.ok === false) return rejectWithValue(body.message || 'Could not authenticate');
  if (!body.data?.token) return rejectWithValue('Login succeeded, but the server did not return an access token.');
  (remember ? localStorage : sessionStorage).setItem(tokenKey, body.data.token);
  (remember ? sessionStorage : localStorage).removeItem(tokenKey);
  return { token: body.data.token, username: readUser(body.data.token) };
});

const existingToken = localStorage.getItem(tokenKey) || sessionStorage.getItem(tokenKey);
const authSlice = createSlice({
  name: 'auth',
  initialState: { token: existingToken, username: existingToken ? readUser(existingToken) : null, status: 'idle', error: null },
  reducers: {
    logout: (state) => {
      localStorage.removeItem(tokenKey);
      sessionStorage.removeItem(tokenKey);
      state.token = null;
      state.username = null;
    },
  },
  extraReducers: (builder) => builder
    .addCase(login.pending, (state) => { state.status = 'loading'; state.error = null; })
    .addCase(login.fulfilled, (state, action) => {
      state.status = 'idle'; state.token = action.payload.token; state.username = action.payload.username;
    })
    .addCase(login.rejected, (state, action) => { state.status = 'idle'; state.error = action.payload || 'Could not authenticate'; }),
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
