import { useParams, useNavigate } from 'react-router-dom';
import { useContext, useMemo,useEffect } from 'react';
import { RoomsContext } from './RoomsContext';
import './components/App.css';

function RoomPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { rooms, leaveRoom,startGame } = useContext(RoomsContext);


  const room = useMemo(() => {
    if (!Array.isArray(rooms)) return null; 
    return rooms.find(r => r.id === parseInt(id));
  }, [rooms, id]);

  const handleLeave = async () => {
    await leaveRoom(parseInt(id));
    navigate('/');
  };

  useEffect(() => {

  if (room && room.status === 'started') {
    navigate(`/mafia/${room.id}`);
  }
}, [room, navigate]);

  const handleStart = () => {
    startGame(room.id);
  };

  if (!room) {
    return (
      <div className="App">
        <div className="content">
          <h2>Room not found</h2>
          <button onClick={() => navigate('/')}>Back to Lobby</button>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <div className="content">
        <h2 className="title">Room {room.id}</h2>
        <h3>Players in Lobby:</h3>
        <div className="player-list">
          {room.players.map((player, i) => (
            <div key={i} className="room-row">
              <span>{player}</span>
              {/* Optional: Add a "you" tag */}
              {player === localStorage.getItem('playerName') && <small> (You)</small>}
            </div>
          ))}
        </div>

        <div style={{ marginTop: '20px' }}>
          <button onClick={handleLeave} className="room-button leave-button">Leave Room</button>
          <button className='room-button' onClick={handleStart} disabled={room.players.length < 3}>
            Start Game
          </button>
        </div>
      </div>
    </div>
  );
}

export default RoomPage;