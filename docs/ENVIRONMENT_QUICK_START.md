# 🚀 Quick Start: Dev/UAT/Production Setup

## ✅ What's Been Done

### Frontend (zenzio-admin):
- ✅ Created `.env.development` (local dev)
- ✅ Created `.env.uat` (staging/testing)
- ✅ Created `.env.production` (live deployment)
- ✅ Added npm scripts for each environment
- ✅ Created EnvironmentBadge component (shows DEV/UAT indicator)
- ✅ Updated .gitignore for security
- ✅ Pushed to branch: `fix/jwt-token-auto-logout`

### Documentation Created:
- ✅ `ENVIRONMENT_SETUP.md` - Complete frontend setup guide
- ✅ `BACKEND_ENVIRONMENT_SETUP.md` - Complete backend setup guide
- ✅ This quick start guide

---

## 🎯 How to Use (Frontend)

### 1. Local Development (Default):
```bash
cd /c/temp/zenzio_admin/zenzio-admin

# Uses .env.development (http://localhost:3000)
npm run dev

# Open: http://localhost:5173
# Connects to: http://localhost:3000
```

### 2. Test Against UAT Backend:
```bash
# First, update UAT backend URL in .env.uat
nano .env.uat
# Change: VITE_API_BASE_URL=https://your-uat-api.com

# Run dev server with UAT environment
npm run dev:uat

# Open: http://localhost:5173
# Connects to: https://your-uat-api.com
```

### 3. Build for UAT Deployment:
```bash
# Build with UAT environment
npm run build:uat

# Upload dist/ folder to UAT server
# Deploy to: https://uat-admin.zenzio.com
```

### 4. Build for Production:
```bash
# Build with production environment
npm run build:prod

# Upload dist/ folder to production server
# Deploy to: https://admin.zenzio.com
```

---

## 🎯 How to Use (Backend)

### 1. Local Development:
```bash
cd /path/to/zenzio-backend-master

# Create .env from development template
cp .env.development .env

# Start development server
npm run start:dev

# Backend runs on: http://localhost:3000
```

### 2. Setup UAT Server:
```bash
# SSH to UAT server
ssh ubuntu@your-uat-server

# Clone or pull latest code
cd /var/www/backend-uat
git pull origin main

# Create .env from UAT template
cp .env.uat .env

# IMPORTANT: Update these values in .env
nano .env
# - DATABASE_URL (UAT database)
# - JWT_ACCESS_SECRET (generate new 64-char secret)
# - JWT_REFRESH_SECRET (generate new 64-char secret)
# - CORS_ORIGIN (https://uat-admin.zenzio.com)

# Install dependencies
npm install

# Run migrations
npm run migration:run

# Start with PM2
pm2 start npm --name "zenzio-backend-uat" -- run start:prod

# Save PM2 config
pm2 save
pm2 startup

# Test health check
curl http://localhost:3000/health
```

### 3. Setup Production Server:
```bash
# SSH to production server
ssh ubuntu@your-production-server

# Clone or pull latest code
cd /var/www/backend
git pull origin main

# Create .env from production template
cp .env.production .env

# IMPORTANT: Update these values in .env
nano .env
# - DATABASE_URL (production database with SSL)
# - JWT_ACCESS_SECRET (use existing: e7a4797c20a527db...)
# - JWT_REFRESH_SECRET (use existing: 94e0a05940d63fee...)
# - CORS_ORIGIN (https://admin.zenzio.com)
# - All other CHANGE_ME values

# Install production dependencies
npm ci --production

# Run migrations
npm run migration:run

# Start with PM2
pm2 start npm --name "zenzio-backend" -- run start:prod

# Save PM2 config
pm2 save
pm2 startup

# Test health check
curl http://localhost:3000/health
```

---

## 📋 Deployment Workflow

### Step 1: Develop & Test Locally
```bash
# Frontend
cd zenzio-admin
npm run dev

# Backend (in another terminal)
cd zenzio-backend-master
npm run start:dev

# Test the JWT fix works locally
```

### Step 2: Deploy to UAT
```bash
# Frontend - Build for UAT
cd zenzio-admin
npm run build:uat
# Upload dist/ to UAT server

# Backend - Deploy to UAT
ssh ubuntu@uat-server
cd /var/www/backend-uat
git pull origin main
pm2 restart zenzio-backend-uat
```

### Step 3: Test in UAT
```bash
# Open UAT admin panel
# URL: https://uat-admin.zenzio.com

# Test checklist:
✅ Login works
✅ JWT token gets saved
✅ API calls succeed
✅ Old tokens get cleared (test by putting an old token in localStorage)
✅ Session expired message shows correctly
✅ Re-login works perfectly
```

### Step 4: Deploy to Production (After UAT Approval)
```bash
# Merge feature branch to main
git checkout main
git merge fix/jwt-token-auto-logout
git push origin main

# Frontend - Build for production
cd zenzio-admin
npm run build:prod
# Upload dist/ to production server

# Backend - Already deployed with JWT fixes
# No changes needed unless updating .env
```

---

## 🔧 Configuration Needed

### Frontend .env.uat (Update these):
```env
VITE_API_BASE_URL=https://your-uat-api-url.com  # ← UPDATE THIS
```

### Frontend .env.production (Update these):
```env
VITE_API_BASE_URL=https://your-production-api-url.com  # ← UPDATE THIS
```

### Backend .env.uat (Update these):
```env
DATABASE_URL=postgresql://user:pass@uat-db:5432/zenzio_uat?sslmode=require  # ← UPDATE
JWT_ACCESS_SECRET=generate-new-64-char-secret  # ← GENERATE NEW
JWT_REFRESH_SECRET=generate-new-64-char-secret  # ← GENERATE NEW
CORS_ORIGIN=https://uat-admin.zenzio.com  # ← UPDATE
```

### Backend .env.production (Update these):
```env
DATABASE_URL=postgresql://user:pass@prod-db:5432/zenzio_prod?sslmode=require  # ← UPDATE
JWT_ACCESS_SECRET=e7a4797c20a527db17484f7f2f7c6cf8976a96cc1da5382d95511854bc043c42  # ← USE EXISTING
JWT_REFRESH_SECRET=94e0a05940d63fee80495b46aac1de66f06643156f62d3a4d78ca46507fa46a5  # ← USE EXISTING
CORS_ORIGIN=https://admin.zenzio.com  # ← UPDATE
```

---

## 🔑 Generate Secrets (for UAT)

### JWT Secrets (64 chars):
```bash
# Access secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Refresh secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🎉 Summary

**What you have now:**
1. ✅ Separate environments for dev/UAT/production
2. ✅ JWT auto-logout fix ready to deploy
3. ✅ Clear testing workflow before production
4. ✅ Environment-specific npm scripts
5. ✅ Visual environment indicators (DEV/UAT badge)

**Deployment path:**
```
Local Dev → UAT Testing → Production
(localhost) → (uat.zenzio.com) → (zenzio.com)
```

**Your workflow:**
1. Test locally with `npm run dev`
2. Deploy to UAT and test thoroughly
3. After UAT approval, deploy to production
4. Zero downtime, users log in once, all fixed ✅

---

## 📞 Next Steps

### Immediate (Today):
1. Update `.env.uat` and `.env.production` with your actual URLs
2. Test locally: `npm run dev`
3. Verify JWT fix works

### Tomorrow (UAT Setup):
1. Set up UAT backend server
2. Deploy backend to UAT with `.env.uat`
3. Deploy frontend to UAT with `npm run build:uat`
4. Test thoroughly in UAT

### After UAT Approval:
1. Merge branch to main
2. Build production frontend: `npm run build:prod`
3. Deploy to production
4. Monitor logs and user feedback

---

**Created**: 2026-05-05  
**Status**: Ready for deployment  
**Branch**: `fix/jwt-token-auto-logout`  
**Files Changed**: 9 files (JWT fix + environment setup)
