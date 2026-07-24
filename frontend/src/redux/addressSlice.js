import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api.js';

export const fetchAddresses = createAsyncThunk(
  'addresses/fetchAddresses',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/addresses');
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch addresses');
    }
  }
);

export const addAddress = createAsyncThunk(
  'addresses/addAddress',
  async (addressData, { rejectWithValue }) => {
    try {
      const response = await api.post('/addresses', addressData);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add address');
    }
  }
);

export const setDefaultAddress = createAsyncThunk(
  'addresses/setDefaultAddress',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.put(`/addresses/${id}/default`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to set default address');
    }
  }
);

export const deleteAddress = createAsyncThunk(
  'addresses/deleteAddress',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/addresses/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete address');
    }
  }
);

const addressSlice = createSlice({
  name: 'addresses',
  initialState: {
    items: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAddresses.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAddresses.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchAddresses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(addAddress.fulfilled, (state, action) => {
        if (action.payload.isDefault) {
          state.items.forEach(a => a.isDefault = false);
        }
        state.items.unshift(action.payload);
      })
      .addCase(setDefaultAddress.fulfilled, (state, action) => {
        state.items.forEach(a => {
          a.isDefault = a.id === action.payload.id;
        });
      })
      .addCase(deleteAddress.fulfilled, (state, action) => {
        state.items = state.items.filter(a => a.id !== action.payload);
        // Ideally we should refetch to get the new default if the server set one
      });
  }
});

export default addressSlice.reducer;
