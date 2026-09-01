# CONTEXT.md - Football App

## Project High-Level Summary

A full-stack football (soccer) management application designed for amateur football teams to organize weekly matches. Players can create profiles with AI-generated skill ratings, sign up for matches, and admin can generate balanced teams using an AI-powered team builder algorithm.

**Target Audience:** Amateur football groups, Sunday league teams, and casual players who want to track stats, organize matches, and create balanced teams.

**Core Features:**
- Player profile creation with AI-generated FIFA-style skill ratings (1-99)
- Match scheduling with signup deadlines (24h before match)
- Flexible formations supporting 5v5 through 11v11
- AI-powered team generation that balances teams by player ratings and position compatibility
- Dual-team generation (Team A vs Team B) with player swap capability
- Match result tracking with goal/assist recording
- Match fees field for player cost information
- Collapsible match statistics cards
- Player statistics aggregation (goals, assists, wins, matches played)
- Admin and player role-based access control

---

## Tech Stack & Core Libraries

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.x | UI framework |
| TypeScript | 6.x | Type safety |
| Vite | 8.x | Build tool & dev server |
| Tailwind CSS | 4.x | Styling (via @tailwindcss/vite plugin) |
| React Router | 6.x | Client-side routing |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Express | 5.x | HTTP server |
| better-sqlite3 | 13.x | SQLite database |
| jsonwebtoken | 9.x | JWT authentication |
| bcryptjs | 3.x | Password hashing |
| uuid | 14.x | Unique ID generation |
| tsx | 4.x | TypeScript execution |

### AI/LLM Integration
| Technology | Purpose |
|------------|---------|
| OpenRouter API | External LLM API for player stat generation |
| qwen/qwen3-coder:free | Model used for generating player statistics |

### Development Tools
| Tool | Purpose |
|------|---------|
| oxlint | Linting |
| esbuild | Server bundling |
| concurrently | Parallel dev server execution |

---

## Architecture & Directory Map

```
football-app/
├── server/                    # Express backend
│   ├── index.ts              # Server entry point (port 3001)
│   ├── db.ts                 # SQLite database setup & migrations
│   ├── auth.ts               # JWT auth middleware & helpers
│   ├── llm.ts                # OpenRouter LLM integration for stat generation
│   ├── types.ts              # TypeScript types (Position, Formation, etc.)
│   ├── routes/
│   │   ├── auth.ts           # POST /register, /login, GET /me
│   │   ├── players.ts        # CRUD for players, stat generation
│   │   ├── teams.ts          # CRUD for teams
│   │   ├── matches.ts        # Match management, signups, team generation, results
│   │   └── ai.ts             # AI team generation endpoint
│   └── ai/
│       └── teamBuilder.ts    # Team balancing algorithm
├── src/                       # React frontend
│   ├── main.tsx              # App entry
│   ├── App.tsx               # Router configuration
│   ├── index.css             # Global styles
│   ├── api/
│   │   └── client.ts         # API client class (token management, all endpoints)
│   ├── context/
│   │   └── AuthContext.tsx    # Auth state management
│   ├── components/
│   │   ├── Layout.tsx        # Main layout wrapper
│   │   ├── Navbar.tsx        # Navigation bar
│   │   ├── PlayerCard.tsx    # Player profile card display
│   │   ├── PlayerForm.tsx    # Player creation/edit form
│   │   └── ProtectedRoute.tsx # Auth route guard
│   ├── pages/
│   │   ├── Login.tsx         # Login page
│   │   ├── Register.tsx      # Registration page
│   │   ├── ProfileSetup.tsx  # Initial player profile creation
│   │   ├── Dashboard.tsx     # Home page with player card & matches
│   │   ├── Players.tsx       # Player list & management
│   │   ├── Profile.tsx       # Player profile view
│   │   ├── TeamBuilder.tsx   # AI team generation interface (dual teams, player swap)
│   │   ├── Teams.tsx         # Saved teams list
│   │   ├── Notice.tsx        # Upcoming matches with signup
│   │   ├── Matches.tsx       # Completed match statistics (collapsible cards)
│   │   └── Admin.tsx         # Admin panel
│   └── types/                # Frontend TypeScript types
├── data/
│   └── football.db           # SQLite database file
├── public/                   # Static assets
├── dist/                     # Built frontend
├── dist-server/              # Built backend
├── package.json
├── vite.config.ts
├── tsconfig.json
├── Dockerfile
└── railway.json
```

---

## Key Conventions & Coding Standards

### Code Style
- **Language:** TypeScript throughout (both frontend and backend)
- **Module format:** ES Modules (`"type": "module"` in package.json)
- **Linting:** oxlint (not ESLint)
- **No comments:** Avoid adding code comments unless explicitly requested

### Naming Conventions
- **Files:** PascalCase for components (`PlayerCard.tsx`), camelCase for utilities (`teamBuilder.ts`)
- **Variables/Functions:** camelCase (`matchDate`, `generateOptimalTeam`)
- **Types/Interfaces:** PascalCase (`PlayerInput`, `AuthRequest`)
- **Constants:** UPPER_SNAKE_CASE for env vars, PascalCase for type constants (`FORMATIONS`)
- **Database tables:** snake_case (`match_signups`, `team_players`)
- **Database columns:** camelCase (`matchDate`, `createdAt`, `avatarUrl`)

### API Conventions
- All API routes prefixed with `/api`
- RESTful design: GET (list), GET /:id (single), POST (create), PUT /:id (update), DELETE /:id (delete)
- Auth via Bearer token in Authorization header
- Admin-only routes protected with `adminMiddleware`
- Consistent error response: `{ error: string }`
- Success responses: direct JSON payload

### Database Conventions
- SQLite with WAL mode enabled
- Foreign keys enforced
- UUIDs for all primary keys (via uuid v4)
- Timestamps stored as ISO strings (SQLite datetime function)
- Soft deletes not used (hard deletes with CASCADE)
- Inline migrations in `db.ts` (non-destructive, checks column existence)

### Frontend Conventions
- Functional components with hooks
- State management via React Context (AuthContext)
- API calls centralized in `src/api/client.ts`
- Tailwind CSS for all styling (no CSS modules)
- Dark theme: gray-900 backgrounds, green-500 accents
- Route protection via `ProtectedRoute` wrapper component

### Error Handling
- Backend: try/catch in route handlers, return 4xx/5xx with `{ error: string }`
- Frontend: `.catch()` handlers display errors via `alert()` or inline error messages
- LLM failures gracefully fall back to local stat generation
- Database errors caught and returned as 500 responses

---

## Current Build Status & Progress

### ✅ Completed Features
- [x] User registration & login with JWT auth
- [x] Player profile creation with AI-generated stats (or manual entry)
- [x] Player profile editing
- [x] Player overall rating calculation (position-weighted with age/activity factors)
- [x] Match creation (admin only)
- [x] Match signup with deadline enforcement (24h before match)
- [x] AI team generation with position compatibility & synergy scoring
- [x] Team balancing by player ratings
- [x] Match result recording (winner, scores, goals/assists)
- [x] Player statistics aggregation (goals, assists, matches played, wins)
- [x] Team renaming feature
- [x] Role-based access (admin vs player)
- [x] Responsive UI with dark theme
- [x] Railway deployment configuration
- [x] Flexible formations (5v5 through 11v11) with custom formation builder
- [x] Dual-team generation (Team A vs Team B) in Team Builder
- [x] Player swap between teams after generation
- [x] Collapsible match statistics cards
- [x] Match fees field for player cost information
- [x] Dedicated Matches page for completed match statistics
- [x] Notice Board shows only upcoming matches
- [x] Admin can delete completed matches
- [x] Centered formation visualizations in Matches page

### 🔄 In Progress / Known Issues
- No test suite currently implemented
- No CI/CD pipeline configured
- No environment variable validation at startup

### 📋 Potential Future Enhancements
- Player avatar upload (currently supports external URLs only)
- Match history analytics/charts
- Player performance trends over time
- Push notifications for match announcements
- Multi-team support per match (substitutes)
- Match chat/comments feature

---

## Environment & Commands

### Environment Variables
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3001` | Server port |
| `JWT_SECRET` | No* | `football-app-secret-key-2024` | JWT signing secret (*should set in production) |
| `OPENROUTER_API_KEY` | No | `null` | OpenRouter API key for LLM stat generation (falls back to local generation) |
| `RAILWAY_VOLUME_MOUNT_PATH` | No | `null` | Railway persistent volume path |

### Development Commands
```bash
# Install dependencies
npm install

# Run dev server (both frontend + backend concurrently)
npm run dev

# Run frontend only (Vite dev server)
npm run dev:client

# Run backend only (Express with tsx)
npm run dev:server
```

### Build Commands
```bash
# Build for production (frontend + backend)
npm run build

# Build frontend only
vite build

# Build server only
npm run build:server

# Start production server
npm start
```

### Linting
```bash
# Run oxlint
npm run lint
```

### Database
- **Location:** `data/football.db`
- **Engine:** SQLite with WAL mode
- **Migrations:** Automatic on server startup (non-destructive, checks column existence)
- **Seeded Data:** Admin user (`admin@football.com` / `admin123`) auto-created

### API Endpoints Reference
| Method | Endpoint | Auth | Admin | Description |
|--------|----------|------|-------|-------------|
| POST | /api/auth/register | No | No | Register new user |
| POST | /api/auth/login | No | No | Login |
| GET | /api/auth/me | Yes | No | Get current user |
| GET | /api/players | Yes | No | List all players |
| GET | /api/players/me | Yes | No | Get current user's player |
| GET | /api/players/:id | Yes | No | Get player by ID |
| POST | /api/players | Yes | No | Create player |
| PUT | /api/players/:id | Yes | No | Update player |
| DELETE | /api/players/:id | Yes | Yes | Delete player |
| POST | /api/players/:id/generate-stats | Yes | Yes | Regenerate player stats |
| GET | /api/teams | Yes | No | List user's teams |
| GET | /api/teams/:id | Yes | No | Get team by ID |
| POST | /api/teams | Yes | Yes | Create team |
| DELETE | /api/teams/:id | Yes | Yes | Delete team |
| POST | /api/ai/generate | Yes | Yes | Generate AI team |
| POST | /api/ai/generate-both-teams | Yes | Yes | Generate two balanced teams |
| PUT | /api/ai/update-team-positions | Yes | Yes | Update player positions in teams |
| POST | /api/ai/swap-players | Yes | Yes | Swap players between teams |
| GET | /api/matches | Yes | No | List all matches |
| GET | /api/matches/:id | Yes | No | Get match by ID |
| POST | /api/matches | Yes | Yes | Create match |
| POST | /api/matches/:id/signup | Yes | No | Sign up for match |
| POST | /api/matches/:id/leave | Yes | No | Leave match (locked) |
| POST | /api/matches/:id/generate-teams | Yes | Yes | Generate teams for match |
| POST | /api/matches/:id/result | Yes | Yes | Record match result |
| PATCH | /api/matches/:id/teams/rename | Yes | Yes | Rename match teams |
| DELETE | /api/matches/:id | Yes | Yes | Delete match |
| GET | /api/health | No | No | Health check |

---

*Generated for persistent AI coding context. Last updated: 2026-09-02*
