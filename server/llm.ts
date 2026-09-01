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
}

function buildPrompt(player: PlayerInput): string {
  return `You are a football player stats generator. Given a player's physical attributes, position, and playing style, generate realistic skill ratings (1-99).

Player Info:
- Age: ${player.age}
- Height: ${player.height}cm
- Weight: ${player.weight}kg
- Position: ${player.position}
- Playing Style: ${player.playingStyle}
- Weekly Activity: ${player.weeklyActivity} hrs

Calculation Rules:
1. BMI = weight / ((height/100)^2)
2. Base Pace: age<=25: 75, age 26-32: 70, age>32: 60. BMI 18.5-24.9: +5, BMI>28: -5
3. Stamina = 50 + (weeklyActivity * 6). Use this as a baseline for Physicality.
4. Physicality: height>180 or weight>80: +5 bonus
5. Position Boosts: FWD: +10 shooting, +5 pace. MID: +10 passing, +5 stamina. DEF: +10 defending, +5 physicality. GK: +15 defending, -10 shooting, -10 dribbling.
6. Style Boosts: Speedster: +8 pace, +5 dribbling. Playmaker: +8 passing, +5 dribbling. Hard Tackler: +8 defending, +5 physicality. Target Man: +8 physicality, +5 shooting.
7. All values must be between 1-99. Clamp if rules push outside this range.
8. For GK position, goalkeeping should be high (70-90 range based on other attributes).

Return ONLY a JSON object with these exact keys (no markdown, no code blocks, no explanation):
{"pace": <number>, "shooting": <number>, "passing": <number>, "dribbling": <number>, "defending": <number>, "physical": <number>, "goalkeeping": <number or null>}

goalkeeping should be null for non-GK positions.`;
}

function clampStat(value: number): number {
  return Math.min(99, Math.max(1, Math.round(value)));
}

function parseLLMResponse(content: string): GeneratedStats | null {
  try {
    let cleaned = content.trim();
    // Remove markdown code blocks if present
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    // Find JSON object in the response
    const jsonMatch = cleaned.match(/\{[^}]+\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      pace: clampStat(parsed.pace),
      shooting: clampStat(parsed.shooting),
      passing: clampStat(parsed.passing),
      dribbling: clampStat(parsed.dribbling),
      defending: clampStat(parsed.defending),
      physical: clampStat(parsed.physical),
      goalkeeping: parsed.goalkeeping != null ? clampStat(parsed.goalkeeping) : null,
    };
  } catch {
    return null;
  }
}

// Fallback: generate stats deterministically without LLM
function generateStatsLocally(player: PlayerInput): GeneratedStats {
  const bmi = player.weight / Math.pow(player.height / 100, 2);

  // Base pace by age
  let pace = player.age <= 25 ? 75 : player.age <= 32 ? 70 : 60;
  if (bmi >= 18.5 && bmi <= 24.9) pace += 5;
  else if (bmi > 28) pace -= 5;

  // Stamina from weekly activity
  let stamina = 50 + player.weeklyActivity * 6;

  // Physicality baseline from stamina
  let physical = stamina;
  if (player.height > 180 || player.weight > 80) physical += 5;

  // Other baselines
  let shooting = 50;
  let passing = 50;
  let dribbling = 50;
  let defending = 50;

  // Position boosts
  switch (player.position) {
    case 'ST': case 'CF': case 'LW': case 'RW':
      shooting += 10; pace += 5; break;
    case 'CM': case 'CAM': case 'CDM':
      passing += 10; stamina += 5; break;
    case 'CB': case 'LB': case 'RB':
      defending += 10; physical += 5; break;
    case 'GK':
      defending += 15; shooting -= 10; dribbling -= 10; break;
  }

  // Style boosts
  switch (player.playingStyle) {
    case 'attacking':
      pace += 8; dribbling += 5; break;
    case 'possession':
      passing += 8; dribbling += 5; break;
    case 'defensive':
      defending += 8; physical += 5; break;
    case 'balanced':
      physical += 8; shooting += 5; break;
    case 'counter-attack':
      pace += 8; shooting += 5; break;
  }

  return {
    pace: clampStat(pace),
    shooting: clampStat(shooting),
    passing: clampStat(passing),
    dribbling: clampStat(dribbling),
    defending: clampStat(defending),
    physical: clampStat(physical),
    goalkeeping: player.position === 'GK' ? clampStat(70 + player.weeklyActivity) : null,
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
