import { useState, useEffect } from 'react'
import './App.css'
import Menu from './components/Menu/Menu.jsx'
import Room from './components/Room/Room.jsx'

const STORAGE_KEY = 'mafiaRoomState'
const API_BASE_URL = 'https://mafiaback.onrender.com'

function App() {
  const [activeRoom, setActiveRoom] = useState(null)
  const [playerName, setPlayerName] = useState('')
  const [isHost, setIsHost] = useState(false)
  const [sessionLoading, setSessionLoading] = useState(true)

  const saveRoomState = (room, name, host) => {
    const payload = { room, playerName: name, isHost: host }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }

  const clearRoomState = () => {
    localStorage.removeItem(STORAGE_KEY)
  }

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (parsed?.room && parsed?.playerName) {
          setActiveRoom(parsed.room)
          setPlayerName(parsed.playerName)
          setIsHost(!!parsed.isHost)
          setSessionLoading(false)
          return
        }
      } catch (err) {
        localStorage.removeItem(STORAGE_KEY)
      }
    }

    async function restoreSession() {
      try {
        const response = await fetch(`${API_BASE_URL}/session/room`, {
          credentials: 'include'
        })
        if (!response.ok) {
          return
        }

        const body = await response.json()
        if (body.room) {
          setActiveRoom(body.room)
          setPlayerName(body.playerName || '')
          setIsHost(!!body.isHost)
          saveRoomState(body.room, body.playerName || '', !!body.isHost)
        }
      } catch (err) {
        console.error('Session restore failed:', err)
      } finally {
        setSessionLoading(false)
      }
    }

    restoreSession()
  }, [])

  const handleRoomEnter = (room, name, host) => {
    setActiveRoom(room)
    setPlayerName(name)
    setIsHost(host)
    saveRoomState(room, name, host)
  }

  const handleRoomUpdate = (room) => {
    setActiveRoom(room)
    saveRoomState(room, playerName, isHost)
  }

  const leaveRoom = () => {
    setActiveRoom(null)
    setPlayerName('')
    setIsHost(false)
    clearRoomState()
  }

  if (sessionLoading) {
    return <div className="mafia">Загрузка сессии...</div>
  }

  return (
    <div className="mafia">
      {activeRoom ? (
        <Room
          room={activeRoom}
          playerName={playerName}
          isHost={isHost}
          onRoomUpdated={handleRoomUpdate}
          onLeave={leaveRoom}
        />
      ) : (
        <Menu onRoomEnter={handleRoomEnter} />
      )}
    </div>
  )
}

export default App
