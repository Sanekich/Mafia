import React from 'react';
import ReactDOM from 'react-dom/client';
import AppRoutes from './AppRoutes';
import { RoomsProvider } from './RoomsContext';
import { BrowserRouter } from 'react-router-dom';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <RoomsProvider>
        <AppRoutes />
      </RoomsProvider>
    </BrowserRouter>
  </React.StrictMode>
);