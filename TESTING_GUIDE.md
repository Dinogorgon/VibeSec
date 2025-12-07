# VibeSec Testing Guide

## ✅ Pre-Testing Checklist

### Backend Environment Variables (`backend/.env.local`)

Make sure you have all these variables set:

```env
# Database Configuration (Supabase)
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres

# GitHub OAuth Configuration
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:3000/api/auth/github/callback

# JWT Secret (any random string, at least 32 characters)
JWT_SECRET=your_random_secret_key_here

# Redis Configuration (Redis Cloud)
REDIS_URL=redis://default:YOUR_PASSWORD@redis-xxxxx.cloud.redislabs.com:12345

# Server Configuration
PORT=3000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

### Frontend Environment Variables (root `.env`)

Create a `.env` file in the root directory:

```env
VITE_API_URL=http://localhost:3000
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

## 🚀 Step-by-Step Testing Instructions

### Step 1: Verify Database Setup

The database migration has already been applied via MCP. Verify tables exist:

- ✅ `users` table
- ✅ `scans` table  
- ✅ `vulnerabilities` table

**Note:** For future migrations, use Supabase MCP instead of `npm run migrate`.

### Step 2: Start Backend Server

Open **Terminal 1**:

```powershell
cd backend
npm run dev
```

**Expected output:**
```
Server running on port 3000
Environment: development
```

**If you see Redis eviction warnings:** These are non-critical but you can fix them in Redis Cloud dashboard (change eviction policy to `noeviction`).

### Step 3: Start Frontend Server

Open **Terminal 2** (new terminal window):

```powershell
npm run dev
```

**Expected output:**
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
```

### Step 4: Test GitHub OAuth Authentication

1. Open browser to `http://localhost:5173`
2. Click **"Login with GitHub"** button in the header
3. You'll be redirected to GitHub authorization page
4. Click **"Authorize"** 
5. You should be redirected back to `http://localhost:5173?token=...`
6. The token should be stored in localStorage
7. Header should show your GitHub username and "Logout" button

**Troubleshooting:**
- If redirect fails, check `GITHUB_CALLBACK_URL` matches exactly
- If token not stored, check browser console for errors
- If user not created, check backend logs for database errors

### Step 5: Test Repository Scanning

1. On the home page, enter a GitHub repository URL:
   - Example: `https://github.com/vercel/next.js`
   - Or use a smaller test repo: `https://github.com/octocat/Hello-World`

2. Click **"Start Scan"** button

3. You should see:
   - **Scanner View** with animated shield icon
   - **Terminal window** showing scan progress
   - **Progress bar** filling up
   - **Real-time log messages** via WebSocket:
     - "Connecting to repository..."
     - "Detecting Tech Stack..."
     - "Analyzing dependency tree..."
     - "Crawling for exposed .env variables..."
     - "Checking OWASP Top 10 vulnerabilities..."
     - etc.

4. Wait for scan to complete (usually 30-60 seconds)

**Troubleshooting:**
- If scan doesn't start, check backend logs for errors
- If WebSocket fails, check browser console
- If scan hangs, check Redis connection and BullMQ worker logs

### Step 6: View Scan Results

After scan completes, you should automatically see:

1. **Security Score** (0-100)
2. **Detected Tech Stack** badges (React, Next.js, etc.)
3. **Vibe Status** indicator
4. **Vulnerabilities List** with:
   - Severity badges (Critical, High, Medium, Low)
   - Title and description
   - File location
   - "Fix with AI" button

### Step 7: Test AI Fix Generation

1. Click **"Fix with AI"** on any vulnerability
2. Modal should open showing:
   - Loading spinner
   - Generated fix code from Gemini API
   - Code blocks with "Before" and "After" sections
   - Copy button

**Troubleshooting:**
- If fix doesn't generate, check `VITE_GEMINI_API_KEY` is set
- If API error, check browser console for Gemini API errors

### Step 8: Test Logout

1. Click **"Logout"** button in header
2. Token should be removed from localStorage
3. You should be redirected to home page
4. Header should show "Login with GitHub" again

## 🔍 Testing Different Scenarios

### Test Public Repository
- Use: `https://github.com/vercel/next.js`
- Should work without authentication issues

### Test Private Repository (if you have access)
- Use your own private repo
- Should clone and scan successfully

### Test Invalid Repository URL
- Enter: `https://github.com/invalid/repo-that-does-not-exist`
- Should show error message

### Test Multiple Scans
- Start multiple scans in sequence
- Each should have unique scan ID
- Results should be separate

## 🐛 Common Issues & Solutions

### Issue: "Missing required environment variable"
**Solution:** Check `.env.local` has all required variables

### Issue: "ECONNREFUSED" database error
**Solution:** Verify `DATABASE_URL` is correct and Supabase is accessible

### Issue: "BullMQ: Your redis options maxRetriesPerRequest must be null"
**Solution:** Already fixed in `scanQueue.ts` - restart backend if still seeing this

### Issue: WebSocket connection fails
**Solution:** 
- Check backend is running on port 3000
- Check `FRONTEND_URL` matches frontend URL exactly
- Check browser console for CORS errors

### Issue: GitHub OAuth redirect fails
**Solution:**
- Verify `GITHUB_CALLBACK_URL` is exactly: `http://localhost:3000/api/auth/github/callback`
- Check GitHub OAuth app settings match

### Issue: Scan hangs or doesn't complete
**Solution:**
- Check Redis connection (should see no errors in backend logs)
- Check BullMQ worker is running (should see "Processing scan job" messages)
- Check database connection (should see query logs in development mode)

## 📊 Expected Behavior Summary

| Action | Expected Result |
|--------|----------------|
| Start backend | Server runs on port 3000, no errors |
| Start frontend | Dev server runs on port 5173 |
| Login with GitHub | Redirects, stores token, shows username |
| Start scan | Shows scanning view, WebSocket connects |
| Scan progress | Real-time logs appear, progress bar fills |
| Scan complete | Results view shows with vulnerabilities |
| Click "Fix with AI" | Modal opens with generated fix code |
| Logout | Token removed, redirected to home |

## ✅ Success Criteria

Your application is working correctly if:

- ✅ Backend starts without errors
- ✅ Frontend starts without errors  
- ✅ GitHub OAuth login works
- ✅ Can start a scan
- ✅ WebSocket shows real-time progress
- ✅ Scan completes and shows results
- ✅ AI fix generation works
- ✅ Logout works

## 🎯 Next Steps After Testing

Once everything works:

1. **Test with real repositories** you want to scan
2. **Review security findings** to ensure scanner is detecting issues correctly
3. **Test AI fixes** to ensure they're accurate and helpful
4. **Monitor performance** - check scan times and resource usage
5. **Set up production environment** when ready to deploy

---

**Note:** The hybrid approach is working:
- **Migrations:** Use Supabase MCP (already applied ✅)
- **Runtime:** Uses `DATABASE_URL` from `.env.local` for connection pool ✅

