const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'qwen/qwen3-coder:free';

interface PlayerInput {
  age: number;
  height: number;
  weight: number;
  position: string;
  playingStyle: string;
  weeklyActivity: number;
}

interface GeneratedStats {
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  goalkeeping: number | null;
  stamina: number;
  archetype: string;
  overall: number;
}

function buildPrompt(player: PlayerInput): string {
  return `You are an expert football scout and statistician for an eFootball-style app.
Your task is to calculate realistic, balanced attributes (scale 40-99) and an overall rating (OVR) for a weekend 5-a-side player based on their self-reported physical metrics and playing style.

CALIBRATION SCALE FOR AMATEUR PLAYERS:
- 40–59: Below average / Casual
- 60–74: Average weekend player
- 75–84: Key team player / High fitness
- 85–94: Standout amateur star
- 95+: Professional level (rare)

PLAYER INFO:
- Age: ${player.age}
- Height: ${player.height}cm
- Weight: ${player.weight}kg
- Position: ${player.position}
- Playing Style: ${player.playingStyle}
- Weekly Activity: ${player.weeklyActivity} hrs/week

RULES:
1. Calculate BMI internally: weight_kg / (height_m^2). Factor this into Pace, Stamina, and Agility.
2. Primary position attributes MUST be highest (e.g., Defenders get higher Defending/Physicality, Strikers get higher Shooting/Pace).
3. Ensure attributes are internally consistent (e.g., a heavy player with low fitness cannot have 90 Pace and 90 Stamina).
4. For GK position, goalkeeping should be high (70-90 range based on other attributes).
5. All values must be between 40-99. Most amateur players should be 55-80.

OUTPUT FORMAT: Return ONLY a valid JSON object matching this schema, with no additional markdown, prose, or code block markers:
{
  "bmi": float (rounded to 1 decimal),
  "ovr": int,
  "pace": int,
  "shooting": int,
  "passing": int,
  "dribbling": int,
  "defending": int,
  "physicality": int,
  "stamina": int,
  "archetype": "string (e.g., 'Box-to-Box Engine', 'Clinical Finisher', 'Rock-Solid Stopper', 'Speedster Winger', 'Playmaker')"
}`;
}

function clampStat(value: number): number {
  return Math.min(99, Math.max(1, Math.round(value)));
}

function parseLLMResponse(content: string): GeneratedStats | null {
  try {
    let cleaned = content.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      pace: clampStat(parsed.pace),
      shooting: clampStat(parsed.shooting),
      passing: clampStat(parsed.passing),
      dribbling: clampStat(parsed.dribbling),
      defending: clampStat(parsed.defending),
      physical: clampStat(parsed.physicality ?? parsed.physical),
      goalkeeping: parsed.goalkeeping != null ? clampStat(parsed.goalkeeping) : null,
      stamina: clampStat(parsed.stamina),
      archetype: typeof parsed.archetype === 'string' ? parsed.archetype : 'All-Rounder',
      overall: clampStat(parsed.ovr ?? parsed.overall),
    };
  } catch {
    return null;
  }
}

function getArchetype(position: string, playingStyle: string): string {
  const archetypes: Record<string, Record<string, string>> = {
    ST: { attacking: 'Clinical Finisher', 'counter-attack': 'Poacher', balanced: 'Target Man', possession: 'False Nine', defensive: 'Defensive Striker' },
    CF: { attacking: 'Complete Forward', 'counter-attack': 'Mobile Striker', balanced: 'Target Man', possession: 'False Nine', defensive: 'Pressing Forward' },
    LW: { attacking: 'Speedster Winger', 'counter-attack': 'Counter Winger', balanced: 'Inverted Winger', possession: 'Playmaker', defensive: 'Tracking Winger' },
    RW: { attacking: 'Speedster Winger', 'counter-attack': 'Counter Winger', balanced: 'Inverted Winger', possession: 'Playmaker', defensive: 'Tracking Winger' },
    CAM: { attacking: 'Creative Playmaker', 'counter-attack': 'Shadow Striker', balanced: 'Box-to-Box Engine', possession: 'Deep-Lying Playmaker', defensive: 'Attacking Midfielder' },
    CM: { attacking: 'Box-to-Box Engine', 'counter-attack': 'Dynamic Midfielder', balanced: 'All-Rounder', possession: 'Deep-Lying Playmaker', defensive: 'Ball-Winner' },
    CDM: { attacking: 'Regista', 'counter-attack': 'Anchor Man', balanced: 'Holding Midfielder', possession: 'Deep-Lying Playmaker', defensive: 'Destroyer' },
    LB: { attacking: 'Attacking Fullback', 'counter-attack': 'Overlapping Fullback', balanced: 'Complete Fullback', possession: 'Inverted Fullback', defensive: 'Defensive Fullback' },
    RB: { attacking: 'Attacking Fullback', 'counter-attack': 'Overlapping Fullback', balanced: 'Complete Fullback', possession: 'Inverted Fullback', defensive: 'Defensive Fullback' },
    CB: { attacking: 'Ball-Playing Defender', 'counter-attack': 'Sweeper', balanced: 'Center Back', possession: 'Libero', defensive: 'Rock-Solid Stopper' },
    GK: { attacking: 'Sweeper Keeper', 'counter-attack': 'Shot Stopper', balanced: 'Complete Keeper', possession: 'Ball-Playing Keeper', defensive: 'Traditional Keeper' },
  };
  return archetypes[position]?.[playingStyle] || 'All-Rounder';
}

function generateStatsLocally(player: PlayerInput): GeneratedStats {
  const bmi = player.weight / Math.pow(player.height / 100, 2);

  let pace = player.age <= 25 ? 72 : player.age <= 32 ? 67 : 58;
  if (bmi >= 18.5 && bmi <= 24.9) pace += 5;
  else if (bmi > 28) pace -= 5;

  let stamina = 50 + player.weeklyActivity * 3.5;
  if (player.age <= 25) stamina += 3;
  else if (player.age > 32) stamina -= 3;
  stamina = Math.min(95, Math.max(40, stamina));

  let physical = 50 + (player.height > 180 ? 5 : 0) + (player.weight > 80 ? 3 : 0);
  if (bmi > 28) physical += 3;

  let shooting = 55;
  let passing = 55;
  let dribbling = 55;
  let defending = 55;

  switch (player.position) {
    case 'ST': case 'CF': shooting += 12; pace += 5; break;
    case 'LW': case 'RW': pace += 10; dribbling += 8; break;
    case 'CAM': passing += 10; dribbling += 8; break;
    case 'CM': passing += 8; stamina += 5; break;
    case 'CDM': defending += 10; physical += 5; break;
    case 'CB': defending += 12; physical += 8; break;
    case 'LB': case 'RB': pace += 5; defending += 8; stamina += 5; break;
    case 'GK': defending += 15; shooting -= 10; dribbling -= 10; break;
  }

  switch (player.playingStyle) {
    case 'attacking': pace += 5; shooting += 5; break;
    case 'possession': passing += 5; dribbling += 5; break;
    case 'defensive': defending += 5; physical += 5; break;
    case 'balanced': physical += 3; stamina += 3; break;
    case 'counter-attack': pace += 5; shooting += 3; break;
  }

  const overall = Math.round((pace * 0.15 + shooting * 0.15 + passing * 0.15 + dribbling * 0.15 + defending * 0.2 + physical * 0.1 + stamina * 0.1) *
    (player.age <= 24 ? 1.02 : player.age <= 29 ? 1.0 : player.age <= 32 ? 0.97 : 0.93));

  return {
    pace: clampStat(pace),
    shooting: clampStat(shooting),
    passing: clampStat(passing),
    dribbling: clampStat(dribbling),
    defending: clampStat(defending),
    physical: clampStat(physical),
    goalkeeping: player.position === 'GK' ? clampStat(70 + player.weeklyActivity * 1.5) : null,
    stamina: clampStat(stamina),
    archetype: getArchetype(player.position, player.playingStyle),
    overall: clampStat(overall),
  };
}

export async function generatePlayerStats(player: PlayerInput): Promise<GeneratedStats> {
  if (!OPENROUTER_API_KEY) {
    console.warn('OPENROUTER_API_KEY not set, using local stat generation');
    return generateStatsLocally(player);
  }

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://football-app.railway.app',
        'X-Title': 'Ns Football Manager App',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'user',
            content: buildPrompt(player),
          },
        ],
        temperature: 0.3,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      console.error(`OpenRouter API error: ${response.status}`);
      return generateStatsLocally(player);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.error('No content in OpenRouter response');
      return generateStatsLocally(player);
    }

    const stats = parseLLMResponse(content);
    if (!stats) {
      console.error('Failed to parse LLM response:', content);
      return generateStatsLocally(player);
    }

    return stats;
  } catch (err) {
    console.error('LLM generation failed, falling back to local:', err);
    return generateStatsLocally(player);
  }
}
