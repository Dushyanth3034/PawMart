import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const getInitialState = () => {
  try {
    const user = JSON.parse(localStorage.getItem('pawmart_user'));
    const accessToken = localStorage.getItem('pawmart_accessToken');
    if (user && accessToken) {
      return { user, accessToken, isAuthenticated: true, loading: false };
    }
  } catch (e) {}
  return { user: null, accessToken: null, isAuthenticated: false, loading: false };
};

const initialState = getInitialState();

export const fetchProfile = createAsyncThunk('auth/fetchProfile', async (_, { getState, dispatch, rejectWithValue }) => {
  try {
    const { auth: { accessToken } } = getState();
    if (!accessToken) return rejectWithValue('No access token available');
    const config = { headers: { Authorization: `Bearer ${accessToken}` } };
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/profile`, config);
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) {
      dispatch(clearCredentials());
    }
    return rejectWithValue(error.response?.data?.message || 'Failed to fetch profile');
  }
});

export const updateProfile = createAsyncThunk('auth/updateProfile', async (profileData, { getState, dispatch, rejectWithValue }) => {
  try {
    const { auth: { accessToken } } = getState();
    if (!accessToken) return rejectWithValue('No access token available');
    const config = { headers: { Authorization: `Bearer ${accessToken}` } };
    const response = await axios.put(`${import.meta.env.VITE_API_URL}/profile`, profileData, config);
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) {
      dispatch(clearCredentials());
    }
    return rejectWithValue(error.response?.data?.message || 'Failed to update profile');
  }
});

export const uploadAvatar = createAsyncThunk('auth/uploadAvatar', async (file, { getState, dispatch, rejectWithValue }) => {
  try {
    const { auth: { accessToken } } = getState();
    if (!accessToken) return rejectWithValue('No access token available');
    const formData = new FormData();
    formData.append('image', file);
    const config = { 
      headers: { 
        Authorization: `Bearer ${accessToken}`
      } 
    };
    const response = await axios.post(`${import.meta.env.VITE_API_URL}/profile/image`, formData, config);
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) {
      dispatch(clearCredentials());
    }
    return rejectWithValue(error.response?.data?.message || 'Failed to upload avatar');
  }
});

export const logoutUser = createAsyncThunk('auth/logout', async (_, { dispatch, rejectWithValue }) => {
  try {
    await axios.post(`${import.meta.env.VITE_API_URL}/auth/logout`, {}, { withCredentials: true });
  } catch (error) {
    // Ignore error
  } finally {
    sessionStorage.clear();
    dispatch(clearCredentials());
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = true;
      state.loading = false;
      localStorage.setItem('pawmart_user', JSON.stringify(action.payload.user));
      localStorage.setItem('pawmart_accessToken', action.payload.accessToken);
    },
    clearCredentials: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      state.loading = false;
      localStorage.removeItem('pawmart_user');
      localStorage.removeItem('pawmart_accessToken');
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    updateUserLocally: (state, action) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        localStorage.setItem('pawmart_user', JSON.stringify(state.user));
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.user = { ...state.user, ...action.payload };
        localStorage.setItem('pawmart_user', JSON.stringify(state.user));
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = { ...state.user, ...action.payload };
        localStorage.setItem('pawmart_user', JSON.stringify(state.user));
      })
      .addCase(uploadAvatar.fulfilled, (state, action) => {
        state.user = { ...state.user, ...action.payload };
        localStorage.setItem('pawmart_user', JSON.stringify(state.user));
      });
  }
});

export const { setCredentials, clearCredentials, setLoading, updateUserLocally } = authSlice.actions;
export default authSlice.reducer;
