# CloudDev - Collaborative Cloud Development Environment

![CloudDev Banner](https://img.shields.io/badge/CloudDev-Live-blue?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![WebContainers](https://img.shields.io/badge/WebContainers-Powered-green?style=for-the-badge)

A professional, production-ready collaborative development environment that runs entirely in your browser. Built with WebContainers technology, it provides a full VS Code experience with real-time collaboration, integrated chat, whiteboard, and more.

## 🌟 Why CloudDev?

Traditional cloud IDEs (like Gitpod or Codespaces) rely on expensive server-side containers (Docker). CloudDev takes a different approach using **WebContainers**, a technology developed by StackBlitz that allows Node.js to run entirely inside the browser using WebAssembly.

- **✅ Zero Server Cost**: Application logic runs on the client.
- **✅ Instant Startup**: No waiting for containers to spin up.
- **✅ Secure**: Code executes in a browser sandbox.
- **✅ Offline Capable**: Works even with unstable connections after initial load.

## 🏗️ High-Level Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Vercel)                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Monaco    │  │  File Tree  │  │  xterm.js   │  │   Preview Frame     │ │
│  │   Editor    │  │  Explorer   │  │  Terminal   │  │   (Live Server)     │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│                                    │                                         │
│                    ┌───────────────┴───────────────┐                        │
│                    │      WebContainer API         │                        │
│                    │   (Runs Node.js in Browser)   │                        │
│                    └───────────────────────────────┘                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │ Auth, Storage, Sharing
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND (Render)                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Auth      │  │  Project    │  │  GitHub     │  │   Collaboration     │ │
│  │   Service   │  │  Storage    │  │  Integration│  │   (WebSocket)       │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│                                    │                                         │
│                    ┌───────────────┴───────────────┐                        │
│                    │      PostgreSQL (Neon)        │                        │
│                    │      + Redis (Upstash)        │                        │
│                    └───────────────────────────────┘                        │
└─────────────────────────────────────────────────────────────────────────────┘
```


## ✨ Features

### Core Capabilities
- **🎨 Monaco Editor**: Full VS Code experience with IntelliSense, syntax highlighting, and themes.
- **💻 Integrated Terminal**: Real `zsh` shell running in the browser using `xterm.js`.
- **📁 File System**: complete file creation, deletion, renaming, and drag-and-drop support.
- **�️ Live Preview**: Instant hot-reloading of your web applications.

### 🤝 Real-Time Collaboration
- **Live Cursors**: See exactly where your teammates are editing.
- **Room-based Workflow**: Create rooms and share codes to invite others.
- **Whiteboard**: Built-in Excalidraw-like whiteboard for architecture discussions.
- **Chat**: Persistent chat history for team communication.

### ⚡ Powered by WebContainers
- **Full Node.js Runtime**: Run `npm install`, `npm run dev`, and other commands directly.
- **In-Browser Server**: The "server" runs inside the service worker, allowing valid `localhost` URLs.

## 📦 Tech Stack

| Layer | Technology | Why This Choice |
|-------|------------|-----------------|
| **Frontend** | Next.js 14 + React | App Directory, Server Actions, Best-in-class DX |
| **Styling** | Tailwind CSS + Shadcn/UI | Professional, accessible, and themeable UI components |
| **Editor** | Monaco Editor | The industry standard (powers VS Code) |
| **Runtime** | WebContainers | Run Node.js securely in the browser via WASM |
| **Terminal** | xterm.js | Full-featured terminal emulator |
| **Backend** | Node.js + Express | Robust handling of WebSocket connections |
| **Realtime** | Socket.IO | Reliable event-based communication for collaboration |
| **State** | Zustand | Lightweight, performant global state management |
| **Database** | MongoDB / PostgreSQL | Persistent storage for user profiles and projects |

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### 1. Clone Capabilities
```bash
git clone https://github.com/your-username/clouddev.git
cd clouddev
```

### 2. Frontend Setup
The frontend contains the IDE logic and WebContainer integration.
```bash
cd web-ide
npm install
npm run dev
# Runs on http://localhost:3000
```

### 3. Backend Setup
The backend handles authentication and real-time socket coordination.
```bash
cd server
npm install
npm run dev
# Runs on http://localhost:3001
```

### 4. Environment Variables

**Frontend (`web-ide/.env.local`)**
```env
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

**Backend (`server/.env`)**
```env
PORT=3001
CLIENT_URL=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/clouddev
# Optional: GitHub OAuth credentials
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

## 📂 Project Structure

### Frontend (`/web-ide`)
```
src/
├── app/                  # Next.js App Router pages
├── components/
│   ├── ide/             # Core IDE components
│   │   ├── Editor/      # Monaco wrapper
│   │   ├── Terminal/    # xterm.js integration
│   │   ├── FileTree/    # File explorer
│   │   └── Preview/     # Live preview iframe
│   ├── collaboration/   # Chat, Whiteboard, Cursor tracking
│   └── ui/              # Shared Shadcn UI components
├── lib/
│   ├── webcontainer/    # Singleton instance & filesystem helpers
│   └── api/             # API client for backend
└── stores/              # Zustand stores (editor, files, auth)
```

### Backend (`/server`)
```
src/
├── socket/              # Socket.IO handlers
│   ├── rooms.ts         # Room logic, joining/leaving
│   └── collaboration.ts # Cursor typing, whiteboard events
├── models/              # Mongoose schemas (User, Room)
├── routes/              # Express API routes
└── middleware/          # Auth & validation
```

## 💾 Database Schema

The project uses a structured schema to manage users and collaborative sessions.

**Users**
- `id`: Unique identifier
- `name`: Display name
- `email`: User email (for auth)
- `avatar`: Profile picture URL

**Rooms**
- `code`: 6-character unique join code
- `host`: Reference to User who created it
- `participants`: List of active users
- `isActive`: Boolean flag for open rooms

## 🛠️ Core Implementation Concepts

### The WebContainer Singleton
To ensure performance, we maintain a single instance of the WebContainer boot process. This prevents multiple boot attempts and manages the virtual file system lifecycle. See `src/lib/webcontainer/instance.ts`.

### File System Synchronization
We use specific hooks (`useFileSystem`) to bridge the React UI with the WebContainer FS. When you create a file in the UI, it writes to the persistent virtual filesystem, which triggers the 'file-change' events that update the internal Node.js server.

### Real-Time Sync Strategy
- **Code Changes**: We broadcast operational changes rather than full file replacement to avoid overwriting remote work.
- **Cursors**: Throttled events (every ~50ms) send X/Y coordinates to minimize network traffic while maintaining smoothness.
- **Whiteboard**: Uses a command-based approach (draw-stroke, clear) to replay history for new joiners.

## 🤝 Contributing
Contributions are welcome! Please read the contribution guidelines before submitting a pull request.

## 📄 License
MIT License. Free for personal and commercial use.

---
**Built with ❤️ by Shravankumar Janawade**
