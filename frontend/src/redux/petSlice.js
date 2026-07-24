import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api.js';

export const fetchPets = createAsyncThunk('pets/fetchPets', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get('/pets');
    return response.data.pets;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to fetch pets');
  }
});

export const addPet = createAsyncThunk('pets/addPet', async (petData, { rejectWithValue }) => {
  try {
    // Make sure we pass the correct structure
    const payload = {
      ...petData,
      weight: parseFloat(petData.weight) || 0,
      vaccinations: petData.vaccinations ? petData.vaccinations.split(',').map(v => v.trim()) : [],
      medicalHistory: petData.medicalHistory ? petData.medicalHistory.split(',').map(v => v.trim()) : []
    };
    const response = await api.post('/pets', payload);
    return response.data.pet;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to add pet');
  }
});

export const deletePet = createAsyncThunk('pets/deletePet', async (petId, { rejectWithValue }) => {
  try {
    await api.delete(`/pets/${petId}`);
    return petId;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to delete pet');
  }
});

const petSlice = createSlice({
  name: 'pets',
  initialState: {
    items: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPets.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchPets.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload || [];
      })
      .addCase(fetchPets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(addPet.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      .addCase(deletePet.fulfilled, (state, action) => {
        state.items = state.items.filter(p => p.id !== action.payload);
      });
  }
});

export default petSlice.reducer;
