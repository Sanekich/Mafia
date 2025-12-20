import React from 'react';
import { Routes, Route } from 'react-router-dom'; // no BrowserRouter here
import { RoomsProvider } from './RoomsContext';
import App from './components/App';
import RoomPage from './RoomPage';

function AppRoutes() {
  return (
    <RoomsProvider>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/rooms/:id" element={<RoomPage />} />
      </Routes>
    </RoomsProvider>
  );
}

export default AppRoutes;
