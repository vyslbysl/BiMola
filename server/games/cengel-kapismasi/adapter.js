import {createRoom, addPlayer, removePlayer, ready, configure, confirm, randomize, tick, view, MAX_PLAYERS} from './game.js';
const members = room => Object.values(room.players).filter(p => !p.isBot);
export const adapter = {
  snapshotInterval: 1000, create: ({code, host}) => createRoom({code, host}), members, addPlayer, removePlayer, view,
  canJoin(room, data = {}) {
    if (room.phase === 'play') return {error: 'Bu tahta oynanıyor. Maç bitince katılabilirsin.'};
    if (members(room).length >= MAX_PLAYERS) return {error: 'Oda dolu.'};
    if (data.profileId && members(room).some(p => p.profileId === data.profileId)) return {error: 'Bu odada başka bir sekmede zaten varsın.'};
    return {ok: true};
  },
  summary: room => ({players: members(room).length, capacity: MAX_PLAYERS, bots: Object.values(room.players).filter(p => p.isBot).length, phase: room.phase, joinable: room.phase !== 'play' && members(room).length < MAX_PLAYERS}),
  takeScores: room => room.scoreEvents.splice(0), tickInterval: room => room.phase === 'play' ? 250 : 0,
  tick: (room, now) => ({changed: tick(room, now)}),
  commands: {
    ready: {interval: 150, publish: true, handle: ready},
    configure: {interval: 200, publish: true, handle: configure},
    confirm: {interval: 250, publish: true, handle: confirm},
    randomize: {interval: 500, publish: true, handle: randomize},
  },
};
