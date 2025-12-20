// src/RoomPage.js
import { useParams, useNavigate } from 'react-router-dom';
import { useContext, useEffect, useState } from 'react';
import { RoomsContext } from './RoomsContext';
import './components/App.css';

function RoomPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { rooms, playerName, leaveRoom, fetchRooms } = useContext(RoomsContext);
  const [room, setRoom] = useState(null);

  // Poll and update room every 1.5s
  useEffect(() => {
    const update = async () => {
      await fetchRooms();
      const currentRoom = rooms.find(r => r.id === parseInt(id));
      setRoom(currentRoom);
    };

    update(); // initial load
    const interval = setInterval(update, 1500);
    return () => clearInterval(interval);
  }, [rooms, id, fetchRooms]);

  if (!room) return <h2 className="App">Room not found</h2>;

  const handleLeave = async () => {
    await leaveRoom(room.id, playerName);
    navigate('/'); // go back to room list
  };

  return (
    <div className="App">
      <div className="content">
        <h2 className="title">Room {room.id}</h2>

        <h3>Players:</h3>
        {room.players.length === 0 && <p>No players yet.</p>}
        {room.players.map((player, i) => (
          <div key={i} className="room-row">
            <span>{player}</span>
          </div>
        ))}

        <div style={{ marginTop: '10px' }}>
          <button onClick={handleLeave}>Leave Room</button>
          <button style={{ marginLeft: '10px' }}>Start</button>
        </div>
      </div>
    </div>
  );
}

export default RoomPage;
