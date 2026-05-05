# 🌍 Environment Setup Guide

## Overview

This project supports three environments:
- **Development** - Local development with local backend
- **UAT** - User Acceptance Testing on staging server
- **Production** - Live production deployment

---

## 📁 Environment Files

### Created Files:
```
├── .env.development     # Local development
├── .env.uat            # UAT/Staging environment
├── .env.production     # Production environment
└── .env                # Override file (gitignored, optional)
```

### File Priority:
Vite loads environment variables in this order:
1. `.env.[mode].local` (highest priority, gitignored)
2. `.env.[mode]` (committed to git)
3. `.env.local` (gitignored)
4. `.env` (committed to git)

---

## 🚀 Quick Start

### Local Development:
```bash
# Run dev server with development env
npm run dev

# Connects to: http://localhost:3000
```

### UAT Testing:
```bash
# Run dev server with UAT env
npm run dev:uat

# Connects to: https://uat-api.zenzio.com
```

### Production Build:
```bash
# Build for production
npm run build:prod

# Preview production build locally
npm run preview
```

---

## 📝 NPM Scripts

| Command | Environment | Use Case |
|---------|-------------|----------|
| `npm run dev` | development | Local dev server |
| `npm run dev:uat` | uat | Test against UAT backend |
| `npm run build` | production | Production build (default) |
| `npm run build:dev` | development | Build with dev config |
| `npm run build:uat` | uat | Build for UAT deployment |
| `npm run build:prod` | production | Build for production |
| `npm run preview` | production | Preview prod build locally |
| `npm run preview:uat` | uat | Preview UAT build locally |

---

## 🔧 Configuration

### .env.development
```env
VITE_API_BASE_URL=http://localhost:3000
VITE_CLIENT_ID=b2d91fa1-a01a-4cad-ad32-c818b5b5c0a0
VITE_CLIENT_SECRET=40073b11481b87eaa6ba4fb4b15a34c6784e1fec1079bb74b9a154b200c047f7
VITE_ENV=development
```

### .env.uat
```env
VITE_API_BASE_URL=https://uat-api.zenzio.com
VITE_CLIENT_ID=b2d91fa1-a01a-4cad-ad32-c818b5b5c0a0
VITE_CLIENT_SECRET=40073b11481b87eaa6ba4fb4b15a34c6784e1fec1079bb74b9a154b200c047f7
VITE_ENV=uat
```

### .env.production
```env
VITE_API_BASE_URL=https://api.zenzio.com
VITE_CLIENT_ID=b2d91fa1-a01a-4cad-ad32-c818b5b5c0a0
VITE_CLIENT_SECRET=40073b11481b87eaa6ba4fb4b15a34c6784e1fec1079bb74b9a154b200c047f7
VITE_ENV=production
```

---

## 🎯 Deployment Workflow

### Step 1: Develop Locally
```bash
# Work on feature branch
git checkout -b feature/my-feature

# Run local dev server
npm run dev

# Test changes at http://localhost:5173
```

### Step 2: Test in UAT
```bash
# Push feature branch
git push origin feature/my-feature

# Build for UAT
npm run build:uat

# Deploy to UAT server
# (Upload dist/ folder to UAT server)

# Or run locally against UAT backend
npm run dev:uat
```

### Step 3: Deploy to Production
```bash
# Merge to main
git checkout main
git merge feature/my-feature
git push origin main

# Build for production
npm run build:prod

# Deploy dist/ to production server
```

---

## 🔐 Security Best Practices

### 1. Environment-Specific Credentials
If you need different credentials per environment, use `.local` files:

```bash
# Create local override (not committed to git)
touch .env.uat.local
```

**.env.uat.local:**
```env
# Override UAT credentials locally
VITE_CLIENT_ID=different-uat-client-id
VITE_CLIENT_SECRET=different-uat-secret
```

### 2. Never Commit Secrets
The `.gitignore` is configured to exclude:
```
.env
.env.local
.env.*.local
```

But `.env.development`, `.env.uat`, `.env.production` **are committed** as templates.

### 3. Verify Before Deployment
```bash
# Check which variables are loaded
npm run build:uat -- --debug

# Verify API URL in built files
grep -r "VITE_API_BASE_URL" dist/
```

---

## 🧪 Testing Strategy

### Local Testing (Development)
```bash
npm run dev

# Test:
✅ Login works
✅ API calls succeed
✅ Features work as expected
```

### UAT Testing (Staging)
```bash
npm run dev:uat

# Test:
✅ Same backend as production
✅ Real database (UAT copy)
✅ Full integration testing
✅ Performance testing
✅ Security testing
```

### Production Deployment
```bash
npm run build:prod

# Final checks:
✅ UAT testing passed
✅ All features working
✅ No console errors
✅ Performance optimized
```

---

## 📊 Environment Indicator (Optional)

Add a visual indicator to show which environment you're in:

**src/components/EnvironmentBadge.jsx:**
```jsx
const EnvironmentBadge = () => {
  const env = import.meta.env.VITE_ENV;
  
  if (env === 'production') return null;
  
  const colors = {
    development: 'bg-blue-500',
    uat: 'bg-yellow-500'
  };
  
  return (
    <div className={`fixed bottom-4 right-4 ${colors[env]} text-white px-3 py-1 rounded-full text-xs font-bold uppercase z-50`}>
      {env}
    </div>
  );
};

export default EnvironmentBadge;
```

Add to your main layout:
```jsx
import EnvironmentBadge from './components/EnvironmentBadge';

function App() {
  return (
    <>
      <EnvironmentBadge />
      {/* rest of app */}
    </>
  );
}
```

---

## 🐛 Troubleshooting

### Issue: Wrong API URL being used
```bash
# Check loaded environment
npm run dev -- --debug

# Verify .env file is correct
cat .env.development
```

### Issue: Changes not reflected
```bash
# Clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

### Issue: Build fails
```bash
# Check for environment-specific issues
npm run build:dev  # Should work
npm run build:uat  # Test UAT build
npm run build:prod # Test prod build
```

### Issue: CORS errors in UAT
- Verify UAT backend CORS_ORIGIN includes your UAT frontend URL
- Check UAT backend is running and accessible

---

## 🔄 Backend Environment Setup

Don't forget to configure corresponding backend environments:

### Backend .env.development
```env
NODE_ENV=development
DATABASE_URL=postgresql://user:pass@localhost:5432/zenzio_dev
JWT_ACCESS_SECRET=dev-access-secret-32-chars-min
JWT_REFRESH_SECRET=dev-refresh-secret-32-chars-min
CORS_ORIGIN=http://localhost:5173
```

### Backend .env.uat
```env
NODE_ENV=uat
DATABASE_URL=postgresql://user:pass@uat-db:5432/zenzio_uat
JWT_ACCESS_SECRET=uat-access-secret-64-chars-recommended
JWT_REFRESH_SECRET=uat-refresh-secret-64-chars-recommended
CORS_ORIGIN=https://uat-admin.zenzio.com
```

### Backend .env.production
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@prod-db:5432/zenzio_prod?sslmode=require
JWT_ACCESS_SECRET=prod-access-secret-64-chars-minimum
JWT_REFRESH_SECRET=prod-refresh-secret-64-chars-minimum
CORS_ORIGIN=https://admin.zenzio.com
```

---

## 📋 Deployment Checklist

### Before UAT Deployment:
- [ ] All tests pass locally
- [ ] No console errors
- [ ] Feature branch created and pushed
- [ ] Build succeeds: `npm run build:uat`
- [ ] UAT backend is running
- [ ] CORS configured for UAT domain

### Before Production Deployment:
- [ ] UAT testing completed and approved
- [ ] No critical bugs in UAT
- [ ] Performance tested
- [ ] Security reviewed
- [ ] Build succeeds: `npm run build:prod`
- [ ] Backup current production version
- [ ] Production backend is ready
- [ ] CORS configured for production domain
- [ ] Users notified if needed

---

## 🎉 Summary

**You now have:**
✅ Three separate environments (dev, UAT, prod)
✅ Environment-specific npm scripts
✅ Proper .gitignore for security
✅ Clear deployment workflow
✅ Testing strategy for each environment

**Next steps:**
1. Update UAT and Production API URLs in `.env.uat` and `.env.production`
2. Test locally: `npm run dev`
3. Test against UAT: `npm run dev:uat`
4. Deploy to UAT for testing
5. After UAT approval, deploy to production

**Remember:**
- Always test in UAT before production
- Never commit `.env.local` or `.env.*.local` files
- Keep environment files in sync with backend
- Use environment indicators during development

---

**Created**: 2026-05-05  
**For**: zenzio-admin Frontend  
**Purpose**: Safe multi-environment deployment workflow
