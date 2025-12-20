import { useParams } from 'react-router-dom';
import { useContext } from 'react';
import { RoomsContext } from '../RoomsContext';

function Mafia() {
  const { id } = useParams();
  const { rooms, playerName } = useContext(RoomsContext); // Use global playerName
  
  const room = rooms.find(r => r.id === parseInt(id));

  if (!room || !room.roles) return <div>Loading game...</div>;

  const myRole = room.roles[playerName]; // Look up role by name

  return (
    <div className="App">
      <div className="content">
        <h2 className="title">Mafia Game: Room {id}</h2>
        <div className="role-card">
          <h3>Your Role: <span className={`role-${myRole}`}>{myRole}</span></h3>
          <p>
            {myRole === 'Mafia' && "Goal: Eliminate the villagers without being caught."}
            {myRole === 'Detective' && "Goal: Identify the Mafia members."}
            {myRole === 'Villager' && "Goal: Find and vote out the Mafia."}
          </p>
        </div>

        <h4>Players in this game:</h4>
        {room.players.map((p, i) => (
          <div key={i} className="room-row">
            <span>{p} {p === playerName ? "(You)" : ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Mafia;