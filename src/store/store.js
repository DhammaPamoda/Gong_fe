import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import gongReducer from './gongSlice';

export const store = configureStore({
  reducer: { auth: authReducer, gong: gongReducer },
});
