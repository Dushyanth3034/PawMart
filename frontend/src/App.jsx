import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AppLayout from './layouts/AppLayout.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import VerifyOtpPage from './pages/VerifyOtpPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import ShopPage from './pages/ShopPage.jsx';
import ProductDetailPage from './pages/ProductDetailPage.jsx';
import CartPage from './pages/CartPage.jsx';
import CheckoutPage from './pages/CheckoutPage.jsx';
import ServicesPage from './pages/ServicesPage.jsx';
import AdoptionPage from './pages/AdoptionPage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import ContactPage from './pages/ContactPage.jsx';
import AppointmentBookingPage from './pages/AppointmentBookingPage.jsx';
import BuyerDashboard from './pages/BuyerDashboard.jsx';
import SellerDashboard from './pages/SellerDashboard.jsx';
import ProviderDashboard from './pages/ProviderDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import AdoptionDetailsPage from './pages/AdoptionDetailsPage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" reverseOrder={false} />
      <Routes>
        {/* Layout wrapped routes */}
        <Route path="/" element={<AppLayout />}>
          <Route index element={<LandingPage />} />
          <Route path="shop" element={<ShopPage />} />
          <Route path="product/:id" element={<ProductDetailPage />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="adoption" element={<AdoptionPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="contact" element={<ContactPage />} />
          
          {/* Dashboards & Buyer-only routes */}
          <Route element={<ProtectedRoute allowedRoles={['BUYER']} />}>
            <Route path="dashboard/buyer" element={<BuyerDashboard />} />
            <Route path="cart" element={<CartPage />} />
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="appointments/book" element={<AppointmentBookingPage />} />
            <Route path="adoptions/tracking/:id" element={<AdoptionDetailsPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['SELLER']} />}>
            <Route path="seller/home" element={<SellerDashboard />} />
            <Route path="dashboard/seller" element={<Navigate to="/seller/home" replace />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['SERVICE_PROVIDER']} />}>
            <Route path="dashboard/provider" element={<ProviderDashboard />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route path="dashboard/admin" element={<AdminDashboard />} />
            <Route path="admin/dashboard" element={<AdminDashboard />} />
          </Route>

          {/* Fallback */}
          <Route path="404" element={<NotFoundPage />} />
        </Route>

        {/* Individual Auth views */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/verify-otp" element={<VerifyOtpPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Global Fallback */}
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
