import { useState, useEffect } from 'react'
import './Menu.css'

const API_BASE_URL = 'https://mafiaback.onrender.com'

function Menu({ onRoomEnter }) {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [joinModalOpen, setJoinModalOpen] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [hostName, setHostName] = useState('')
  const [joinName, setJoinName] = useState('')
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    async function loadRooms() {
      try {
        const response = await fetch(`${API_BASE_URL}/rooms`, {
          credentials: 'include'
        })
        if (!response.ok) {
          throw new Error(`Не удалось загрузить комнаты: ${response.status}`)
        }
        const data = await response.json()
        setRooms(data)
      } catch (err) {
        setError(err.message || 'Не удалось загрузить комнаты')
      } finally {
        setLoading(false)
      }
    }

    loadRooms()
  }, [])

  const openCreateModal = () => {
    setError(null)
    setRoomName('')
    setHostName('')
    setCreateModalOpen(true)
  }

  const closeCreateModal = () => {
    setCreateModalOpen(false)
    setRoomName('')
    setHostName('')
  }

  const openJoinModal = (room) => {
    setError(null)
    setSelectedRoom(room)
    setJoinName('')
    setJoinModalOpen(true)
  }

  const closeJoinModal = () => {
    setJoinModalOpen(false)
    setSelectedRoom(null)
    setJoinName('')
  }

  const handleRoomSubmit = async (event) => {
    event.preventDefault()
    if (!roomName.trim() || !hostName.trim()) {
      setError('Название комнаты и ваше имя обязательны')
      return
    }

    setCreating(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/rooms`, {
        credentials: 'include',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: roomName.trim(), hostName: hostName.trim() })
      })

      if (!response.ok) {
        const body = await response.json()
        throw new Error(body.error || `Не удалось создать комнату: ${response.status}`)
      }

      const data = await response.json()
      setRooms((prevRooms) => [data, ...prevRooms])
      closeCreateModal()
      onRoomEnter(data, hostName.trim(), true)
    } catch (err) {
      setError(err.message || 'Не удалось создать комнату')
    } finally {
      setCreating(false)
    }
  }

  const handleJoinSubmit = async (event) => {
    event.preventDefault()
    if (!joinName.trim()) {
      setError('Для входа в комнату нужно указать имя')
      return
    }

    setJoining(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/rooms/${selectedRoom._id}/join`, {
        credentials: 'include',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: joinName.trim() })
      })

      if (!response.ok) {
        const body = await response.json()
        throw new Error(body.error || `Не удалось войти в комнату: ${response.status}`)
      }

      const data = await response.json()
      setRooms((prevRooms) => prevRooms.map((room) => room._id === data._id ? data : room))
      closeJoinModal()
      onRoomEnter(data, joinName.trim(), false)
    } catch (err) {
      setError(err.message || 'Не удалось войти в комнату')
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className="list">
      <div className="list-header">
        <h2>Комнаты</h2>
        <button className="create-room-button" onClick={openCreateModal}>Создать комнату</button>
      </div>

      {loading ? (
        <p>Загрузка комнат...</p>
      ) : error ? (
        <p className="error">{error}</p>
      ) : rooms.length === 0 ? (
        <p>Комнат пока нет.</p>
      ) : (
        <ul className="room-list">
          {rooms.map((room) => (
            <li key={room._id ?? room.id} className="room-item">
              <div>
                <strong>{room.name}</strong>
                <div className="room-meta">Хост: {room.host}</div>
                <div className="room-meta">Игроки: {room.players?.length ?? 0}</div>
                <div className="room-meta">Статус: {room.started ? 'Игра началась' : 'Ожидание'}</div>
              </div>
              
              {/* Only render the join button if the game HAS NOT started */}
              {!room.started && (
                <button className="join-room-button" onClick={() => openJoinModal(room)}>
                  Войти
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {createModalOpen && (
        <div className="modal-overlay" onClick={closeCreateModal}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <h3>Создать комнату</h3>
            <form onSubmit={handleRoomSubmit} className="modal-form">
              <label htmlFor="roomName">Название комнаты</label>
              <input
                id="roomName"
                type="text"
                value={roomName}
                onChange={(event) => setRoomName(event.target.value)}
                placeholder="Введите название комнаты"
                autoFocus
              />
              <label htmlFor="hostName">Ваше имя</label>
              <input
                id="hostName"
                type="text"
                value={hostName}
                onChange={(event) => setHostName(event.target.value)}
                placeholder="Введите имя хоста"
              />
              <div className="modal-actions">
                <button type="button" className="secondary" onClick={closeCreateModal}>
                  Отмена
                </button>
                <button type="submit" disabled={creating}>
                  {creating ? 'Создание…' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {joinModalOpen && selectedRoom && (
        <div className="modal-overlay" onClick={closeJoinModal}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <h3>Войти в {selectedRoom.name}</h3>
            <form onSubmit={handleJoinSubmit} className="modal-form">
              <label htmlFor="joinName">Ваше имя</label>
              <input
                id="joinName"
                type="text"
                value={joinName}
                onChange={(event) => setJoinName(event.target.value)}
                placeholder="Введите ваше имя"
                autoFocus
              />
              <div className="modal-actions">
                <button type="button" className="secondary" onClick={closeJoinModal}>
                  Отмена
                </button>
                <button type="submit" disabled={joining}>
                  {joining ? 'Входим…' : 'Войти'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Menu
