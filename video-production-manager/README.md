# Video Production Manager

A professional web application for managing video production workflows, built with React, TypeScript, and a PostgreSQL backend. This app is designed for AV production teams to manage sources, sends, screens, IP addresses, and production checklists with **cloud-first planning** and **offline-capable on-site operations**.

![Video Production Manager](https://via.placeholder.com/800x400/0a0e14/00ff88?text=Video+Production+Manager)

## 🎯 Architecture: Cloud + Local Sync

- **Planning Phase (Office)**: Collaborate via cloud database
- **On-Site (Venue)**: Promote any laptop to LAN server for fast local operations
- **Offline-First**: Continue working without internet
- **Auto-Sync**: Server syncs to cloud when connectivity allows

**[→ Database Architecture Documentation](docs/DATABASE_ARCHITECTURE.md)**

## 📚 Documentation

### Getting Started
- **[Frontend Tutorial](docs/GETTING_STARTED_TUTORIAL.md)** - React/TypeScript/Tailwind basics
- **[Database Setup](docs/GETTING_STARTED_DATABASE.md)** - Setting up the backend
- **[Implementation Summary](docs/IMPLEMENTATION_SUMMARY.md)** - What's been built

### Architecture
- **[Database Architecture](docs/DATABASE_ARCHITECTURE.md)** - Hybrid cloud + local design
- **[Implementation Roadmap](docs/IMPLEMENTATION_ROADMAP.md)** - Development plan
- **[AI Agent Protocol](docs/AI_AGENT_PROTOCOL.md)** - Development guidelines

## Features

- **Dashboard** - Overview of production status, progress tracking, and quick stats
- **Sources Management** - Track all video inputs (laptops, cameras, servers, etc.)
- **Sends/Destinations** - Manage video outputs to screens, monitors, and recorders
- **Screen Configuration** - LED and projection screen specifications
- **Video Switchers** - E2, Q8, and other video processor I/O mapping
- **IP Management** - Network configuration and device IP allocation
- **Production Checklist** - Track pre-production and setup tasks with due dates
- **Scaling Calculator** - Resolution scaling, pixel-to-inch conversions, LED pitch reference
- **Cable Management** - Snake and cable routing (extensible)
- **Dark Theme** - Professional AV-inspired dark interface with signal-type color coding

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **Zustand** - Lightweight state management with persistence
- **Lucide React** - Icon library
- **date-fns** - Date utilities

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Open the project folder in VS Code:**
   ```bash
   cd video-production-manager
   code .
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   The app will automatically open at `http://localhost:3000`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` folder.

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
video-production-manager/
├── docs/                  # 📚 Documentation
│   ├── GETTING_STARTED_TUTORIAL.md  # Beginner's guide
│   └── SOURCE_SEND_MODELS.md        # Model/service docs
├── public/                # Static assets
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── ui/          # Base UI components (Card, Badge, Button, etc.)
│   │   └── Layout.tsx   # Main layout with sidebar navigation
│   ├── models/          # ✨ Class-based data models
│   │   ├── Source.ts    # Source class with validation & methods
│   │   ├── Send.ts      # Send class with validation & methods
│   │   └── index.ts     # Export all models
│   ├── services/        # ✨ Business logic & operations
│   │   ├── SourceService.ts  # Source CRUD & utilities
│   │   ├── SendService.ts    # Send CRUD & utilities
│   │   └── index.ts          # Export all services
│   ├── data/            # Sample data and constants
│   │   └── sampleData.ts # Pre-loaded production data
│   ├── hooks/           # Custom React hooks
│   │   └── useStore.ts  # Zustand store with selectors
│   ├── pages/           # Page components
│   │   ├── Dashboard.tsx
│   │   ├── Sources.tsx
│   │   ├── Sends.tsx
│   │   ├── IPManagement.tsx
│   │   ├── Checklist.tsx
│   │   ├── Calculator.tsx
│   │   └── OtherPages.tsx
│   ├── styles/          # Global styles
│   │   └── globals.css  # Tailwind + custom styles
│   ├── types/           # TypeScript type definitions
│   │   └── index.ts     # All interfaces and types
│   ├── utils/           # Helper functions
│   │   └── helpers.ts   # Utility functions
│   ├── App.tsx          # Main app component
│   └── main.tsx         # Entry point
├── index.html           # HTML template
├── package.json         # Dependencies and scripts
├── tailwind.config.js   # Tailwind configuration
├── tsconfig.json        # TypeScript configuration
└── vite.config.ts       # Vite configuration
```

## Customization

### Adding Your Production Data

The app comes pre-loaded with sample data. To use your own data:

1. Modify `src/data/sampleData.ts` with your production information
2. Or use the Settings page to import/export JSON data
3. Data persists in localStorage between sessions

### Extending Types

All TypeScript interfaces are defined in `src/types/index.ts`. Add new fields or types as needed for your workflow.

### Theming

Colors are defined in `tailwind.config.js` under the `colors` section:
- `av-*` - Base application colors
- `signal-*` - Connector type colors (SDI, HDMI, DP, Fiber)

### Adding New Pages

1. Create a new component in `src/pages/`
2. Add navigation item in `src/components/Layout.tsx` (`navItems` array)
3. Add the route case in `src/App.tsx` (`renderPage` function)

## Data Model

The app models professional AV production data including:

- **Production** - Show info (client, venue, dates)
- **Source** - Video inputs with resolution, frame rate, connector type
- **Send** - Video outputs/destinations
- **LEDScreen** - LED wall specifications (tiles, pixels, processor)
- **IPAddress** - Network device allocation
- **ChecklistItem** - Production tasks with categories and due dates
- **VideoSwitcher** - Processor I/O mapping (E2, Q8, etc.)

## VS Code Recommendations

For the best development experience, install these VS Code extensions:

- **ESLint** - Linting
- **Prettier** - Code formatting
- **Tailwind CSS IntelliSense** - Tailwind autocomplete
- **TypeScript Importer** - Auto-import suggestions

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## Browser Support

- Chrome 90+
- Firefox 90+
- Safari 14+
- Edge 90+

## License

MIT License - Feel free to use and modify for your productions.

---

Built for professional video production teams. Based on industry-standard workflows and data structures from production planning spreadsheets.
