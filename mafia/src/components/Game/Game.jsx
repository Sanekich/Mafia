import { useState, useEffect, useRef } from 'react'
import './Game.css'

const API_BASE = 'https://mafiaback.onrender.com'
const POLL_MS = 1500

const ROLE_LABELS = {
  Mafia: 'Мафия',
  Cop: 'Шериф',
  Doctor: 'Доктор',
  Citizen: 'Мирный'
}

const ANNOUNCE_TEXT = {
  MafiaAnnounce: 'Мафия выбирает',
  CopAnnounce: 'Шериф проверяет',
  DoctorAnnounce: 'Доктор лечит'
}

const NIGHT_PHASES = new Set([
  'RoleReveal',
  'MafiaAnnounce',
  'MafiaAction',
  'CopAnnounce',
  'CopAction',
  'DoctorAnnounce',
  'DoctorAction'
])

function Game({ room, playerName, isHost, onLeave }) {
  const [state, setState] = useState(null)
  const [countdown, setCountdown] = useState(0)
  const [error, setError] = useState('')
  const stateRef = useRef(null)

  const fetchState = async () => {
    try {
      const response = await fetch(`${API_BASE}/rooms/${room._id}/game`, {
        credentials: 'include'
      })
      if (!response.ok) return
      const data = await response.json()
      stateRef.current = data
      setState(data)
      setCountdown(data.countdown)
    } catch (err) {
      console.error('Game sync failed:', err)
    }
  }

  useEffect(() => {
    fetchState()
    const interval = setInterval(fetchState, POLL_MS)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room._id])

  // Tick the displayed countdown once a second between polls so it doesn't
  // just jump in 1.5s steps; the next poll resyncs it to the server's value.
  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(tick)
  }, [])

  const sendAction = async (path, target) => {
    try {
      const response = await fetch(`${API_BASE}/rooms/${room._id}/game/${path}`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target })
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Действие не удалось.')
        return
      }
      setError('')
      stateRef.current = data
      setState(data)
      setCountdown(data.countdown)
    } catch (err) {
      console.error('Game action failed:', err)
    }
  }

  const leaveRoom = async () => {
    try {
      const response = await fetch(`${API_BASE}/rooms/${room._id}/leave`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: playerName })
      })
      await response.json()
      onLeave()
    } catch (err) {
      console.error(err)
      onLeave()
    }
  }

  if (!state) {
    return (
      <div className="game-page">
        <p className="help-text">Загрузка игры...</p>
      </div>
    )
  }

  const isNight = NIGHT_PHASES.has(state.phase)
  const myRole = state.myRole
  const alivePlayers = state.players.filter((player) => player.alive)
  const currentPlayerAlive = alivePlayers.some((player) => player.name === playerName)

  const renderNightScreen = () => {
    const roleTag = <div className="night-role-badge">Вы {ROLE_LABELS[myRole] || myRole}</div>

    if (state.phase === 'RoleReveal') {
      return (
        <div className="night-screen">
          <div className="night-title">Вы {ROLE_LABELS[myRole] || myRole}</div>
          <div className="night-subtitle">Ночь {state.nightNumber}</div>
        </div>
      )
    }

    if (['MafiaAnnounce', 'CopAnnounce', 'DoctorAnnounce'].includes(state.phase)) {
      return (
        <div className="night-screen">
          <div className="night-title">{ANNOUNCE_TEXT[state.phase]}</div>
          {roleTag}
        </div>
      )
    }

    if (state.phase === 'MafiaAction') {
      if (myRole !== 'Mafia' || !currentPlayerAlive) {
        return (
          <div className="night-screen">
            <div className="night-title">Мафия выбирает</div>
            <div className="night-countdown">Осталось: {countdown}с</div>
            {roleTag}
          </div>
        )
      }
      const options = state.players.filter((player) => player.alive && player.name !== playerName)
      return (
        <div className="night-screen">
          <div className="night-title">Выберите жертву</div>
          <div className="night-countdown">Осталось: {countdown}с</div>
          <div className="night-target-list">
            {options.map((target) => (
              <button
                key={target.name}
                className={`night-target-button ${state.myMafiaVote === target.name ? 'selected' : ''}`}
                onClick={() => sendAction('mafia-vote', target.name)}>
                <span>{target.name}</span>
                <span className="night-target-count">
                  Убить ({(state.mafiaTally && state.mafiaTally[target.name]) || 0}/{state.mafiaCount})
                </span>
              </button>
            ))}
          </div>
          {roleTag}
        </div>
      )
    }

    if (state.phase === 'CopAction') {
      if (myRole !== 'Cop' || !currentPlayerAlive) {
        return (
          <div className="night-screen">
            <div className="night-title">Шериф проверяет</div>
            <div className="night-countdown">Осталось: {countdown}с</div>
            {roleTag}
          </div>
        )
      }
      const options = state.players.filter((player) => player.alive && player.name !== playerName)
      return (
        <div className="night-screen">
          <div className="night-title">Кого проверить?</div>
          <div className="night-countdown">Осталось: {countdown}с</div>
          <div className="night-target-list">
            {options.map((target) => (
              <button
                key={target.name}
                className={`night-target-button ${state.myCopTarget === target.name ? 'selected' : ''}`}
                onClick={() => sendAction('cop-target', target.name)}>
                <span>{target.name}</span>
              </button>
            ))}
          </div>
          {roleTag}
        </div>
      )
    }

    if (state.phase === 'DoctorAction') {
      if (myRole !== 'Doctor' || !currentPlayerAlive) {
        return (
          <div className="night-screen">
            <div className="night-title">Доктор лечит</div>
            <div className="night-countdown">Осталось: {countdown}с</div>
            {roleTag}
          </div>
        )
      }
      const options = state.players.filter((player) => player.alive && player.name !== playerName)
      return (
        <div className="night-screen">
          <div className="night-title">Кого защитить?</div>
          <div className="night-countdown">Осталось: {countdown}с</div>
          <div className="night-target-list">
            {options.map((target) => (
              <button
                key={target.name}
                className={`night-target-button ${state.myDoctorTarget === target.name ? 'selected' : ''}`}
                onClick={() => sendAction('doctor-target', target.name)}>
                <span>{target.name}</span>
              </button>
            ))}
          </div>
          {roleTag}
        </div>
      )
    }

    return null
  }

  return (
    <div className={`game-page ${isNight ? 'is-night' : ''}`}>
      <div className="game-header">
        <div>
          <h2>{room.name} — Игра в мафию</h2>
          <p className="game-subtitle">Ночь {state.nightNumber} · День {state.dayNumber}</p>
        </div>
        <button className="leave-button" onClick={leaveRoom}>Выйти из лобби</button>
      </div>

      {error && <p className="help-text" style={{ color: '#dc2626' }}>{error}</p>}

      {isNight ? (
        renderNightScreen()
      ) : state.winner ? (
        <div className="game-result-card">
          <h3>Игра завершена</h3>
          <p>{state.winner}</p>
          <button className="game-button" onClick={leaveRoom}>Выйти из лобби</button>
        </div>
      ) : (
        <>
          <div className="player-list-card">
            <h3>Игроки</h3>
            <ul>
              {state.players.map((player) => (
                <li
                  key={player.name}
                  className={`${player.name === playerName ? 'current-player' : ''} ${player.alive ? '' : 'eliminated-player'}`}>
                  {player.name}
                  {player.name === room.host ? ' (хост)' : ''}
                  {player.name === playerName ? ' — Вы' : ''}
                  {player.name === playerName ? ` — ${ROLE_LABELS[myRole] || myRole}` : ''}
                  {!player.alive ? ' (мёртв)' : ''}
                </li>
              ))}
            </ul>
          </div>

          {state.phase === 'Day' && (
            <div className="phase-card">
              <h3>День наступил</h3>
              <p>{state.lastKill ? `${state.lastKill} был убит прошлой ночью.` : 'Прошлой ночью никто не был убит.'}</p>
              {myRole === 'Cop' && state.inspectResult && (
                <p>
                  {state.inspectResult.target} {state.inspectResult.isMafia ? 'мафия' : 'не мафия'}.
                </p>
              )}
              <p className="help-text">Голосование начнётся автоматически через {countdown}с.</p>
            </div>
          )}

          {state.phase === 'Vote' && (
            <div className="phase-card">
              <h3>Голосование за казнь</h3>
              <p>Выберите игрока или пропустите. Таймер: {countdown}с.</p>
              <div className="target-grid">
                {alivePlayers
                  .filter((player) => player.name !== playerName)
                  .map((target) => (
                    <button
                      key={target.name}
                      className={`target-button ${state.myVoteTarget === target.name ? 'selected' : ''}`}
                      onClick={() => sendAction('vote', target.name)}>
                      {target.name}
                    </button>
                  ))}
                <button
                  className={`target-button ${state.myVoteTarget === 'Skip' ? 'selected' : ''}`}
                  onClick={() => sendAction('vote', 'Skip')}>
                  Пропустить
                </button>
              </div>
            </div>
          )}

          {state.voteResult && (
            <div className="phase-card">
              <h3>Результат голосования</h3>
              <p>{state.voteResult}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Game