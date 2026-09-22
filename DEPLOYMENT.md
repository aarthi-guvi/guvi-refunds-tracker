# Deployment Guide - Free Tier

This guide explains how to deploy the GUVI Refunds Tracker using free tiers of Vercel (frontend) and Render (backend).

## Prerequisites

- GitHub account
- Vercel account (free)
- Render account (free)
- Neon PostgreSQL account (free tier recommended) OR use Render's free PostgreSQL

---

## 🚀 Step 1: Deploy Backend on Render (Free Tier)

### 1.1 Push Code to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/guvi-refunds-tracker.git
git push -u origin main
```

### 1.2 Deploy to Render

1. Go to [render.com](https://render.com) and sign up/login
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `guvi-refunds-backend`
   - **Region**: Choose closest to you
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free` (important!)

5. Add Environment Variables:
   - `NODE_ENV` = `production`
   - `PORT` = `4000`
   - `JWT_SECRET` = (generate a random string, e.g., use [generate-secret.vercel.app](https://generate-secret.vercel.app/32))
   - `JWT_EXPIRES_IN` = `8h`
   - `DATABASE_URL` = (from Step 1.3)

6. Click **"Create Web Service"**

### 1.3 Set Up PostgreSQL Database (Free Option A: Render PostgreSQL)

1. In Render dashboard, click **"New +"** → **"PostgreSQL"**
2. Configure:
   - **Name**: `guvi-refunds-db`
   - **Database Name**: `guvi_refunds`
   - **User**: `guvi_user`
   - **Region**: Same as your web service
   - **Plan**: `Free` (90 days free, then $7/month - you can re-create to get more free time)

3. After creation, copy the **Internal Database URL** and add it as `DATABASE_URL` in your web service environment variables

### 1.3 Alternative: Free Option B: Neon PostgreSQL (Longer Free Tier)

1. Go to [neon.tech](https://neon.tech) and sign up (free)
2. Create a new project:
   - **Project Name**: `guvi-refunds`
   - **Region**: Choose closest to you
3. Copy the **Connection String** (PostgreSQL URL)
4. Add it as `DATABASE_URL` in your Render web service environment variables

### 1.4 Run Database Migrations

After deployment, you need to run migrations:

1. Go to your Render web service dashboard
2. Click **"Manual Deploy"** → **"Deploy latest commit"**
3. Wait for deployment to complete
4. Click **"Shell"** (or use Render's web shell)
5. Run:
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   npm run seed-full
   ```

### 1.5 Get Your Backend URL

After successful deployment, Render will provide a URL like:
```
https://guvi-refunds-backend.onrender.com
```

Your API base URL will be:
```
https://guvi-refunds-backend.onrender.com/api
```

---

## 🎨 Step 2: Deploy Frontend on Vercel (Free Tier)

### 2.1 Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

5. Add Environment Variable:
   - `VITE_API_URL` = `https://guvi-refunds-backend.onrender.com/api` (use your actual Render URL)

6. Click **"Deploy"**

### 2.2 Get Your Frontend URL

After deployment, Vercel will provide a URL like:
```
https://guvi-refunds-frontend.vercel.app
```

---

## 🔧 Step 3: Configure CORS (Important)

Update your backend CORS settings to allow your Vercel domain:

### 3.1 Update Backend CORS

In `src/app.ts`, update the CORS configuration:

```typescript
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://guvi-refunds-frontend.vercel.app' // Add your Vercel URL
  ],
  credentials: true
}));
```

### 3.2 Push and Redeploy

```bash
git add .
git commit -m "Update CORS for production"
git push
```

Render will auto-deploy the changes.

---

## ✅ Step 4: Test Your Deployed App

1. Visit your Vercel frontend URL
2. Try logging in with seeded credentials:
   - Email: `admin1@guvi.in`
   - Password: `password123`
3. Verify all features work (dashboard, refunds, admin pages)

---

## 📊 Free Tier Limitations

### Render Free Tier
- **Web Service**: Spins down after 15 minutes of inactivity (cold start ~30s)
- **Database**: 90 days free, then $7/month (you can re-create to extend)
- **RAM**: 512MB
- **CPU**: Shared
- **Build Time**: 15 minutes limit

### Vercel Free Tier
- **Bandwidth**: 100GB/month
- **Build Minutes**: 6,000/month
- **Serverless Functions**: Unlimited
- **Edge Network**: Global CDN included

### Recommendations for Production
- Upgrade to paid tiers for:
  - Better performance
  - No cold starts
  - More database storage
  - Better support

---

## 🔐 Security Notes

1. **Never commit `.env` files** to Git
2. **Use strong JWT secrets** in production
3. **Enable HTTPS** (both Vercel and Render provide this automatically)
4. **Set up rate limiting** to prevent abuse
5. **Monitor logs** in Render dashboard

---

## 🐛 Troubleshooting

### Backend Not Responding (Cold Start)
- Free tier services spin down after inactivity
- First request may take 30-60 seconds
- Keep-alive ping services can help (e.g., uptimerobot.com)

### Database Connection Errors
- Verify `DATABASE_URL` is correct
- Check if database is awake (Render/Neon free tiers may sleep)
- Run migrations again if schema is out of sync

### CORS Errors
- Ensure Vercel URL is added to CORS origins
- Check that `VITE_API_URL` is correct in Vercel env vars
- Verify API base URL includes `/api` suffix

### Build Failures
- Check Render/Vercel build logs
- Ensure all dependencies are in `package.json`
- Verify TypeScript builds locally with `npm run build`

---

## 📝 Alternative: Railway.app (Another Free Option)

If Render doesn't work for you, Railway.app also offers a free tier:

1. Go to [railway.app](https://railway.app)
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Railway will auto-detect Node.js
4. Add PostgreSQL database
5. Set environment variables
6. Deploy

Railway free tier: $5/month credit (good for small projects)

---

## 🎉 You're Live!

Your GUVI Refunds Tracker is now deployed on free tiers of Vercel and Render! 🚀
