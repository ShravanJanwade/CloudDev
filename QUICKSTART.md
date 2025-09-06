# CloudDev - Quick Start Guide

## 🚀 Running Locally (Development)

### Step 1: Install Dependencies

#### Frontend
```bash
cd web-ide
npm install
```

#### Backend
```bash
cd server
npm install
```

### Step 2: Start the Servers

#### Option 1: Start Both Servers (Recommended)

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```
Server will start on `http://localhost:3001`

**Terminal 2 - Frontend:**
```bash
cd web-ide
npm run dev
```
Frontend will start on `http://localhost:3000`

#### Option 2: Frontend Only (No Collaboration)
If you just want to try the IDE without collaboration features:
```bash
cd web-ide
npm run dev
```

### Step 3: Open in Browser

Visit `http://localhost:3000` and start coding!

## 📦 What You Can Do

### Without Backend (IDE Only)
- ✅ Create projects from templates
- ✅ Edit code with Monaco editor
- ✅ Run terminal commands
- ✅ See live preview
- ❌ No real-time collaboration
- ❌ No chat
- ❌ No whiteboard

### With Backend (Full Features)
- ✅ Everything above, plus:
- ✅ Real-time collaboration
- ✅ Team chat
- ✅ Collaborative whiteboard
- ✅ Live cursors
- ✅ Participant tracking

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000 (Frontend)
npx kill-port 3000

# Kill process on port 3001 (Backend)
npx kill-port 3001
```

### WebContainer Errors
- Make sure you're using a Chromium-based browser (Chrome, Edge, Brave)
- WebContainers don't work in Firefox or Safari

### Socket Connection Errors
- Ensure backend server is running on port 3001
- Check that `.env.local` has correct `NEXT_PUBLIC_SOCKET_URL`

## 🚀 Deploying to Production

### Deploy Frontend to Vercel

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
cd web-ide
vercel
```

3. Set environment variable on Vercel dashboard:
```
NEXT_PUBLIC_SOCKET_URL=https://your-backend-url.up.railway.app
```

### Deploy Backend to Railway

1. Go to [Railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Add these environment variables:
   - `CLIENT_URL`: Your Vercel URL (e.g., `https://clouddev.vercel.app`)
   - `NODE_ENV`: `production`
   - `PORT`: Railway will auto-assign
5. Set Start Command: `cd server && npm start`
6. Deploy!

### Alternative: Deploy Both to Vercel

You can deploy both frontend and backend to Vercel:

1. Frontend stays as Next.js app
2. Backend can be deployed as Vercel Serverless Functions
3. Socket.io requires a separate deployment (use Railway, Render, or Heroku for WebSockets)

## 🎯 Next Steps

1. Customize the landing page
2. Add more project templates
3. Integrate with GitHub API for repo imports
4. Add user authentication
5. Implement project persistence with database

## 💡 Tips

- Use `Ctrl/Cmd + S` to save files
- Terminal supports all npm/node commands
- Preview updates automatically with hot reload
- Collaboration rooms are temporary (no persistence yet)

---

Need help? Check the main [README.md](./README.md) for detailed documentation.
