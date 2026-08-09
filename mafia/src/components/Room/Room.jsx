import { useState, useEffect } from 'react'
import './Room.css'
import Game from '../Game/Game.jsx'

const API_BASE_URL = 'https://mafiaback.onrender.com'

function Room({ room, playerName, isHost, onRoomUpdated, onLeave }) {
  const [matchStarted, setMatchStarted] = useState(room.started)

  useEffect(() => {
    if (room.started) {
      setMatchStarted(true)
      return
    }

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/rooms/${room._id}`, {
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
      const response = await fetch(`${API_BASE_URL}/rooms/${room._id}/start`, {
        credentials: 'include',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ hostName: room.host })
      })

      if (!response.ok) {
        const body = await response.json()
        throw new Error(body.error || 'Не удалось начать игру')
      }

      const updatedRoom = await response.json()
      onRoomUpdated(updatedRoom)
      setMatchStarted(true)
    } catch (err) {
      console.error(err)
      alert(err.message || 'Не удалось начать игру')
    }
  }

  const leaveRoom = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/rooms/${room._id}/leave`, {
        credentials: 'include',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: playerName })
      })

      if (!response.ok) {
        const body = await response.json()
        throw new Error(body.error || 'Не удалось покинуть комнату')
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
      alert(err.message || 'Не удалось покинуть комнату')
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
          <p className="room-host">Хост: {room.host}</p>
          <p className="room-player">Вы: {playerName} {isHost ? '(хост)' : ''}</p>
        </div>
        <button className="leave-button" onClick={leaveRoom}>Выйти</button>
      </div>

      <div className="room-status">
        <span className={room.started ? 'status-started' : 'status-waiting'}>
          {room.started ? 'Игра началась' : 'Ожидание игроков'}
        </span>
      </div>

      <div className="player-list-card">
        <h3>Игроки</h3>
        <ul>
          {room.players.map((player, index) => (
            <li key={`${player.name}-${index}`}>
              {player.name}
              {player.name === room.host ? ' (хост)' : ''}
            </li>
          ))}
        </ul>
      </div>

      {!room.started && isHost && (
        <button className="start-button" onClick={startMatch}>
          Начать игру
        </button>
      )}
    </div>
  )
}

export default Room
