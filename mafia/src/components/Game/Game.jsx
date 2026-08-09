import { useState, useEffect, useMemo } from 'react'
import './Game.css'

const STORAGE_KEY_PREFIX = 'mafiaGameState_'

const ROLES = ['Mafia', 'Cop', 'Doctor', 'Citizen']

const PHASE_LABELS = {
  Reveal: 'Подготовка',
  Night: 'Ночная фаза',
  Day: 'Дневная фаза',
  Vote: 'Голосование',
  Ended: 'Игра завершена'
}

const ROLE_LABELS = {
  Mafia: 'Мафия',
  Cop: 'Комиссар',
  Doctor: 'Доктор',
  Citizen: 'Мирный'
}

const PHASE_CLASS = {
  Reveal: 'phase-reveal',
  Night: 'phase-night',
  Day: 'phase-day',
  Vote: 'phase-vote',
  Ended: 'phase-ended'
}

function Game({ room, playerName, isHost, onLeave }) {
  const [role, setRole] = useState('')
  const [playersWithRoles, setPlayersWithRoles] = useState([])
  const [gameState, setGameState] = useState({
    phase: 'Reveal',
    nightNumber: 1,
    dayNumber: 0,
    mafiaTarget: null,
    copTarget: null,
    doctorTarget: null,
    inspectResult: null,
    lastKill: null,
    voteTarget: null,
    voteResult: null,
    eliminated: [],
    countdown: 60
  })

  const storageKey = `${STORAGE_KEY_PREFIX}${room._id}`

  useEffect(() => {
    if (!room) return

    const stored = localStorage.getItem(storageKey)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (parsed?.players?.length === room.players.length) {
          setPlayersWithRoles(parsed.players)
          const me = parsed.players.find((p) => p.name === playerName)
          setRole(me?.role || 'Citizen')
          setGameState(parsed.gameState || gameState)
          return
        }
      } catch (err) {
        localStorage.removeItem(storageKey)
      }
    }

    const assigned = assignRoles(room.players.map((player) => player.name))
    const me = assigned.find((p) => p.name === playerName)
    setPlayersWithRoles(assigned)
    setRole(me?.role || 'Citizen')
    saveState({ players: assigned, gameState })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, playerName])

  useEffect(() => {
    saveState({ players: playersWithRoles, gameState })
  }, [playersWithRoles, gameState])

  useEffect(() => {
    if (gameState.phase !== 'Vote') {
      return
    }

    const timer = setInterval(() => {
      setGameState((prev) => {
        if (prev.countdown <= 1) {
          clearInterval(timer)
          return resolveVote(prev)
        }
        return { ...prev, countdown: prev.countdown - 1 }
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [gameState.phase])

  const saveState = (payload) => {
    localStorage.setItem(storageKey, JSON.stringify(payload))
  }

  const assignRoles = (names) => {
    const players = [...names]
    const shuffled = players.sort(() => Math.random() - 0.5)
    const mafiaCount = Math.max(1, Math.floor(names.length / 4))
    const result = []

    const mafia = shuffled.splice(0, mafiaCount)
    mafia.forEach((name) => result.push({ name, role: 'Mafia' }))

    if (shuffled.length > 0) {
      const cop = shuffled.shift()
      result.push({ name: cop, role: 'Cop' })
    }
    if (shuffled.length > 0) {
      const doctor = shuffled.shift()
      result.push({ name: doctor, role: 'Doctor' })
    }
    shuffled.forEach((name) => result.push({ name, role: 'Citizen' }))
    return result.sort((a, b) => a.name.localeCompare(b.name))
  }

  const alivePlayers = useMemo(
    () => playersWithRoles.filter((player) => !gameState.eliminated.includes(player.name)),
    [playersWithRoles, gameState.eliminated]
  )

  const mafiaPlayers = alivePlayers.filter((player) => player.role === 'Mafia')
  const copPlayer = alivePlayers.find((player) => player.role === 'Cop')
  const doctorPlayer = alivePlayers.find((player) => player.role === 'Doctor')
  const targets = alivePlayers.filter((player) => player.name !== playerName)
  const aliveNames = alivePlayers.map((player) => player.name)

  const currentPlayerAlive = aliveNames.includes(playerName)

  const updateState = (patch) => {
    setGameState((prev) => ({ ...prev, ...patch }))
  }

  const resolveNight = () => {
    const kill = gameState.mafiaTarget
    const protect = gameState.doctorTarget
    const inspect = gameState.copTarget
    const isKilled = kill && kill !== protect ? kill : null
    const nextEliminated = isKilled ? [...new Set([...gameState.eliminated, isKilled])] : gameState.eliminated
    const inspectResult = inspect
      ? {
          target: inspect,
          role: playersWithRoles.find((player) => player.name === inspect)?.role || 'Unknown',
          isMafia: playersWithRoles.find((player) => player.name === inspect)?.role === 'Mafia'
        }
      : null

    return {
      ...gameState,
      phase: 'Day',
      dayNumber: gameState.dayNumber + 1,
      lastKill: isKilled,
      inspectResult,
      voteResult: null,
      voteTarget: null,
      countdown: 60,
      mafiaTarget: null,
      copTarget: null,
      doctorTarget: null,
      eliminated: nextEliminated
    }
  }

  const resolveVote = (state) => {
    const voteTarget = state.voteTarget
    const votedOut = voteTarget && voteTarget !== 'Skip' ? voteTarget : null
    const nextEliminated = votedOut ? [...new Set([...state.eliminated, votedOut])] : state.eliminated
    const winner = computeWinner(alivePlayers, nextEliminated)

    return {
      ...state,
      phase: winner ? 'Ended' : 'Reveal',
      nightNumber: winner ? state.nightNumber : state.nightNumber + 1,
      dayNumber: winner ? state.dayNumber : state.dayNumber,
      voteResult: votedOut ? `${votedOut} был исключён голосованием.` : 'Никто не был исключён.',
      eliminated: nextEliminated,
      countdown: 60,
      playerChoice: null,
      mafiaTarget: null,
      copTarget: null,
      doctorTarget: null,
      lastKill: null,
      inspectResult: null,
      winner
    }
  }

  const computeWinner = (alive, eliminated) => {
    const aliveNow = alive.filter((player) => !eliminated.includes(player.name))
    const mafiaAlive = aliveNow.filter((player) => player.role === 'Mafia').length
    const nonMafiaAlive = aliveNow.length - mafiaAlive

    if (mafiaAlive === 0) {
      return 'Мирные победили!'
    }
    if (mafiaAlive >= nonMafiaAlive) {
      return 'Мафия победила!'
    }
    return null
  }

  const startNight = () => {
    updateState({ phase: 'Night', voteResult: null, countdown: 60 })
  }

  const startVote = () => {
    updateState({ phase: 'Vote', countdown: 60 })
  }

  const selectTarget = (target) => {
    if (!currentPlayerAlive) return

    if (role === 'Mafia') {
      updateState({ mafiaTarget: target })
    }
    if (role === 'Cop') {
      updateState({ copTarget: target })
    }
    if (role === 'Doctor') {
      updateState({ doctorTarget: target })
    }
  }

  const selectVote = (target) => {
    if (!currentPlayerAlive) return
    updateState({ voteTarget: target })
  }

  const killedPlayer = gameState.lastKill
  const inspectText = gameState.inspectResult
    ? `${gameState.inspectResult.target} ${gameState.inspectResult.isMafia ? 'мафия' : 'не мафия'}.`
    : null
  const winnerText = gameState.winner

  return (
    <div className="game-page">
      <div className="game-header">
        <div>
          <h2>{room.name} — Игра в мафию</h2>
          <p className="game-subtitle">Роль: <strong>{ROLE_LABELS[role] || role}</strong></p>
          <p className="game-subtitle">Ночь {gameState.nightNumber} · День {gameState.dayNumber}</p>
        </div>
        <button className="leave-button" onClick={onLeave}>Выйти из лобби</button>
      </div>

      <div className="game-status">
        <span className={`status-pill ${PHASE_CLASS[gameState.phase] || ''}`}>
          {PHASE_LABELS[gameState.phase] || gameState.phase}
        </span>
      </div>

      {winnerText ? (
        <div className="game-result-card">
          <h3>Игра завершена</h3>
          <p>{winnerText}</p>
          <button className="game-button" onClick={() => window.location.reload()}>Начать заново</button>
        </div>
      ) : (
        <>
          <div className="game-instructions">
            <p>Сейчас активен классический сценарий мафии. Следуйте своей роли и действуйте в нужную фазу.</p>
            <ul>
              <li><strong>Мафия</strong> выбирает одного игрока для устранения ночью.</li>
              <li><strong>Комиссар</strong> проверяет одного игрока каждую ночь.</li>
              <li><strong>Доктор</strong> защищает одного игрока каждую ночь.</li>
              <li><strong>Мирные</strong> голосуют днём.</li>
            </ul>
          </div>

          <div className="player-list-card">
            <h3>Игроки</h3>
            <ul>
              {playersWithRoles.map((player) => {
                const alive = !gameState.eliminated.includes(player.name)
                return (
                  <li
                    key={player.name}
                    className={`${player.name === playerName ? 'current-player' : ''} ${alive ? '' : 'eliminated-player'}`}>
                    {player.name}
                    {player.name === room.host ? ' (хост)' : ''}
                    {player.name === playerName ? ' — Вы' : ''}
                    {player.name === playerName ? ` — ${ROLE_LABELS[player.role] || player.role}` : ''}
                    {!alive ? ' (мёртв)' : ''}
                  </li>
                )
              })}
            </ul>
          </div>

          {gameState.phase === 'Reveal' && (
            <div className="phase-card">
              <h3>Ваша роль</h3>
              <p>Вы — <strong>{ROLE_LABELS[role] || role}</strong>.</p>
              <button className="game-button" onClick={startNight}>Начать ночь</button>
            </div>
          )}

          {gameState.phase === 'Night' && (
            <div className="phase-card">
              {role === 'Mafia' ? (
                <>
                  <h3>Ночное действие</h3>
                  <p>Выберите игрока для устранения.</p>
                  <div className="target-grid">
                    {targets
                      .filter((player) => player.role !== 'Mafia' && !gameState.eliminated.includes(player.name))
                      .map((target) => (
                        <button
                          key={target.name}
                          className={`target-button ${gameState.mafiaTarget === target.name ? 'selected' : ''}`}
                          onClick={() => selectTarget(target.name)}>
                          {target.name}
                        </button>
                      ))}
                  </div>
                  <button
                    className="game-button"
                    disabled={!gameState.mafiaTarget}
                    onClick={() => updateState(resolveNight())}>
                    Подтвердить решение
                  </button>
                </>
              ) : role === 'Cop' ? (
                <>
                  <h3>Ночное действие</h3>
                  <p>Проверьте одного игрока, чтобы узнать, является ли он мафией.</p>
                  <div className="target-grid">
                    {targets
                      .filter((player) => !gameState.eliminated.includes(player.name))
                      .map((target) => (
                        <button
                          key={target.name}
                          className={`target-button ${gameState.copTarget === target.name ? 'selected' : ''}`}
                          onClick={() => selectTarget(target.name)}>
                          {target.name}
                        </button>
                      ))}
                  </div>
                  <button
                    className="game-button"
                    disabled={!gameState.copTarget}
                    onClick={() => updateState(resolveNight())}>
                    Подтвердить проверку
                  </button>
                </>
              ) : role === 'Doctor' ? (
                <>
                  <h3>Ночное действие</h3>
                  <p>Выберите игрока для защиты.</p>
                  <div className="target-grid">
                    {alivePlayers
                      .filter((player) => player.name !== playerName)
                      .map((target) => (
                        <button
                          key={target.name}
                          className={`target-button ${gameState.doctorTarget === target.name ? 'selected' : ''}`}
                          onClick={() => selectTarget(target.name)}>
                          {target.name}
                        </button>
                      ))}
                  </div>
                  <button
                    className="game-button"
                    disabled={!gameState.doctorTarget}
                    onClick={() => updateState(resolveNight())}>
                    Подтвердить защиту
                  </button>
                </>
              ) : (
                <>
                  <h3>Ночное время</h3>
                  <p>Мафия решает...</p>
                  <p>Подождите, пока ночь закончится.</p>
                  <button className="game-button" onClick={() => updateState(resolveNight())}>
                    Закончить ночь
                  </button>
                </>
              )}
            </div>
          )}

          {gameState.phase === 'Day' && (
            <div className="phase-card">
              <h3>День наступил</h3>
              <p>{killedPlayer ? `${killedPlayer} был убит прошлой ночью.` : 'Прошлой ночью никто не был убит.'}</p>
              {inspectText && <p>{inspectText}</p>}
              <button className="game-button" onClick={startVote}>Начать голосование</button>
            </div>
          )}

          {gameState.phase === 'Vote' && (
            <div className="phase-card">
              <h3>Голосование за казнь</h3>
              <p>Выберите игрока или пропустите. Таймер: {gameState.countdown}с.</p>
              <div className="target-grid">
                {alivePlayers
                  .filter((player) => player.name !== playerName)
                  .map((target) => (
                    <button
                      key={target.name}
                      className={`target-button ${gameState.voteTarget === target.name ? 'selected' : ''}`}
                      onClick={() => selectVote(target.name)}>
                      {target.name}
                    </button>
                  ))}
                <button
                  className={`target-button ${gameState.voteTarget === 'Skip' ? 'selected' : ''}`}
                  onClick={() => selectVote('Skip')}>
                  Пропустить
                </button>
              </div>
              <button className="game-button" onClick={() => updateState(resolveVote(gameState))}>
                Подтвердить голос
              </button>
            </div>
          )}

          {gameState.voteResult && (
            <div className="phase-card">
              <h3>Результат голосования</h3>
              <p>{gameState.voteResult}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Game