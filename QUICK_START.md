# Quick Deployment Guide - Free Tier

## 📋 Prerequisites
- GitHub account
- Vercel account (free)
- Render account (free)

---

## 🚀 Backend Deployment (Render - Free)

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/guvi-refunds-tracker.git
git push -u origin main
```

### 2. Deploy to Render
1. Go to [render.com](https://render.com) → New → Web Service
2. Connect your GitHub repo
3. **Settings**:
   - Name: `guvi-refunds-backend`
   - Runtime: Node
   - Build: `npm install && npm run build`
   - Start: `npm start`
   - Instance: **Free**

4. **Environment Variables**:
   - `NODE_ENV` = `production`
   - `PORT` = `4000`
   - `JWT_SECRET` = (generate random: https://generate-secret.vercel.app/32)
   - `JWT_EXPIRES_IN` = `8h`
   - `DATABASE_URL` = (from Step 3)

5. Click **Create Web Service**

### 3. Add PostgreSQL (Free)
1. In Render → New → PostgreSQL
2. Name: `guvi-refunds-db`
3. Plan: **Free**
4. Copy the **Internal Database URL**
5. Add it as `DATABASE_URL` in your web service

### 4. Run Migrations
After deployment, go to your web service → Shell → run:
```bash
npx prisma migrate deploy
npx prisma generate
npm run seed-full
```

### 5. Get Backend URL
Render will give you something like:
```
https://guvi-refunds-backend.onrender.com
```
Your API base: `https://guvi-refunds-backend.onrender.com/api`

---

## 🎨 Frontend Deployment (Vercel - Free)

### 1. Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repo
3. **Settings**:
   - Framework: Vite
   - Root Directory: `frontend`
   - Build: `npm run build`
   - Output: `dist`

4. **Environment Variable**:
   - `VITE_API_URL` = `https://guvi-refunds-backend.onrender.com/api`

5. Click **Deploy**

### 2. Get Frontend URL
Vercel will give you something like:
```
https://guvi-refunds-frontend.vercel.app
```

---

## 🔧 Final Step: Update CORS

Add your Vercel URL to backend CORS:

In `src/app.ts`, update the `allowedOrigins` array:
```typescript
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://guvi-refunds-frontend.vercel.app' // Add your Vercel URL
].filter(Boolean);
```

Push changes:
```bash
git add .
git commit -m "Update CORS for production"
git push
```

Render will auto-redeploy.

---

## ✅ Test

1. Visit your Vercel URL
2. Login: `admin1@guvi.in` / `password123`
3. Verify everything works!

---

## 📊 Free Tier Notes

**Render Free Tier:**
- Web service spins down after 15 min inactivity (cold start ~30s)
- Database: 90 days free
- RAM: 512MB

**Vercel Free Tier:**
- 100GB bandwidth/month
- 6,000 build minutes/month
- Global CDN included

**To avoid cold starts:** Use a free uptime monitor like [uptimerobot.com](https://uptimerobot.com) to ping your backend every 5 minutes.

---

## 🐛 Common Issues

**Cold start delay:** First request takes 30-60s after inactivity - this is normal on free tier.

**Database connection errors:** Database may be asleep - first request will wake it up.

**CORS errors:** Make sure your Vercel URL is added to `allowedOrigins` in `src/app.ts`.

**Build failures:** Check build logs in Render/Vercel dashboards.

---

For detailed troubleshooting, see [DEPLOYMENT.md](./DEPLOYMENT.md)
