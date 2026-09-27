import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

const get = async (path, token) => {
  const response = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message || 'Unable to load gong data');
  return body.data;
};

export const loadDashboard = createAsyncThunk('gong/loadDashboard', async (_, { getState }) => {
  const { token } = getState().auth;
  const [basic, staticData, coursesSchedule, manualGongs] = await Promise.all([
    get('/api/nextgong', token), get('/api/data/staticData', token), get('/api/data/coursesSchedule', token), get('/api/data/gongs/list', token),
  ]);
  return { basic, staticData, coursesSchedule, manualGongs };
});

const gongSlice = createSlice({
  name: 'gong',
  initialState: { basic: null, staticData: null, coursesSchedule: [], manualGongs: [], status: 'idle', error: null },
  reducers: {},
  extraReducers: (builder) => builder
    .addCase(loadDashboard.pending, (state) => { state.status = 'loading'; state.error = null; })
    .addCase(loadDashboard.fulfilled, (state, action) => { Object.assign(state, action.payload, { status: 'ready' }); })
    .addCase(loadDashboard.rejected, (state, action) => { state.status = 'error'; state.error = action.error.message; }),
});

export default gongSlice.reducer;
