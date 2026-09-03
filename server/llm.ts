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

interface BaseStats {
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  goalkeeping: number | null;
  stamina: number;
  bmi: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function calculateBaseStats(player: PlayerInput): BaseStats {
  const bmi = player.weight / Math.pow(player.height / 100, 2);

  const stats: Record<string, number> = {
    pace: 60,
    shooting: 50,
    passing: 55,
    dribbling: 55,
    defending: 50,
    physical: 55,
    stamina: 50 + player.weeklyActivity * 3,
  };

  const positionBoosts: Record<string, Record<string, number>> = {
    GK:  { defending: 30, physical: 15, shooting: -20, dribbling: -15 },
    CB:  { defending: 25, physical: 20, pace: -5 },
    LB:  { pace: 15, defending: 15, stamina: 15, passing: 5 },
    RB:  { pace: 15, defending: 15, stamina: 15, passing: 5 },
    CDM: { defending: 18, passing: 15, physical: 15, stamina: 10 },
    CM:  { passing: 20, stamina: 15, dribbling: 10, defending: 5 },
    CAM: { passing: 20, dribbling: 18, shooting: 12, defending: -10 },
    LW:  { pace: 22, dribbling: 18, shooting: 10, defending: -15 },
    RW:  { pace: 22, dribbling: 18, shooting: 10, defending: -15 },
    ST:  { shooting: 25, physical: 12, pace: 10, defending: -20 },
    CF:  { shooting: 20, dribbling: 15, passing: 12, defending: -15 },
  };

  const styleBoosts: Record<string, Record<string, number>> = {
    defensive:      { defending: 8, physical: 5, shooting: -5 },
    attacking:      { shooting: 8, pace: 5, defending: -5 },
    possession:     { passing: 10, dribbling: 6, pace: -4 },
    'counter-attack': { pace: 10, stamina: 5, passing: 3 },
    balanced:       { passing: 3, defending: 3, dribbling: 3 },
  };

  for (const [stat, boost] of Object.entries(positionBoosts[player.position] || {})) {
    stats[stat] = (stats[stat] || 0) + boost;
  }

  for (const [stat, boost] of Object.entries(styleBoosts[player.playingStyle] || {})) {
    stats[stat] = (stats[stat] || 0) + boost;
  }

  if (player.age <= 22) {
    stats.pace += 5;
    stats.dribbling += 3;
  } else if (player.age >= 33) {
    stats.pace -= 5;
    stats.physical += 4;
    stats.defending += 3;
  } else if (player.age >= 30) {
    stats.pace -= 3;
    stats.physical += 2;
  }

  if (bmi >= 18.5 && bmi <= 24.9) {
    stats.pace += 4;
    stats.stamina += 3;
  } else if (bmi > 28) {
    stats.pace -= 6;
    stats.stamina -= 3;
  } else if (bmi > 26) {
    stats.pace -= 3;
  }

  const goalkeeping = player.position === 'GK' ? clamp(70 + player.weeklyActivity * 1.5, 40, 95) : null;

  return {
    pace: clamp(stats.pace, 40, 95),
    shooting: clamp(stats.shooting, 40, 95),
    passing: clamp(stats.passing, 40, 95),
    dribbling: clamp(stats.dribbling, 40, 95),
    defending: clamp(stats.defending, 40, 95),
    physical: clamp(stats.physical, 40, 95),
    goalkeeping,
    stamina: clamp(stats.stamina, 40, 95),
    bmi: Math.round(bmi * 10) / 10,
  };
}

function buildPrompt(player: PlayerInput, base: BaseStats): string {
  return `You are a lead scout for eFootball. You are given a player's profile and pre-calculated baseline stats.

INPUT DATA:
- Player Age: ${player.age}, Pos: ${player.position}, Style: ${player.playingStyle}, BMI: ${base.bmi}
- BASELINE STATS: PAC ${base.pace}, SHO ${base.shooting}, PAS ${base.passing}, DRI ${base.dribbling}, DEF ${base.defending}, PHY ${base.physical}, STA ${base.stamina}${base.goalkeeping != null ? `, GK ${base.goalkeeping}` : ''}

YOUR TASK:
1. STAT FINE-TUNING: Adjust the baseline stats by a maximum of ±4 points based on age and holistic playstyle synergy. Ensure the primary stat for the position remains the highest.
2. OVERALL RATING (OVR): Calculate a single weighted OVR (50-99) using these exact positional weights:

OVR FORMULA (multiply each stat by its weight, sum, then apply age factor):
- GK:  goalkeeping×0.50 + physical×0.10 + pace×0.10 + passing×0.10 + stamina×0.20
- CB:  pace×0.08 + shooting×0.05 + passing×0.08 + dribbling×0.04 + defending×0.35 + physical×0.25 + stamina×0.15
- LB/RB: pace×0.15 + shooting×0.05 + passing×0.12 + dribbling×0.12 + defending×0.20 + physical×0.15 + stamina×0.21
- CDM: pace×0.08 + shooting×0.05 + passing×0.15 + dribbling×0.08 + defending×0.30 + physical×0.18 + stamina×0.16
- CM:  pace×0.08 + shooting×0.12 + passing×0.20 + dribbling×0.15 + defending×0.12 + physical×0.12 + stamina×0.21
- CAM: pace×0.12 + shooting×0.15 + passing×0.20 + dribbling×0.20 + defending×0.04 + physical×0.08 + stamina×0.21
- LW/RW: pace×0.20 + shooting×0.12 + passing×0.12 + dribbling×0.20 + defending×0.04 + physical×0.12 + stamina×0.20
- ST:  pace×0.15 + shooting×0.25 + passing×0.08 + dribbling×0.15 + defending×0.00 + physical×0.17 + stamina×0.20
- CF:  pace×0.12 + shooting×0.20 + passing×0.12 + dribbling×0.15 + defending×0.04 + physical×0.17 + stamina×0.20

AGE FACTOR: multiply OVR by 1.02 (age≤24), 1.0 (25-29), 0.97 (30-32), or 0.93 (33+).

3. ARCHETYPE: Assign a sharp 3-word title (e.g., "Relentless Wing Back", "Surgical Playmaker", "Anchor Defender").

STRICT RULES:
- Do NOT output default 50s.
- Stats must stay within 40-99 range.
- The primary stat for the position MUST be the highest among the 7 field stats (pace/shooting/passing/dribbling/defending/physical/stamina).
- Return strictly valid JSON.

OUTPUT FORMAT:
{
  "ovr": int,
  "pace": int,
  "shooting": int,
  "passing": int,
  "dribbling": int,
  "defending": int,
  "physical": int,
  "stamina": int,
  "archetype": "string"
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

export async function generatePlayerStats(player: PlayerInput): Promise<GeneratedStats> {
  const base = calculateBaseStats(player);

  if (!OPENROUTER_API_KEY) {
    console.warn('OPENROUTER_API_KEY not set, using deterministic base stats');
    return {
      pace: base.pace,
      shooting: base.shooting,
      passing: base.passing,
      dribbling: base.dribbling,
      defending: base.defending,
      physical: base.physical,
      goalkeeping: base.goalkeeping,
      stamina: base.stamina,
      archetype: getArchetype(player.position, player.playingStyle),
      overall: 50,
    };
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
            content: buildPrompt(player, base),
          },
        ],
        temperature: 0.3,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      console.error(`OpenRouter API error: ${response.status}`);
      return {
        pace: base.pace,
        shooting: base.shooting,
        passing: base.passing,
        dribbling: base.dribbling,
        defending: base.defending,
        physical: base.physical,
        goalkeeping: base.goalkeeping,
        stamina: base.stamina,
        archetype: getArchetype(player.position, player.playingStyle),
        overall: 50,
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.error('No content in OpenRouter response');
      return {
        pace: base.pace,
        shooting: base.shooting,
        passing: base.passing,
        dribbling: base.dribbling,
        defending: base.defending,
        physical: base.physical,
        goalkeeping: base.goalkeeping,
        stamina: base.stamina,
        archetype: getArchetype(player.position, player.playingStyle),
        overall: 50,
      };
    }

    const stats = parseLLMResponse(content);
    if (!stats) {
      console.error('Failed to parse LLM response:', content);
      return {
        pace: base.pace,
        shooting: base.shooting,
        passing: base.passing,
        dribbling: base.dribbling,
        defending: base.defending,
        physical: base.physical,
        goalkeeping: base.goalkeeping,
        stamina: base.stamina,
        archetype: getArchetype(player.position, player.playingStyle),
        overall: 50,
      };
    }

    return stats;
  } catch (err) {
    console.error('LLM generation failed, using deterministic base stats:', err);
    return {
      pace: base.pace,
      shooting: base.shooting,
      passing: base.passing,
      dribbling: base.dribbling,
      defending: base.defending,
      physical: base.physical,
      goalkeeping: base.goalkeeping,
      stamina: base.stamina,
      archetype: getArchetype(player.position, player.playingStyle),
      overall: 50,
    };
  }
}
