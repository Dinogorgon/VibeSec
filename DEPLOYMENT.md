# VibeSec Production Deployment Guide

This guide walks you through deploying VibeSec to production using:
- **Netlify** for frontend hosting
- **Zeabur** for backend hosting
- **Supabase** for PostgreSQL database
- **Upstash** for Redis (job queue)

## Prerequisites

- GitHub account with your VibeSec repository
- GitHub OAuth App (or create one during setup)
- All code pushed to GitHub

---

## Step 1: Set Up Supabase Database

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in:
   - **Name**: `vibesec` (or your preferred name)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is sufficient
4. Click "Create new project"
5. Wait for project to finish provisioning (~2 minutes)

### 1.2 Get Database Connection String

1. In your Supabase project dashboard, go to **Settings** → **Database**
2. Scroll to **Connection string** section
3. Select **URI** tab
4. Copy the connection string (format: `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`)
5. Replace `[PASSWORD]` with your database password you created
6. **Save this connection string** - you'll need it for Zeabur

### 1.3 Run Database Migrations

1. Open your local terminal
2. Navigate to the backend directory:
   ```bash
   cd backend
   ```
3. Temporarily set your DATABASE_URL:
   ```bash
   # Windows PowerShell:
   $env:DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@YOUR_HOST:5432/postgres"
   
   # Linux/Mac:
   export DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@YOUR_HOST:5432/postgres"
   ```
4. Run migrations:
   ```bash
   npm run migrate
   ```
5. Verify tables were created in Supabase:
   - Go to **Table Editor** in Supabase dashboard
   - You should see: `users`, `scans`, `vulnerabilities`, `ai_fixes`

---

## Step 2: Set Up Upstash Redis

### 2.1 Create Upstash Account

1. Go to [upstash.com](https://upstash.com) and sign up/login
2. Click "Create Database"
3. Fill in:
   - **Name**: `vibesec-redis` (or your preferred name)
   - **Type**: Regional (free tier)
   - **Region**: Choose closest to your Zeabur backend region
   - **Plan**: Free tier (10K commands/day)
4. Click "Create"
5. Wait for database to be created (~30 seconds)

### 2.2 Get Redis Connection URL

1. In your Upstash dashboard, click on your database
2. Go to **Details** tab
3. Find **REST API** section
4. Copy the **Redis URL** (format: `redis://default:[PASSWORD]@[HOST]:[PORT]`)
5. **Save this URL** - you'll need it for Zeabur

---

## Step 3: Deploy Backend to Zeabur

### 3.1 Create Zeabur Account

1. Go to [zeabur.com](https://zeabur.com) and sign up/login
2. Click "New Project"
3. Name your project: `vibesec`

### 3.2 Connect GitHub Repository

1. In your Zeabur project, click "New Service"
2. Select "GitHub"
3. Authorize Zeabur to access your GitHub account (if prompted)
4. Find and select your `VibeSec` repository
5. Zeabur will auto-detect it's a Node.js project

### 3.3 Configure Backend Service

1. **Service Name**: `vibesec-backend` (or keep default)
2. **Root Directory**: Leave empty (or set to `backend` if needed)
3. **Build Command**: `cd backend && npm install && npm run build`
4. **Start Command**: `cd backend && npm start`
5. **Port**: Zeabur will auto-detect (defaults to 10000)

### 3.4 Set Environment Variables

In Zeabur service settings, go to **Environment Variables** and add:

```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@YOUR_SUPABASE_HOST:5432/postgres
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=https://your-zeabur-app.zeabur.app/api/auth/github/callback
JWT_SECRET=your_random_secret_key_at_least_32_characters
REDIS_URL=redis://default:YOUR_PASSWORD@YOUR_UPSTASH_HOST:YOUR_PORT
FRONTEND_URL=https://your-netlify-app.netlify.app
NODE_ENV=production
PORT=10000
```

**Important Notes:**
- Replace all placeholder values with your actual values
- `GITHUB_CALLBACK_URL` and `FRONTEND_URL` will be updated after deployment
- Generate `JWT_SECRET` using: `openssl rand -hex 32` (or any random 32+ character string)

### 3.5 Deploy Backend

1. Click "Deploy" or "Save"
2. Wait for build to complete (~3-5 minutes)
3. Once deployed, copy your backend URL (format: `https://your-app.zeabur.app`)
4. **Save this URL** - you'll need it for frontend and GitHub OAuth

### 3.6 Update Environment Variables

After deployment, update these variables with actual URLs:

1. Go back to **Environment Variables**
2. Update `GITHUB_CALLBACK_URL` to: `https://your-zeabur-app.zeabur.app/api/auth/github/callback`
3. Update `FRONTEND_URL` after Netlify deployment (see Step 4)

---

## Step 4: Deploy Frontend to Netlify

### 4.1 Create Netlify Account

1. Go to [netlify.com](https://netlify.com) and sign up/login
2. Click "Add new site" → "Import an existing project"
3. Select "GitHub"
4. Authorize Netlify to access your GitHub account (if prompted)

### 4.2 Configure Build Settings

1. **Repository**: Select your `VibeSec` repository
2. **Branch**: `main` (or your default branch)
3. **Build command**: `npm run build` (auto-detected from `netlify.toml`)
4. **Publish directory**: `dist` (auto-detected from `netlify.toml`)
5. Click "Show advanced" → **Base directory**: Leave empty (root)

### 4.3 Set Environment Variables

1. Click "Show advanced" → "New variable"
2. Add:
   ```
   VITE_API_URL=https://your-zeabur-app.zeabur.app
   ```
   Replace with your actual Zeabur backend URL

### 4.4 Deploy Frontend

1. Click "Deploy site"
2. Wait for build to complete (~2-3 minutes)
3. Once deployed, copy your frontend URL (format: `https://your-app.netlify.app` or custom domain)
4. **Save this URL**

### 4.5 Update Backend Environment Variables

1. Go back to Zeabur dashboard
2. Update `FRONTEND_URL` environment variable to your Netlify URL
3. Zeabur will automatically redeploy with the new value

---

## Step 5: Configure GitHub OAuth

### 5.1 Update GitHub OAuth App

1. Go to [GitHub Settings](https://github.com/settings/developers) → **OAuth Apps**
2. Click on your VibeSec OAuth app (or create a new one)
3. Update:
   - **Homepage URL**: `https://your-netlify-app.netlify.app`
   - **Authorization callback URL**: `https://your-zeabur-app.zeabur.app/api/auth/github/callback`
4. Click "Update application"
5. **Copy the Client ID and Client Secret** (if you created a new app)

### 5.2 Update Zeabur Environment Variables

1. If you created a new OAuth app, update in Zeabur:
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
2. Zeabur will automatically redeploy

---

## Step 6: Post-Deployment Verification

### 6.1 Test Authentication Flow

1. Visit your Netlify frontend URL
2. Click "Login with GitHub"
3. Authorize the application
4. Verify you're redirected back and logged in

### 6.2 Test Scan Functionality

1. While logged in, enter a GitHub repository URL
2. Click "Start Scan"
3. Verify:
   - Scan starts successfully
   - Progress updates appear in real-time (WebSocket)
   - Scan completes and shows results

### 6.3 Test AI Fix Generation

1. Find a vulnerability in scan results
2. Click "Fix with AI"
3. Verify:
   - Fix is generated and displayed
   - Diff view shows correctly
   - Accept/Deny/Reprompt buttons work

### 6.4 Verify WebSocket Connections

1. Open browser DevTools → Network tab
2. Filter by "WS" (WebSocket)
3. Start a scan
4. Verify WebSocket connection is established (should show `wss://` in production)

---

## Troubleshooting

### Backend Won't Start

- **Check logs**: Zeabur dashboard → Service → Logs
- **Verify environment variables**: All required variables must be set
- **Check PORT**: Should be `10000` or use `process.env.PORT`

### Frontend Can't Connect to Backend

- **Check CORS**: Verify `FRONTEND_URL` in Zeabur matches Netlify URL exactly
- **Check API URL**: Verify `VITE_API_URL` in Netlify matches Zeabur backend URL
- **Check HTTPS**: Both URLs must use HTTPS in production

### WebSocket Connection Fails

- **Check protocol**: Should use `wss://` in production (not `ws://`)
- **Verify backend URL**: WebSocket URL is derived from `VITE_API_URL`
- **Check firewall**: Zeabur should allow WebSocket connections

### Database Connection Errors

- **Verify connection string**: Check Supabase connection string format
- **Check password**: Ensure password is correctly URL-encoded if special characters exist
- **Verify network**: Supabase allows connections from any IP (no IP whitelist needed)

### Redis Connection Errors

- **Verify Redis URL**: Check Upstash connection string format
- **Check free tier limits**: 10K commands/day - monitor usage in Upstash dashboard
- **Verify region**: Ensure Redis region is close to Zeabur backend region

---

## Environment Variables Reference

### Frontend (Netlify)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://your-app.zeabur.app` |

### Backend (Zeabur)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Supabase PostgreSQL connection string | `postgresql://postgres:pass@host:5432/postgres` |
| `GITHUB_CLIENT_ID` | GitHub OAuth Client ID | `abc123...` |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth Client Secret | `def456...` |
| `GITHUB_CALLBACK_URL` | OAuth callback URL | `https://your-app.zeabur.app/api/auth/github/callback` |
| `JWT_SECRET` | Secret for JWT tokens (32+ chars) | Random string |
| `REDIS_URL` | Upstash Redis connection URL | `redis://default:pass@host:port` |
| `FRONTEND_URL` | Netlify frontend URL (for CORS) | `https://your-app.netlify.app` |
| `NODE_ENV` | Environment | `production` |
| `PORT` | Server port | `10000` |

---

## Cost Estimates

### Free Tier Limits

- **Supabase**: 500MB database, 2GB bandwidth/month
- **Upstash Redis**: 10K commands/day
- **Zeabur**: $5/month credit (may exceed with usage)
- **Netlify**: 100GB bandwidth/month, unlimited builds

### Expected Monthly Costs

- **Supabase**: $0 (free tier)
- **Upstash**: $0 (free tier)
- **Zeabur**: $0-10 (depends on usage, $5 credit covers light usage)
- **Netlify**: $0 (free tier)

**Total**: ~$0-10/month depending on Zeabur usage

---

## Next Steps

- Set up custom domains (optional)
- Configure monitoring and alerts
- Set up CI/CD for automatic deployments
- Monitor usage and costs in each platform dashboard
- Consider upgrading plans as your app grows

---

## Support

If you encounter issues:
1. Check platform-specific documentation
2. Review logs in each platform's dashboard
3. Verify all environment variables are set correctly
4. Ensure all URLs use HTTPS in production

