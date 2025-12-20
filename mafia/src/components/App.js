import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { RoomsContext } from '../RoomsContext';
import './App.css';

function App() {
  const { rooms, createRoom, joinRoom } = useContext(RoomsContext);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [currentRoomId, setCurrentRoomId] = useState(null);
  const navigate = useNavigate();

  // Create room (name = id)
  const handleCreateRoom = async () => {
    if (!playerName.trim()) return;
    const id = await createRoom(id => id); // backend will assign id
    await joinRoom(id, playerName);
    setPlayerName('');
    setShowRoomModal(false);
    navigate(`/rooms/${id}`);
  };

  // Open join modal
  const openJoinModal = (id) => {
    setCurrentRoomId(id);
    setShowJoinModal(true);
  };

  // Join room after entering name
  const handleJoinRoom = async () => {
    if (!playerName.trim()) return;
    await joinRoom(currentRoomId, playerName);
    setPlayerName('');
    setShowJoinModal(false);
    navigate(`/rooms/${currentRoomId}`);
  };

  return (
    <div className="App">
      <div className="content">
        <h2 className="title">
          Rooms
          <button onClick={() => setShowRoomModal(true)} className="ButtonCreate">
            Create Room
          </button>
        </h2>

        <div>
          {rooms.length === 0 && <p>No rooms yet.</p>}
          {rooms.map(room => (
            <div key={room.id} className="room-row">
              <span>{room.id}</span> {/* room name = id */}
              <span>{room.players.length} players</span>
              <button onClick={() => openJoinModal(room.id)}>Join</button>
            </div>
          ))}
        </div>
      </div>

      {/* Modal for creating room */}
      {showRoomModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Enter your name to create room</h3>
            <input
              type="text"
              placeholder="Your name"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
            />
            <div className="modal-actions">
              <button onClick={() => setShowRoomModal(false)}>Cancel</button>
              <button onClick={handleCreateRoom}>Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for joining room */}
      {showJoinModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Enter your name to join room {currentRoomId}</h3>
            <input
              type="text"
              placeholder="Your name"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
            />
            <div className="modal-actions">
              <button onClick={() => setShowJoinModal(false)}>Cancel</button>
              <button onClick={handleJoinRoom}>Join</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
