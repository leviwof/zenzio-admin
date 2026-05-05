# 🔧 Invalid Client ID - Fix

## ❌ Error
```
Invalid Client ID
```

## 🔍 Root Cause

The frontend is not loading the `CLIENT_ID` from environment variables, likely because:
1. `.env.local` file was incomplete
2. Vite dev server needs restart to pick up changes

## ✅ What I Fixed

**Updated `.env.local` file:**
```env
# Backend API (local development server)
VITE_API_BASE_URL=http://localhost:3000

# Client credentials (actual values)
VITE_CLIENT_ID=b2d91fa1-a01a-4cad-ad32-c818b5b5c0a0
VITE_CLIENT_SECRET=40073b11481b87eaa6ba4fb4b15a34c6784e1fec1079bb74b9a154b200c047f7

# Environment indicator
VITE_ENV=development
```

## 🚀 Solution Steps

### Step 1: Verify .env.local exists
```bash
cd /c/temp/zenzio_admin/zenzio-admin
cat .env.local

# Should show:
# VITE_CLIENT_ID=b2d91fa1-a01a-4cad-ad32-c818b5b5c0a0
# VITE_CLIENT_SECRET=40073b11481b87eaa6ba4fb4b15a34c6784e1fec1079bb74b9a154b200c047f7
# VITE_API_BASE_URL=http://localhost:3000
```

### Step 2: Restart Vite Dev Server (IMPORTANT!)
```bash
# Stop any running dev server
# Press Ctrl+C in the terminal where npm run dev is running

# Or kill all Node processes:
taskkill //F //IM node.exe

# Start fresh:
npm run dev
```

### Step 3: Verify in Browser Console
```javascript
// Open browser console (F12)
// Type:
console.log('CLIENT_ID:', import.meta.env.VITE_CLIENT_ID);

// Should show:
// CLIENT_ID: b2d91fa1-a01a-4cad-ad32-c818b5b5c0a0
```

---

## 🔍 Debugging Steps

### Check if env variables are loaded:

**In browser console:**
```javascript
// Check all VITE_ variables
console.log(import.meta.env);

// Should show:
// {
//   VITE_CLIENT_ID: "b2d91fa1-a01a-4cad-ad32-c818b5b5c0a0",
//   VITE_CLIENT_SECRET: "40073b11481b87eaa6ba4fb4b15a34c6784e1fec1079bb74b9a154b200c047f7",
//   VITE_API_BASE_URL: "http://localhost:3000",
//   VITE_ENV: "development"
// }
```

**Check API request headers:**
```javascript
// In Network tab (F12 → Network)
// Make a request (e.g., login)
// Check request headers:

Headers:
  clientId: b2d91fa1-a01a-4cad-ad32-c818b5b5c0a0  ✅ Should be present
```

---

## 🐛 Common Issues

### Issue 1: Variables undefined
**Symptom**: `import.meta.env.VITE_CLIENT_ID` is undefined

**Fix**:
```bash
# Make sure .env.local exists
ls -la .env.local

# Restart dev server (Vite caches env variables)
npm run dev
```

### Issue 2: Still getting "Invalid Client ID"
**Check backend is expecting the same CLIENT_ID:**

```bash
# Backend .env
cd /c/temp/zenzio_master/zenzio-backend-master
grep "APP_CLIENT_ID" .env

# Should match frontend:
# APP_CLIENT_ID=b2d91fa1-a01a-4cad-ad32-c818b5b5c0a0
```

### Issue 3: Backend not accepting the CLIENT_ID
**Check backend logs:**

```bash
# Start backend with logs
npm run start:dev

# Look for:
# ❌ "Invalid Client ID" → Backend rejecting
# ✅ No error → Backend accepting
```

---

## 🎯 Quick Test

### Test 1: Environment Variables Loaded
```bash
# In frontend folder
npm run dev

# Open browser console (F12)
console.log(import.meta.env.VITE_CLIENT_ID);
# Expected: "b2d91fa1-a01a-4cad-ad32-c818b5b5c0a0"
```

### Test 2: API Request Works
```bash
# Open Network tab (F12 → Network)
# Try to login
# Check request headers:

Request Headers:
  clientId: b2d91fa1-a01a-4cad-ad32-c818b5b5c0a0 ✅
```

### Test 3: Backend Accepts Request
```bash
# Check backend terminal for:
✅ No "Invalid Client ID" errors
✅ Request processed successfully
```

---

## 📋 Checklist

Before testing:
- [x] `.env.local` file has CLIENT_ID
- [x] `.env.local` file has API_BASE_URL
- [ ] **Dev server restarted** (IMPORTANT!)
- [ ] Browser refreshed (Ctrl+F5)
- [ ] Backend is running on port 3000
- [ ] Backend CLIENT_ID matches frontend

---

## 🔧 Complete Reset (If still not working)

```bash
# 1. Stop everything
taskkill //F //IM node.exe

# 2. Clear Vite cache
rm -rf node_modules/.vite

# 3. Verify .env.local
cat .env.local

# 4. Start backend
cd /c/temp/zenzio_master/zenzio-backend-master
npm run start:dev

# 5. Start frontend (in new terminal)
cd /c/temp/zenzio_admin/zenzio-admin
npm run dev

# 6. Test in browser
# Open: http://localhost:5173
# Console: console.log(import.meta.env.VITE_CLIENT_ID)
```

---

## 🎉 Expected Result

**After Fix:**
1. ✅ Frontend loads CLIENT_ID from .env.local
2. ✅ API requests include clientId header
3. ✅ Backend accepts the CLIENT_ID
4. ✅ No "Invalid Client ID" error
5. ✅ Login works successfully

---

## 📞 Quick Commands

```bash
# Check .env.local
cat .env.local | grep VITE_CLIENT_ID

# Restart dev server
npm run dev

# Test in browser console
console.log(import.meta.env.VITE_CLIENT_ID)

# Check API request (Network tab)
# Look for: clientId header in requests
```

---

**Status**: ✅ .env.local updated  
**Next**: Restart dev server and test  
**Priority**: High - blocking login
