import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { RoomsContext } from '../RoomsContext';
import './App.css';

function App() {
  const { rooms, createRoom, joinRoom } = useContext(RoomsContext);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inputName, setInputName] = useState(''); // Local state for the input field
  const [currentRoomId, setCurrentRoomId] = useState(null);
  const navigate = useNavigate();

  const handleCreateRoom = async () => {
    if (!inputName.trim()) return;
    const roomId = await createRoom(inputName);
    setShowRoomModal(false);
    navigate(`/rooms/${roomId}`);
  };

  const openJoinModal = (id) => {
    setCurrentRoomId(id);
    setShowJoinModal(true);
  };

  const handleJoinRoom = async () => {
    if (!inputName.trim()) return;
    await joinRoom(currentRoomId, inputName);
    setShowJoinModal(false);
    navigate(`/rooms/${currentRoomId}`);
  };

  return (
    <div className="App">
      <div className="content">
        <h2 className="title">
          Lobby
          <button onClick={() => setShowRoomModal(true)} className="ButtonCreate">
            Create Room
          </button>
        </h2>

        <div className="room-list">
          {rooms.length === 0 && <p>No rooms available. Create one!</p>}
          {rooms.map(room => (
            <div key={room.id} className="room-row">
              <span><strong>Room {room.id}</strong></span>
              <span>{room.players.length} Players</span>
              <button onClick={() => openJoinModal(room.id)}>Join</button>
            </div>
          ))}
        </div>
      </div>

      {/* Unified Modal Logic */}
      {(showRoomModal || showJoinModal) && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>{showRoomModal ? 'Create Room' : `Join Room ${currentRoomId}`}</h3>
            <input
              type="text"
              placeholder="Enter your name"
              value={inputName}
              onChange={e => setInputName(e.target.value)}
              autoFocus
            />
            <div className="modal-actions">
              <button onClick={() => { setShowRoomModal(false); setShowJoinModal(false); }}>Cancel</button>
              <button onClick={showRoomModal ? handleCreateRoom : handleJoinRoom}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;