import { createContext, useState, useEffect, useCallback } from 'react';
import { url } from './URL';

export const RoomsContext = createContext();

export function RoomsProvider({ children }) {
  const [rooms, setRooms] = useState([]);
  const [playerName, setPlayerName] = useState(localStorage.getItem('playerName') || '');

  // src/RoomsContext.js
const fetchRooms = async () => {
  try {
    const res = await fetch(`${url}/rooms`);
    const data = await res.json();

    // Safety Check: Ensure data is an array before setting state
    if (Array.isArray(data)) {
      setRooms(data);
    } else {
      console.error("Backend did not return an array:", data);
      setRooms([]); // Fallback to empty array to prevent .find() crashes
    }
  } catch (err) {
    console.error("Connection error:", err);
    setRooms([]); 
  }
};

  // Single polling source for the whole app
  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 1500);
    return () => clearInterval(interval);
  }, [fetchRooms]);

  const updatePlayerName = (name) => {
    setPlayerName(name);
    localStorage.setItem('playerName', name);
  };

  const createRoom = async (name) => {
    updatePlayerName(name); // Save name first
    const res = await fetch(`${url}/rooms`, { method: 'POST' });
    const newRoom = await res.json();
    // The backend creates an empty room; now we join it
    return await joinRoom(newRoom.id, name);
  };

  const joinRoom = async (roomId, name) => {
    updatePlayerName(name); // Ensure name is synced
    const res = await fetch(`${url}/rooms/${roomId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName: name })
    });
    const updatedRoom = await res.json();
    await fetchRooms(); 
    return updatedRoom.id;
  };

  const leaveRoom = async (roomId) => {
    await fetch(`${url}/rooms/${roomId}/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName })
    });
    await fetchRooms();
  };
    const startGame = async (roomId) => {
      await fetch(`${url}/rooms/${roomId}/start`, { method: 'POST' });
      await fetchRooms(); // Refresh state immediately
    };

    // Update the return value to include startGame
    return (
      <RoomsContext.Provider value={{ rooms, playerName, createRoom, joinRoom, leaveRoom, fetchRooms, startGame }}>
        {children}
      </RoomsContext.Provider>
    );
}