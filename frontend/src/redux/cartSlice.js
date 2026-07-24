import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api.js';

export const fetchCart = createAsyncThunk(
  'cart/fetchCart',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/cart');
      // map backend items to frontend format { id, product, quantity }
      const items = response.data.data.items.map(i => ({
        id: i.id,
        quantity: i.quantity,
        product: {
          ...i.product,
          selectedColor: i.selectedColor,
          selectedSize: i.selectedSize
        }
      }));
      return items;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch cart');
    }
  }
);

export const addToCartAPI = createAsyncThunk(
  'cart/addToCartAPI',
  async ({ product, quantity = 1, selectedColor = '', selectedSize = '' }, { dispatch, rejectWithValue }) => {
    try {
      const colorVal = selectedColor || product.selectedColor || '';
      const sizeVal = selectedSize || product.selectedSize || '';
      await api.post('/cart', { productId: product.id, quantity, selectedColor: colorVal, selectedSize: sizeVal });
      return { product: { ...product, selectedColor: colorVal, selectedSize: sizeVal }, quantity }; // to update local state optimistically
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add to cart');
    }
  }
);

export const removeFromCartAPI = createAsyncThunk(
  'cart/removeFromCartAPI',
  async (productId, { dispatch, rejectWithValue }) => {
    try {
      await api.delete(`/cart/${productId}`);
      return productId; // to update local state optimistically
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to remove from cart');
    }
  }
);

const initialState = {
  items: [],
  totalQuantity: 0,
  subtotal: 0,
};

const recalculateTotals = (state) => {
  state.totalQuantity = state.items.reduce((sum, item) => sum + item.quantity, 0);
  state.subtotal = state.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action) => {
      const { product, quantity = 1 } = action.payload;
      const existingItem = state.items.find((item) => 
        item.product.id === product.id && 
        (item.product.selectedColor || '') === (product.selectedColor || '') && 
        (item.product.selectedSize || '') === (product.selectedSize || '')
      );

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        state.items.push({ product, quantity });
      }
      recalculateTotals(state);
    },
    removeFromCart: (state, action) => {
      if (typeof action.payload === 'string') {
        state.items = state.items.filter((item) => item.product.id !== action.payload && item.id !== action.payload);
      } else {
        const { productId, selectedColor = '', selectedSize = '' } = action.payload;
        state.items = state.items.filter((item) => 
          !(item.product.id === productId && 
            (item.product.selectedColor || '') === selectedColor && 
            (item.product.selectedSize || '') === selectedSize)
        );
      }
      recalculateTotals(state);
    },
    updateQuantity: (state, action) => {
      const { productId, selectedColor = '', selectedSize = '', quantity } = action.payload;
      const item = state.items.find((item) => 
        item.product.id === productId && 
        (item.product.selectedColor || '') === selectedColor && 
        (item.product.selectedSize || '') === selectedSize
      );
      if (item && quantity > 0) {
        item.quantity = quantity;
      }
      recalculateTotals(state);
    },
    clearCart: (state) => {
      state.items = [];
      state.totalQuantity = 0;
      state.subtotal = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.items = action.payload;
        recalculateTotals(state);
      })
      .addCase(addToCartAPI.fulfilled, (state, action) => {
        const { product, quantity } = action.payload;
        const existingItem = state.items.find((item) => 
          item.product.id === product.id && 
          (item.product.selectedColor || '') === (product.selectedColor || '') && 
          (item.product.selectedSize || '') === (product.selectedSize || '')
        );
        if (existingItem) {
          existingItem.quantity += quantity;
        } else {
          state.items.push({ product, quantity });
        }
        recalculateTotals(state);
      })
      .addCase(removeFromCartAPI.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => 
          item.product.id !== action.payload && 
          item.id !== action.payload
        );
        recalculateTotals(state);
      })
      .addCase('auth/clearCredentials', (state) => {
        state.items = [];
        state.totalQuantity = 0;
        state.subtotal = 0;
      });
  }
});

export const { addToCart, removeFromCart, updateQuantity, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
