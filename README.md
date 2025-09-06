# CloudDev - Collaborative Cloud Development Environment

![CloudDev Banner](https://img.shields.io/badge/CloudDev-Live-blue?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![WebContainers](https://img.shields.io/badge/WebContainers-Powered-green?style=for-the-badge)

A professional, production-ready collaborative development environment that runs entirely in your browser. Built with WebContainers technology, it provides a full VS Code experience with real-time collaboration, integrated chat, whiteboard, and more.

## ✨ Features

### Core IDE Features
- **🎨 Monaco Editor** - Full VS Code editing experience with IntelliSense, syntax highlighting, and multi-cursor support
- **📁 File Explorer** - Intuitive file tree with create, delete,  rename, and context menus
- **💻 Integrated Terminal** - Full shell access, run any CLI tools (npm, node, git) directly in browser
- **👁️ Live Preview** - See changes instantly with hot module reload
- **🎯 Multiple Templates** - Quick start with React, Node.js, or Vanilla JS projects

### Collaboration Features
- **👥 Real-Time Collaboration** - Multiple users can edit code simultaneously
- **🎨 Live Cursors** - See where other developers are working in real-time
- **💬 Integrated Chat** - Discuss code without leaving the editor
- **🎨 Collaborative Whiteboard** - Draw diagrams and explain concepts visually
- **📡 Presence Indicators** - See who's online and what they're working on

### Additional Features
- **🔗 GitHub Integration** - Import repositories directly from GitHub
- **⚡ Lightning Fast** - WebContainer technology means no server spin-up delays
- **🎨 Premium UI** - Beautiful, modern interface with glassmorphism and smooth animations
- **🔒 Secure** - Code runs in sandboxed browser environment
- **📱 Responsive** - Works on desktop, tablet, and mobile devices

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Frontend Setup

```bash
# Navigate to frontend directory
cd web-ide

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:3000`

### Backend Setup (For Collaboration Features)

```bash
# Navigate to backend directory
cd server

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Start development server
npm run dev
```

The backend server will be available at `http://localhost:3001`

### Environment Variables

**Frontend (`web-ide/.env.local`):**
```env
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

**Backend (`server/.env`):**
```env
PORT=3001
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

## 📦 Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Smooth animations
- **@monaco-editor/react** - VS Code editor component
- **@webcontainer/api** - Run Node.js in the browser
- **Socket.io Client** - Real-time communication
- **Yjs** - CRDT for collaborative editing
- **Zustand** - State management
- **xterm.js** - Terminal emulator

### Backend
- **Express.js** - Web server framework
- **Socket.io** - WebSocket server for real-time features
- **Yjs** - Operational transformation for collaboration
- **TypeScript** - Type-safe backend development

## 🏗️ Project Structure

```
CloudDev/
├── web-ide/                    # Frontend Next.js application
│   ├── src/
│   │   ├── app/                # Next.js app router pages
│   │   ├── components/
│   │   │   ├── ide/            # IDE components (Editor, Terminal, Preview)
│   │   │   ├── collaboration/  # Collaboration components (Chat, Whiteboard)
│   │   │   └── ui/             # Reusable UI components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── stores/             # Zustand state stores
│   │   └── lib/                # Utilities and helpers
│   └── package.json
│
├── server/                     # Backend Node.js server
│   ├── src/
│   │   ├── socket/             # Socket.io event handlers
│   │   │   ├── rooms.ts        # Room management
│   │   │   └── collaboration.ts # Chat, whiteboard handlers
│   │   └── index.ts            # Express server setup
│   └── package.json
│
└── README.md
```

## 🎯 Usage

### Creating a New Project

1. Visit the homepage
2. Click on a template (React, Node.js, or Vanilla JS)
3. Start coding instantly!

### Importing from GitHub

1. Enter a GitHub repository URL on the homepage
2. Click "Launch"
3. The repository will be cloned and ready to edit

### Collaborating with Others

1. Click "Start Collaborating" on the homepage
2. Share the room URL with teammates
3. Code together in real-time!

## 🚢 Deployment

### Deploy Frontend to Vercel

```bash
cd web-ide
vercel
```

### Deploy Backend to Railway

1. Create a new project on [Railway](https://railway.app)
2. Connect your GitHub repository
3. Set environment variables:
   - `CLIENT_URL`: Your Vercel frontend URL
   - `NODE_ENV`: production
4. Deploy!

### Environment Variables for Production

**Frontend:**
```env
NEXT_PUBLIC_SOCKET_URL=https://your-backend-url.railway.app
```

**Backend:**
```env
CLIENT_URL=https://your-frontend-url.vercel.app
NODE_ENV=production
```

## 🎨 Features Showcase

### Premium Landing Page
- Animated gradients and glassmorphism effects
- Smooth Framer Motion animations
- Responsive design for all devices

### Professional IDE Interface
- VS Code-inspired layout
- Resizable panels
- Dark theme optimized for long coding sessions

### Real-Time Collaboration
- See live cursors with participant names
- Synchronized code editing
- Integrated chat for team communication
- Collaborative whiteboard for visual explanations

## 🛠️ Development

### Adding New Templates

Edit `src/lib/utils/templates.ts` to add new project templates.

### Customizing Themes

Modify `tailwind.config.ts` for color schemes and design tokens.

### Extending Collaboration Features

Add new socket event handlers in `server/src/socket/collaboration.ts`.

## 📝 API Documentation

### WebSocket Events

**Room Management:**
- `room:join` - Join a collaboration room
- `room:leave` - Leave a room
- `room:participants` - Get list of participants
- `room:participant-joined` - Participant joined notification
- `room:participant-left` - Participant left notification

**Collaboration:**
- `chat:message` - Send chat message
- `chat:history` - Get chat history
- `cursor:update` - Update cursor position
- `whiteboard:draw` - Draw on whiteboard
- `whiteboard:clear` - Clear whiteboard

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - feel free to use this project for your portfolio or commercial applications.

## 👨‍💻 Author

**Shravankumar Janawade**

Built with ❤️ using WebContainers, Next.js, and Socket.io

## 🙏 Acknowledgments

- [WebContainers](https://webcontainers.io/) by StackBlitz for amazing in-browser Node.js runtime
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) by Microsoft for VS Code editor component
- [Socket.io](https://socket.io/) for reliable real-time communication
- [Yjs](https://yjs.dev/) for conflict-free collaborative editing

---

⭐ If you find this project useful, please consider giving it a star on GitHub!
