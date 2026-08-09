import { useState, useEffect } from 'react'
import './Room.css'
import Game from '../Game/Game.jsx'

function Room({ room, playerName, isHost, onRoomUpdated, onLeave }) {
  const [matchStarted, setMatchStarted] = useState(room.started)

  useEffect(() => {
    if (room.started) {
      setMatchStarted(true)
      return
    }

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:5000/rooms/${room._id}`, {
          credentials: 'include'
        })

        if (!response.ok) {
          return
        }

        const updatedRoom = await response.json()
        if (updatedRoom.started !== room.started || updatedRoom.players.length !== room.players.length) {
          onRoomUpdated(updatedRoom)
        }

        if (updatedRoom.started) {
          setMatchStarted(true)
        }
      } catch (err) {
        console.error('Room sync failed:', err)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [room, onRoomUpdated])

  const startMatch = async () => {
    try {
      const response = await fetch(`http://localhost:5000/rooms/${room._id}/start`, {
        credentials: 'include',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ hostName: room.host })
      })

      if (!response.ok) {
        const body = await response.json()
        throw new Error(body.error || 'Failed to start the match')
      }

      const updatedRoom = await response.json()
      onRoomUpdated(updatedRoom)
      setMatchStarted(true)
    } catch (err) {
      console.error(err)
      alert(err.message || 'Unable to start match')
    }
  }

  const leaveRoom = async () => {
    try {
      const response = await fetch(`http://localhost:5000/rooms/${room._id}/leave`, {
        credentials: 'include',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: playerName })
      })

      if (!response.ok) {
        const body = await response.json()
        throw new Error(body.error || 'Failed to leave room')
      }

      const data = await response.json()
      if (data.deleted) {
        onLeave()
        return
      }

      onRoomUpdated(data.room)
      onLeave()
    } catch (err) {
      console.error(err)
      alert(err.message || 'Unable to leave room')
    }
  }

  if (matchStarted || room.started) {
    return <Game room={room} playerName={playerName} isHost={isHost} onLeave={leaveRoom} />
  }

  return (
    <div className="room-page">
      <div className="room-header">
        <div>
          <h2>{room.name}</h2>
          <p className="room-host">Host: {room.host}</p>
          <p className="room-player">You: {playerName} {isHost ? '(Host)' : ''}</p>
        </div>
        <button className="leave-button" onClick={leaveRoom}>Leave</button>
      </div>

      <div className="room-status">
        <span className={room.started ? 'status-started' : 'status-waiting'}>
          {room.started ? 'Match started' : 'Waiting for players'}
        </span>
      </div>

      <div className="player-list-card">
        <h3>Players</h3>
        <ul>
          {room.players.map((player, index) => (
            <li key={`${player.name}-${index}`}>
              {player.name}
              {player.name === room.host ? ' (host)' : ''}
            </li>
          ))}
        </ul>
      </div>

      {!room.started && isHost && (
        <button className="start-button" onClick={startMatch}>
          Start Match
        </button>
      )}
    </div>
  )
}

export default Room
