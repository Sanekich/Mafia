// src/RoomsContext.js
import { createContext, useState, useEffect } from 'react';
import { url } from './URL';

export const RoomsContext = createContext();

export function RoomsProvider({ children }) {
  const [rooms, setRooms] = useState([]);
  const [playerName, setPlayerName] = useState(localStorage.getItem('playerName') || '');

  // Fetch rooms from backend
  const fetchRooms = async () => {
    const res = await fetch(`${url}/rooms`);
    const data = await res.json();
    setRooms(data);
  };

  // Poll rooms every 1.5 seconds
  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 1500);
    return () => clearInterval(interval);
  }, []);

  const setName = (name) => {
    setPlayerName(name);
    localStorage.setItem('playerName', name);
  };

  const createRoom = async () => {
    const res = await fetch(`${url}/rooms`, { method: 'POST' });
    const newRoom = await res.json();
    await joinRoom(newRoom.id); // auto-join creator
    return newRoom.id;
  };

  const joinRoom = async (roomId, name = playerName) => {
    if (!name.trim()) return;
    await fetch(`${url}/rooms/${roomId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName: name })
    });
    await fetchRooms(); // immediately refresh rooms
  };

  const leaveRoom = async (roomId, name = playerName) => {
    await fetch(`${url}/rooms/${roomId}/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName: name })
    });
    await fetchRooms(); // refresh rooms
  };

  return (
    <RoomsContext.Provider value={{ rooms, playerName, setName, createRoom, joinRoom, leaveRoom, fetchRooms }}>
      {children}
    </RoomsContext.Provider>
  );
}
