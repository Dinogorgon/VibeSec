# Local Testing Guide

## Quick Start

### 1. Start Backend Server

The backend must be running for login to work. Open a terminal and run:

```bash
cd backend
npm run dev
```

**Important**: The backend requires environment variables. Create a `.env` file in the `backend` directory with:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/postgres
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:3000/api/auth/github/callback
JWT_SECRET=your_random_secret_key_here
REDIS_URL=redis://localhost:6379
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### 2. Start Frontend Server

In a separate terminal:

```bash
npm run dev
```

The frontend will run on `http://localhost:5173` (default Vite port).

### 3. Verify Backend is Running

Check that the backend health endpoint responds:

```bash
curl http://localhost:3000/health
```

Should return: `{"status":"ok"}`

### 4. Test Login

1. Open `http://localhost:5173` in your browser
2. Click "Login with GitHub"
3. Should redirect to GitHub OAuth page
4. After authorizing, should redirect back with token

## Troubleshooting

### Login Page Fails to Load

- **Check backend is running**: Look for "Server running on port 3000" in backend terminal
- **Check CORS**: Ensure `FRONTEND_URL` in backend `.env` matches your frontend URL (`http://localhost:5173`)
- **Check environment variables**: All required variables must be set in `backend/.env`

### Demo Repo Button Shows Alert Instead of Modal

- Clear browser cache and refresh
- Check browser console for errors
- Verify `LoginPromptModal.tsx` was created correctly

### ECONNRESET Errors

- These are now handled gracefully with retry logic
- Check backend logs for connection warnings (non-fatal)
- Verify database and Redis are accessible

