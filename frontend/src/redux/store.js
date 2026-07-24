import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice.js';
import cartReducer from './cartSlice.js';
import wishlistReducer from './wishlistSlice.js';
import orderReducer from './orderSlice.js';
import addressReducer from './addressSlice.js';
import petReducer from './petSlice.js';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    wishlist: wishlistReducer,
    orders: orderReducer,
    addresses: addressReducer,
    pets: petReducer,
  },
});
