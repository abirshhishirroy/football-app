const API_BASE = '/api';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('token');
    }
    return this.token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Request failed');
    }
    return data;
  }

  async login(email: string, password: string) {
    const data = await this.request<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.token);
    return data.user;
  }

  async register(email: string, password: string, name: string) {
    const data = await this.request<{ user: any; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    this.setToken(data.token);
    return data.user;
  }

  async getMe() {
    return this.request<{ user: any }>('/auth/me');
  }

  async getMyPlayer() {
    return this.request<any | null>('/players/me');
  }

  async getPlayers() {
    return this.request<any[]>('/players');
  }

  async getPlayer(id: string) {
    return this.request<any>(`/players/${id}`);
  }

  async createPlayer(data: any) {
    return this.request<any>('/players', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePlayer(id: string, data: any) {
    return this.request<any>(`/players/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePlayer(id: string) {
    return this.request<any>(`/players/${id}`, { method: 'DELETE' });
  }

  async generatePlayerStats(playerId: string) {
    return this.request<any>(`/players/${playerId}/generate-stats`, { method: 'POST' });
  }

  async getTeams() {
    return this.request<any[]>('/teams');
  }

  async getTeam(id: string) {
    return this.request<any>(`/teams/${id}`);
  }

  async createTeam(data: any) {
    return this.request<any>('/teams', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteTeam(id: string) {
    return this.request<any>(`/teams/${id}`, { method: 'DELETE' });
  }

  async generateTeam(data: { formation: string; teamName: string; playerIds?: string[] }) {
    return this.request<{ team: any; score: number }>('/ai/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMatches() {
    return this.request<any[]>('/matches');
  }

  async getMatch(id: string) {
    return this.request<any>(`/matches/${id}`);
  }

  async createMatch(data: { title: string; matchDate: string; description?: string; formation?: string; venueName?: string; venueLink?: string; reportingTime?: string; matchFees?: string }) {
    return this.request<any>('/matches', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async signupMatch(matchId: string) {
    return this.request<any>(`/matches/${matchId}/signup`, { method: 'POST' });
  }

  async leaveMatch(matchId: string) {
    return this.request<any>(`/matches/${matchId}/leave`, { method: 'POST' });
  }

  async generateMatchTeams(matchId: string) {
    return this.request<{ teamData: any; teamAScore: number; teamBScore: number }>(`/matches/${matchId}/generate-teams`, { method: 'POST' });
  }

  async renameMatchTeams(matchId: string, teamAName: string, teamBName: string) {
    return this.request<any>(`/matches/${matchId}/teams/rename`, {
      method: 'PATCH',
      body: JSON.stringify({ teamAName, teamBName }),
    });
  }

  async deleteMatch(matchId: string) {
    return this.request<any>(`/matches/${matchId}`, { method: 'DELETE' });
  }

  async submitMatchResult(matchId: string, data: { winner: string | null; scoreA: number; scoreB: number; scorers: { playerId: string; team: 'A' | 'B'; isGoal: boolean; minute?: number | null }[] }) {
    return this.request<any>(`/matches/${matchId}/result`, { method: 'POST', body: JSON.stringify(data) });
  }

  async generateBothTeams(data: { formation: any; playerIds: string[]; teamAName?: string; teamBName?: string }) {
    return this.request<{ teamA: any; teamB: any }>('/ai/generate-both-teams', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTeamPositions(data: { teamA: { position: string; playerId: string }[]; teamB: { position: string; playerId: string }[]; formation: any; teamAName?: string; teamBName?: string }) {
    return this.request<{ teamA: any; teamB: any }>('/ai/update-team-positions', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async swapPlayers(data: { teamASlots: { position: string; playerId: string }[]; teamBSlots: { position: string; playerId: string }[]; formation: any; teamAName?: string; teamBName?: string }) {
    return this.request<{ teamA: any; teamB: any }>('/ai/swap-players', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMemories() {
    return this.request<any[]>('/memories');
  }

  async getMatchMemories(matchId: string) {
    return this.request<any[]>(`/memories/${matchId}`);
  }

  async uploadMemory(matchId: string, file: File, caption: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('caption', caption);
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/memories/${matchId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data;
  }

  async deleteMemory(id: string) {
    return this.request<any>(`/memories/${id}`, { method: 'DELETE' });
  }

  logout() {
    this.setToken(null);
  }
}

export const api = new ApiClient();
