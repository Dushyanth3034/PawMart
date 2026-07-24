import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api.js';

export const fetchWishlist = createAsyncThunk(
  'wishlist/fetchWishlist',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/wishlist');
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch wishlist');
    }
  }
);

export const toggleWishlistItem = createAsyncThunk(
  'wishlist/toggleWishlistItem',
  async (product, { dispatch, rejectWithValue }) => {
    try {
      const isPet = product.category === 'adoption';
      const payload = {
        productId: product.id,
        id: product.id,
        name: product.name,
        breed: product.breed,
        location: product.location,
        age: product.age,
        price: product.price || 0,
        image: product.image || (product.images && product.images.length > 0 ? product.images[0].url : ''),
        category: product.category
      };
      
      const response = await api.post('/wishlist/toggle', payload);
      dispatch(fetchWishlist()); // Immediately sync with DB
      return { 
        productId: product.id, 
        action: response.data.action, 
        product: payload,
        itemType: isPet ? 'PET' : 'PRODUCT'
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to toggle wishlist item');
    }
  }
);

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState: {
    items: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearWishlist: (state) => {
      state.items = [];
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWishlist.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchWishlist.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload; // array of wishlist DB records { id, productId, product }
      })
      .addCase(fetchWishlist.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(toggleWishlistItem.fulfilled, (state, action) => {
        const { productId, action: toggleAction, product, itemType } = action.payload;
        if (toggleAction === 'added') {
          // Optimistic update
          const exists = state.items.find(item => 
            (item.itemType === 'PRODUCT' && item.productId === productId) || 
            (item.itemType === 'PET' && item.petId === productId)
          );
          if (!exists) {
            state.items.push({
              id: 'temp-' + Date.now(),
              itemType,
              productId: itemType === 'PRODUCT' ? productId : null,
              petId: itemType === 'PET' ? productId : null,
              product: itemType === 'PRODUCT' ? product : null,
              pet: itemType === 'PET' ? {
                id: productId,
                name: product.name,
                breed: product.breed,
                imageUrl: product.image
              } : null
            });
          }
        } else {
          state.items = state.items.filter(item => 
            !(item.itemType === 'PRODUCT' && item.productId === productId) &&
            !(item.itemType === 'PET' && item.petId === productId)
          );
        }
      })
      .addCase('auth/clearCredentials', (state) => {
        state.items = [];
        state.loading = false;
        state.error = null;
      });
  }
});

export const { clearWishlist } = wishlistSlice.actions;
export default wishlistSlice.reducer;
