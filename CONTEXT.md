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
- Match memories — photo/video upload to Cloudinary with horizontal gallery
- Admin and player role-based access control

---

## Tech Stack & Core Libraries

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.x | UI framework |
| TypeScript | 6.x | Type safety |
| Vite | 8.x | Build tool & dev server |
| Tailwind CSS | 4.x | Styling (via @tailwindcss/vite plugin, CSS-first config with @theme) |
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
| cloudinary | 2.x | Image/video storage for match memories |
| streamifier | 1.x | Buffer-to-stream conversion for Cloudinary uploads |
| multer | 2.x | Multipart file upload handling (memory storage) |

### AI/LLM Integration
| Technology | Purpose |
|------------|---------|
| OpenRouter API | External LLM API for player stat refinement |
| qwen/qwen3-coder:free | Model used for fine-tuning pre-calculated player stats |
| Deterministic Math Pipeline | TypeScript function calculating baseline stats from BMI, position weights, playing style, and age factors |

### Development Tools
| Tool | Purpose |
|------|---------|
| oxlint | Linting |
| esbuild | Server bundling (outputs to dist-server/) |
| concurrently | Parallel dev server execution |

---

## Architecture & Directory Map

```
football-app/
├── server/                    # Express backend
│   ├── index.ts              # Server entry point (port 3001)
│   ├── db.ts                 # SQLite database setup & migrations
│   ├── auth.ts               # JWT auth middleware & helpers
│   ├── cloudinary.ts         # Cloudinary SDK config (lazy init, reads env vars)
│   ├── llm.ts                # Hybrid stat generation: deterministic math pipeline + OpenRouter LLM refinement
│   ├── types.ts              # TypeScript types (Position, Formation, etc.)
│   ├── routes/
│   │   ├── auth.ts           # POST /register, /login, GET /me
│   │   ├── players.ts        # CRUD for players, stat generation
│   │   ├── teams.ts          # CRUD for teams
│   │   ├── matches.ts        # Match management, signups, team generation, results
│   │   ├── memories.ts       # Match memory upload/list/delete (Cloudinary)
│   │   └── ai.ts             # AI team generation endpoint
│   └── ai/
│       └── teamBuilder.ts    # Team balancing algorithm
├── src/                       # React frontend
│   ├── main.tsx              # App entry
│   ├── App.tsx               # Router configuration
│   ├── index.css             # Global styles + @theme block (custom color tokens)
│   ├── api/
│   │   └── client.ts         # API client class (token management, all endpoints)
│   ├── context/
│   │   └── AuthContext.tsx    # Auth state management
│   ├── components/
│   │   ├── Layout.tsx        # Main layout wrapper
│   │   ├── Navbar.tsx        # Navigation bar
│   │   ├── Footer.tsx        # Footer with social links
│   │   ├── PlayerCard.tsx    # Player profile card display (FIFA-style)
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
│   │   ├── Memories.tsx      # Match memories gallery with upload
│   │   └── Admin.tsx         # Admin panel
│   └── types/                # Frontend TypeScript types
├── data/
│   └── football.db           # SQLite database file
├── public/                   # Static assets
├── dist/                     # Built frontend
├── dist-server/              # Built backend (CJS bundle via esbuild)
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
- Tailwind CSS v4 for all styling (CSS-first config with `@theme` blocks, no tailwind.config.js)
- Bangladesh Flag + FIFA 2026 theme (gold accents, green-tinted dark backgrounds)
- Route protection via `ProtectedRoute` wrapper component

### Theme System (Tailwind v4 CSS-first)
Custom color tokens defined in `src/index.css` via `@theme` block:
- `--color-page` (#0a0f0d) — page background with subtle green tint
- `--color-card` (#111c17) — card/panel backgrounds
- `--color-input` (#1a2e24) — input fields
- `--color-active` (#223828) — active/selected states
- `--color-brand` (#D4AF37) — primary accent (FIFA gold)
- `--color-brand-hover` (#C5A028) — hover state
- `--color-brand-dim` (#8B7225) — disabled state
- `--color-danger` (#E8192C) — delete/danger (Bangladesh red)
- `--color-secondary` (#9CA8A3) — secondary text
- `--color-muted` (#7A8A82) — muted text
- `--color-dim` (#5E7069) — dim text
- `--color-border-card` (#1f3028) — card borders
- `--color-border-input` (#2a4035) — input borders

### Error Handling
- Backend: try/catch in route handlers, return 4xx/5xx with `{ error: string }`
- Frontend: `.catch()` handlers display errors via `alert()` or inline error messages
- LLM failures gracefully fall back to deterministic base stats
- Database errors caught and returned as 500 responses

---

## Current Build Status & Progress

### ✅ Completed Features
- [x] User registration & login with JWT auth
- [x] Player profile creation with AI-generated stats (or manual entry)
- [x] Hybrid stat generation: deterministic math pipeline + LLM refinement
- [x] Player profile editing with automatic stat regeneration
- [x] Player overall rating calculation (position-weighted with age/activity factors)
- [x] Player stamina field and archetype description
- [x] Match creation (admin only)
- [x] Match signup with deadline enforcement (24h before match)
- [x] AI team generation with position compatibility & synergy scoring
- [x] Team balancing by player ratings
- [x] Match result recording (winner, scores, goals/assists)
- [x] Player statistics aggregation (goals, assists, matches played, wins)
- [x] Team renaming feature
- [x] Role-based access (admin vs player)
- [x] Bangladesh Flag + FIFA 2026 themed UI (gold accents, green-tinted backgrounds, subtle gradient)
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
- [x] Match memories — photo/video upload via Cloudinary (admin only)
- [x] Match memories gallery with horizontal scrolling, lightbox, video player
- [x] Multiple image uploads per match grouped together
- [x] Cloudinary integration with lazy config initialization (env var or CLOUDINARY_URL)

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
| `JWT_SECRET` | Yes* | None | JWT signing secret (*required in production, development uses fallback) |
| `ADMIN_EMAIL` | No | `********` | Admin account email |
| `ADMIN_PASSWORD` | No | `********` | Admin account password |
| `OPENROUTER_API_KEY` | No | `null` | OpenRouter API key for LLM stat generation (falls back to local generation) |
| `CLOUDINARY_CLOUD_NAME` | No | `null` | Cloudinary cloud name for memory uploads |
| `CLOUDINARY_API_KEY` | No | `null` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | No | `null` | Cloudinary API secret |
| `CLOUDINARY_URL` | No | `null` | Cloudinary connection string (alternative to individual vars) |
| `RAILWAY_VOLUME_MOUNT_PATH` | No | `null` | Railway persistent volume path |

**Note:** Copy `.env.example` to `.env` and update values for your environment. Never commit `.env` files to version control.

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
- **Seeded Data:** Admin user (credentials from env vars) auto-created
- **Tables:** users, players, teams, team_players, matches, match_signups, match_results, match_scorers, match_memories

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
| PUT | /api/players/:id | Yes | No | Update player (auto-regenerates stats if not manually provided) |
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
| GET | /api/memories | Yes | No | List all memories (grouped by match) |
| GET | /api/memories/:matchId | Yes | No | List memories for a match |
| POST | /api/memories/:matchId | Yes | Yes | Upload memory (image/video) |
| DELETE | /api/memories/:id | Yes | Yes | Delete memory |
| GET | /api/health | No | No | Health check |

---

*Generated for persistent AI coding context. Last updated: 2026-09-03*
