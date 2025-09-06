# CloudDev Setup Guide

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Install frontend dependencies
cd web-ide
npm install

# Install backend dependencies
cd ../server
npm install
```

### 2. Set Up MongoDB Atlas (Free)

1. **Create Account**: Go to [mongodb.com/atlas](https://www.mongodb.com/atlas) and sign up for free

2. **Create Cluster**:
   - Click "Build a Database"
   - Choose "M0 FREE" tier
   - Select a region close to you
   - Click "Create Cluster"

3. **Create Database User**:
   - Go to "Database Access" in sidebar
   - Click "Add New Database User"
   - Choose "Password" authentication
   - Username: `clouddev_user`
   - Password: Generate or create a strong password (save this!)
   - Click "Add User"

4. **Allow Network Access**:
   - Go to "Network Access" in sidebar
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere" (adds 0.0.0.0/0)
   - Click "Confirm"

5. **Get Connection String**:
   - Go to "Database" in sidebar
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string (looks like: `mongodb+srv://clouddev_user:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`)

### 3. Configure Environment Variables

**Backend (`server/.env`):**
```bash
cd server
cp .env.example .env
```

Edit `.env` with your MongoDB connection string:
```env
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb+srv://clouddev_user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/clouddev?retryWrites=true&w=majority
JWT_SECRET=generate-a-random-64-character-string
CLIENT_URL=http://localhost:3000
```

Generate JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Frontend (`web-ide/.env.local`):**
Already configured for local development:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

### 4. Start the Application

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd web-ide
npm run dev
```

### 5. Open in Browser

Visit [http://localhost:3000](http://localhost:3000) and start coding!

---

## 🌐 Deployment

### Deploy Frontend to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repo
3. Set root directory to `web-ide`
4. Add environment variables:
   - `NEXT_PUBLIC_API_URL=https://your-backend-url.up.railway.app`
   - `NEXT_PUBLIC_SOCKET_URL=https://your-backend-url.up.railway.app`
5. Deploy!

### Deploy Backend to Railway

1. Go to [railway.app](https://railway.app) and create account
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repo
4. Set root directory to `server`
5. Add environment variables:
   - `MONGODB_URI=your-mongodb-atlas-connection-string`
   - `JWT_SECRET=your-jwt-secret`
   - `CLIENT_URL=https://your-frontend.vercel.app`
   - `NODE_ENV=production`
6. Deploy!

---

## 📊 Database Collections

The MongoDB database will automatically create these collections:

| Collection | Description |
|------------|-------------|
| `users` | User accounts with hashed passwords |
| `projects` | Saved projects with file data |
| `rooms` | Real-time collaboration rooms |

---

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Projects
- `GET /api/projects` - List your projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project
- `PUT /api/projects/:id` - Update project
- `POST /api/projects/:id/save` - Save files
- `DELETE /api/projects/:id` - Delete project

### Rooms
- `POST /api/rooms` - Create room
- `POST /api/rooms/join/:code` - Join room
- `GET /api/rooms/:code` - Get room info
- `POST /api/rooms/:code/leave` - Leave room

---

## ❓ Troubleshooting

### MongoDB Connection Failed
- Check your IP is whitelisted in Atlas
- Verify username/password are correct
- Make sure you added `/clouddev` to the connection string

### CORS Errors
- Ensure `CLIENT_URL` in backend matches your frontend URL
- Check browser console for specific errors

### WebContainer Errors
- Use Chrome, Edge, or other Chromium browser
- WebContainers don't work in Firefox/Safari

---

## 📝 Summary of Environment Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `MONGODB_URI` | Backend | MongoDB Atlas connection string |
| `JWT_SECRET` | Backend | 64-char random string for JWT signing |
| `CLIENT_URL` | Backend | Frontend URL for CORS |
| `PORT` | Backend | Server port (default: 3001) |
| `NEXT_PUBLIC_API_URL` | Frontend | Backend API URL |
| `NEXT_PUBLIC_SOCKET_URL` | Frontend | WebSocket server URL |
