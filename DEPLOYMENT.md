# VibeSec Production Deployment Guide

This guide walks you through deploying VibeSec to production using:
- **Netlify** for frontend hosting
- **Render** for backend hosting
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
6. **Save this connection string** - you'll need it for Render

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
   - **Region**: Choose closest to your Render backend region
   - **Plan**: Free tier (10K commands/day)
4. Click "Create"
5. Wait for database to be created (~30 seconds)

### 2.2 Get Redis Connection URL

1. In your Upstash dashboard, click on your database
2. Go to **Details** tab
3. Find **REST API** section
4. Copy the **Redis URL** (format: `redis://default:[PASSWORD]@[HOST]:[PORT]`)
5. **Save this URL** - you'll need it for Render

---

## Step 3: Deploy Backend to Render

### 3.1 Create Render Account

1. Go to [render.com](https://render.com) and sign up/login
2. Connect your GitHub account when prompted

### 3.2 Create New Web Service

1. Click "New +" → "Web Service"
2. Connect your GitHub repository (`VibeSec`)
3. Configure the service:
   - **Name**: `vibesec-backend`
   - **Region**: Choose closest to your users
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: `backend`
   - **Runtime**: Docker
   - **Build Command**: (leave empty - Dockerfile handles it)
   - **Start Command**: (leave empty - Dockerfile handles it)
   - **Plan**: Free

**Note**: Render will use your `render.yaml` file if present, or you can configure manually in the dashboard.

### 3.3 Set Environment Variables

In Render dashboard → Environment, add:

```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@YOUR_SUPABASE_HOST:5432/postgres
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=https://your-render-app.onrender.com/api/auth/github/callback
JWT_SECRET=your_random_secret_key_at_least_32_characters
REDIS_URL=redis://default:YOUR_PASSWORD@YOUR_UPSTASH_HOST:YOUR_PORT
FRONTEND_URL=https://your-netlify-app.netlify.app
NODE_ENV=production
PORT=10000
```

**Important Notes:**
- Replace all placeholder values with your actual values
- `GITHUB_CALLBACK_URL` will be updated after deployment (use your Render service URL)
- Generate `JWT_SECRET` using: `openssl rand -hex 32` (or any random 32+ character string)
- Render sets `PORT` automatically, but include it as a fallback

### 3.4 Deploy Backend

1. Click "Create Web Service"
2. Wait for build to complete (~5-10 minutes)
3. Once deployed, copy your backend URL (format: `https://vibesec-backend.onrender.com`)
4. **Save this URL** - you'll need it for frontend and GitHub OAuth

### 3.5 Update Environment Variables

After deployment, update these variables with actual URLs:

1. Go back to **Environment Variables** in Render dashboard
2. Update `GITHUB_CALLBACK_URL` to: `https://your-render-app.onrender.com/api/auth/github/callback`
3. Update `FRONTEND_URL` after Netlify deployment (see Step 4)
4. Render will automatically redeploy with the new values

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
   BACKEND_URL=https://your-render-app.onrender.com
   ```
   Replace with your actual Render backend URL
   
   **Note**: You don't need `VITE_API_URL` if using the Netlify proxy (recommended). The proxy will handle routing to Render.

### 4.4 Deploy Frontend

1. Click "Deploy site"
2. Wait for build to complete (~2-3 minutes)
3. Once deployed, copy your frontend URL (format: `https://your-app.netlify.app` or custom domain)
4. **Save this URL**

### 4.5 Update Backend Environment Variables

1. Go back to Render dashboard
2. Update `FRONTEND_URL` environment variable to your Netlify URL
3. Render will automatically redeploy with the new value

---

## Step 5: Configure GitHub OAuth

### 5.1 Update GitHub OAuth App

1. Go to [GitHub Settings](https://github.com/settings/developers) → **OAuth Apps**
2. Click on your VibeSec OAuth app (or create a new one)
3. Update:
   - **Homepage URL**: `https://your-netlify-app.netlify.app`
   - **Authorization callback URL**: `https://your-render-app.onrender.com/api/auth/github/callback`
4. Click "Update application"
5. **Copy the Client ID and Client Secret** (if you created a new app)

### 5.2 Update Render Environment Variables

1. If you created a new OAuth app, update in Render:
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
2. Render will automatically redeploy

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

- **Check logs**: Render dashboard → Service → Logs
- **Verify environment variables**: All required variables must be set
- **Check PORT**: Render sets `PORT` automatically, but ensure your code reads from `process.env.PORT`
- **Check Docker build**: Verify Dockerfile builds successfully

### Frontend Can't Connect to Backend

- **Check CORS**: Verify `FRONTEND_URL` in Render matches Netlify URL exactly
- **Check proxy**: If using Netlify proxy, verify `BACKEND_URL` is set in Netlify environment variables
- **Check HTTPS**: Both URLs must use HTTPS in production
- **Verify proxy function**: Check Netlify function logs if using proxy

### WebSocket Connection Fails

- **Check protocol**: Should use `wss://` in production (not `ws://`)
- **Verify backend URL**: WebSocket URL is derived from API base URL
- **Check Render WebSocket support**: Render supports WebSockets, but verify service is running
- **Check service sleep**: Free tier services sleep after 15min inactivity - first request may be slow

### Database Connection Errors

- **Verify connection string**: Check Supabase connection string format
- **Check password**: Ensure password is correctly URL-encoded if special characters exist
- **Verify network**: Supabase allows connections from any IP (no IP whitelist needed)

### Redis Connection Errors

- **Verify Redis URL**: Check Upstash connection string format
- **Check free tier limits**: 10K commands/day - monitor usage in Upstash dashboard
- **Verify region**: Ensure Redis region is close to Render backend region

---

## Environment Variables Reference

### Frontend (Netlify)

| Variable | Description | Example |
|----------|-------------|---------|
| `BACKEND_URL` | Backend API URL (for proxy function) | `https://your-app.onrender.com` |
| `VITE_API_URL` | Backend API URL (optional, if not using proxy) | `https://your-app.onrender.com` |

### Backend (Render)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Supabase PostgreSQL connection string | `postgresql://postgres:pass@host:5432/postgres` |
| `GITHUB_CLIENT_ID` | GitHub OAuth Client ID | `abc123...` |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth Client Secret | `def456...` |
| `GITHUB_CALLBACK_URL` | OAuth callback URL | `https://your-app.onrender.com/api/auth/github/callback` |
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
- **Render**: 750 hours/month, sleeps after 15min inactivity
- **Netlify**: 100GB bandwidth/month, unlimited builds

### Expected Monthly Costs

- **Supabase**: $0 (free tier)
- **Upstash**: $0 (free tier)
- **Render**: $0 (free tier - 750 hours/month covers ~24/7 for one service)
- **Netlify**: $0 (free tier)

**Total**: $0/month (all free tier)

**Note**: Render free tier services sleep after 15 minutes of inactivity. First request after sleep takes ~30 seconds to wake up. This is fine for development/testing but consider upgrading for production.

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

