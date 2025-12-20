import React from 'react';
import { Routes, Route } from 'react-router-dom'; // no BrowserRouter here
import { RoomsProvider } from './RoomsContext';
import App from './components/App';
import RoomPage from './RoomPage';
import Mafia from './components/Mafia';

function AppRoutes() {
  return (
    <RoomsProvider>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/rooms/:id" element={<RoomPage />} />
        <Route path="/mafia/:id" element={<Mafia />} />
      </Routes>
    </RoomsProvider>
  );
}

export default AppRoutes;
