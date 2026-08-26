const API = 'http://localhost:3001/api';

const avatarFor = (name: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1a1a2e&color=00e676&size=256&bold=true&format=svg`;

async function seed() {
  const loginRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@football.com', password: 'admin123' }),
  });
  const { token } = await loginRes.json();
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const players = [
    { name: 'Manuel Neuer', age: 35, height: 193, weight: 92, position: 'GK', playingStyle: 'balanced', weeklyActivity: 15, skillRatings: { pace: 45, shooting: 25, passing: 70, dribbling: 35, defending: 25, physical: 75, goalkeeping: 90 } },
    { name: 'Virgil van Dijk', age: 30, height: 193, weight: 92, position: 'CB', playingStyle: 'defensive', weeklyActivity: 18, skillRatings: { pace: 65, shooting: 45, passing: 72, dribbling: 55, defending: 92, physical: 88 } },
    { name: 'Sergio Ramos', age: 35, height: 184, weight: 82, position: 'CB', playingStyle: 'attacking', weeklyActivity: 14, skillRatings: { pace: 62, shooting: 68, passing: 70, dribbling: 60, defending: 88, physical: 82 } },
    { name: 'Marcelo', age: 33, height: 174, weight: 75, position: 'LB', playingStyle: 'attacking', weeklyActivity: 16, skillRatings: { pace: 75, shooting: 62, passing: 82, dribbling: 85, defending: 60, physical: 68 } },
    { name: 'Dani Carvajal', age: 29, height: 173, weight: 73, position: 'RB', playingStyle: 'balanced', weeklyActivity: 19, skillRatings: { pace: 78, shooting: 58, passing: 80, dribbling: 76, defending: 82, physical: 68 } },
    { name: "N'Golo Kante", age: 30, height: 168, weight: 73, position: 'CDM', playingStyle: 'defensive', weeklyActivity: 20, skillRatings: { pace: 76, shooting: 50, passing: 72, dribbling: 70, defending: 92, physical: 78 } },
    { name: 'Luka Modric', age: 36, height: 174, weight: 70, position: 'CM', playingStyle: 'possession', weeklyActivity: 14, skillRatings: { pace: 62, shooting: 72, passing: 90, dribbling: 88, defending: 58, physical: 55 } },
    { name: 'Kevin De Bruyne', age: 31, height: 181, weight: 80, position: 'CAM', playingStyle: 'attacking', weeklyActivity: 17, skillRatings: { pace: 72, shooting: 86, passing: 94, dribbling: 85, defending: 50, physical: 72 } },
    { name: 'Isco', age: 30, height: 176, weight: 76, position: 'CAM', playingStyle: 'possession', weeklyActivity: 12, skillRatings: { pace: 62, shooting: 74, passing: 84, dribbling: 88, defending: 42, physical: 58 } },
    { name: 'Neymar Jr', age: 30, height: 175, weight: 68, position: 'LW', playingStyle: 'attacking', weeklyActivity: 13, skillRatings: { pace: 85, shooting: 84, passing: 82, dribbling: 94, defending: 30, physical: 55 } },
    { name: 'Mohamed Salah', age: 29, height: 175, weight: 71, position: 'RW', playingStyle: 'counter-attack', weeklyActivity: 19, skillRatings: { pace: 88, shooting: 88, passing: 78, dribbling: 86, defending: 38, physical: 65 } },
    { name: 'Robert Lewandowski', age: 33, height: 185, weight: 81, position: 'ST', playingStyle: 'balanced', weeklyActivity: 18, skillRatings: { pace: 72, shooting: 92, passing: 70, dribbling: 78, defending: 35, physical: 82 } },
    { name: 'Kylian Mbappe', age: 23, height: 178, weight: 73, position: 'ST', playingStyle: 'counter-attack', weeklyActivity: 20, skillRatings: { pace: 97, shooting: 90, passing: 78, dribbling: 92, defending: 30, physical: 72 } },
    { name: 'Jorginho', age: 30, height: 180, weight: 75, position: 'CDM', playingStyle: 'possession', weeklyActivity: 16, skillRatings: { pace: 48, shooting: 62, passing: 86, dribbling: 78, defending: 72, physical: 65 } },
    { name: 'Trent Alexander-Arnold', age: 23, height: 175, weight: 72, position: 'RB', playingStyle: 'attacking', weeklyActivity: 20, skillRatings: { pace: 72, shooting: 70, passing: 90, dribbling: 78, defending: 68, physical: 62 } },
  ];

  let created = 0;
  for (const p of players) {
    const res = await fetch(`${API}/players`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...p, avatarUrl: avatarFor(p.name) }),
    });
    if (res.ok) created++;
  }
  console.log(`Created ${created} players with avatars`);

  const genRes = await fetch(`${API}/ai/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ formation: '4-3-3', teamName: 'Dream Team XI' }),
  });
  const genData = await genRes.json();
  if (genRes.ok) {
    console.log(`AI generated team "${genData.team.name}" with score ${genData.score}`);
    console.log(`Players: ${genData.team.players.map((p: any) => `${p.positionInTeam}:${p.name}`).join(', ')}`);
  } else {
    console.error('AI generation error:', genData);
  }

  // Create a sample match
  const matchRes = await fetch(`${API}/matches`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: 'Friday Night Football',
      matchDate: '2026-08-28T19:00:00',
      description: 'Weekly friendly match - all skill levels welcome!',
      formation: '4-3-3',
    }),
  });
  if (matchRes.ok) {
    console.log('Created sample match: Friday Night Football');
  }
}

seed().catch(console.error);
