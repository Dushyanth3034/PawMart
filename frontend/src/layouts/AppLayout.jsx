import React from 'react';
import { Outlet } from 'react-router-dom';
import FloatingNavbar from '../components/ui/FloatingNavbar.jsx';
import Footer from '../components/ui/Footer.jsx';

export default function AppLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-[#F9FAFB] overflow-x-hidden w-full">
      <FloatingNavbar />
      <main className="flex-grow pt-24 min-w-0">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
