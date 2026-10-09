// Keep the readable result separate from hidden positions and aim data.
export function describeShots(players, shots, me) {
  const names = new Map(players.map(p => [p.id, p.name]));
  return shots.map(shot => ({
    shooter: names.get(shot.id) || 'Ayrılan oyuncu',
    victim: shot.target ? names.get(shot.target) || 'Ayrılan oyuncu' : null,
    ...(shot.protectedTarget?{protectedMe:shot.protectedTarget===me,protected:names.get(shot.protectedTarget)||'Ayrılan oyuncu'}:{}),
    ...(shot.allyTarget?{ally:names.get(shot.allyTarget)||'Takım arkadaşı'}:{}),
    ownShot: shot.id === me,
    blocked: !!shot.obstacleId,
    hitMe: shot.target === me,
  }));
}
