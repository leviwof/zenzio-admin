# 🚀 Deployment Plan: JWT Token Fix

**Created**: 2026-05-04  
**Status**: ⏸️ Ready for Review (NOT YET PUSHED)

---

## 📋 Overview

This document explains the changes made to fix the "invalid JWT signature" error in the admin panel.

### The Problem:
- Backend JWT secrets were changed for security
- Admin panel has old tokens in localStorage
- Old tokens keep getting sent → backend rejects them
- No error handling to force re-login

### The Solution:
- Add automatic token cleanup on 401 errors
- Force redirect to login when JWT fails
- Show "session expired" message

---

## 🔧 Changes Made (LOCAL - Not Pushed Yet)

### 1. Admin Frontend (`zenzio-admin`)

**File: `src/services/api.js`**

**What Changed:**
- Added automatic token cleanup in 401 error handler
- Clears all auth tokens from localStorage
- Redirects to login page with session_expired parameter

**Before:**
```javascript
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('🚫 Unauthorized - Token invalid or expired');
    }
    return Promise.reject(error);
  }
);
```

**After:**
```javascript
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('🚫 Unauthorized - Token invalid or expired');

      // Clear all auth data
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('authToken');
      localStorage.removeItem('token');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('adminId');
      localStorage.removeItem('adminEmail');
      localStorage.removeItem('adminRole');

      // Redirect to login with message
      if (window.location.pathname !== '/login') {
        window.location.href = '/login?session_expired=true';
      }
    }
    return Promise.reject(error);
  }
);
```

**File: `src/pages/auth/Login.jsx`**

**What Changed:**
- Added detection for session_expired URL parameter
- Shows yellow warning message when session expires

**Changes:**
```javascript
// Check for session expired message
const sessionExpired = new URLSearchParams(window.location.search).get('session_expired') === 'true';

// Show warning message
{sessionExpired && (
  <div className="mb-4 p-3 text-yellow-600 bg-yellow-50 border border-yellow-200 rounded">
    Your session has expired. Please log in again.
  </div>
)}
```

---

## 📊 What Happens When You Push These Changes

### Immediate Effects:

1. **First Time User Opens Admin Panel:**
   - Old token in localStorage is sent
   - Backend returns 401 (invalid signature)
   - NEW CODE: Auto-clears tokens and redirects to login
   - User sees: "Your session has expired. Please log in again."

2. **User Logs In Again:**
   - New token generated with new JWT secret
   - Stored in localStorage
   - All API calls work perfectly ✅

3. **All Subsequent Visits:**
   - Works normally with new tokens
   - No more "invalid signature" errors

---

## ⚠️ Expected Behavior After Deployment

### For Admin Users:

**First Visit After Update:**
```
1. Opens admin panel
2. Automatically redirected to login
3. Sees message: "Your session has expired. Please log in again."
4. Logs in with credentials
5. ✅ Everything works normally
```

**Subsequent Visits:**
```
1. Opens admin panel
2. ✅ Already logged in (new token works)
3. ✅ No issues
```

### For Developers:

**What You'll See in Logs:**
```
BEFORE PUSH:
- Continuous "invalid signature" errors
- Backend rejecting all requests
- Admin panel not loading data

AFTER PUSH:
- One-time auto-logout for all users
- Users log back in
- ✅ No more JWT errors
```

---

## 🧪 Testing Plan

### Before Pushing:

1. **Local Test (Already Working):**
   ```bash
   cd /c/temp/zenzio_admin/zenzio-admin
   npm run dev
   # Open browser, try to use old token
   # Should auto-logout and redirect to login
   ```

2. **Verify Changes:**
   ```bash
   git diff src/services/api.js
   git diff src/pages/auth/Login.jsx
   ```

### After Pushing to Production:

1. **Open admin panel** → Should auto-logout
2. **Login again** → Should work perfectly
3. **Check notifications** → Should load without errors
4. **Check backend logs** → No more "invalid signature"

---

## 🚀 Deployment Steps

### Step 1: Review Changes

```bash
cd /c/temp/zenzio_admin/zenzio-admin

# See what changed
git status
git diff

# Files modified:
# - src/services/api.js
# - src/pages/auth/Login.jsx
```

### Step 2: Commit Changes

```bash
# Stage changes
git add src/services/api.js src/pages/auth/Login.jsx

# Commit
git commit -m "fix: auto-logout users with invalid JWT tokens

- Add automatic token cleanup on 401 errors
- Clear all auth tokens from localStorage
- Redirect to login with session expired message
- Show user-friendly session expiry notification

This fixes the 'invalid signature' error after backend
JWT secrets were changed for security improvements.

All users will need to log in once after this update.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# Push to repository
git push origin main  # or your branch name
```

### Step 3: Deploy to Production

**If using manual deployment:**
```bash
# SSH to production server
ssh ubuntu@your-server

# Go to admin frontend directory
cd /path/to/admin/frontend

# Pull latest changes
git pull origin main

# Install dependencies (if needed)
npm install

# Build
npm run build

# Deploy (copy dist/ to web server)
# Example for nginx:
sudo cp -r dist/* /var/www/admin/

# Or restart if using PM2/serve
pm2 restart admin-frontend
```

**If using automated deployment:**
- Push to main branch
- CI/CD will automatically build and deploy

---

## ✅ Success Criteria

After deployment, you should see:

1. ✅ No more "invalid signature" errors in backend logs
2. ✅ Users can log in successfully
3. ✅ All API requests work (notifications, orders, etc.)
4. ✅ Admin panel loads data correctly

---

## 🔄 Rollback Plan

If something goes wrong:

```bash
# Revert the commit
git revert HEAD

# Push revert
git push origin main

# Redeploy old version
```

**Note:** Rollback won't help the JWT issue. The real fix is:
1. Keep the backend JWT secrets (already deployed)
2. Deploy this frontend fix
3. All users log in once with new secrets

---

## 📱 User Communication

**Slack/Email Message to Send:**

```
📢 Admin Panel Update

We've deployed a security update to the admin panel.

What you need to do:
1. Open admin panel (you'll be logged out automatically)
2. Log in again with your credentials
3. Continue working normally

This is a one-time requirement after our security upgrade.

If you have any issues logging in, please contact support.

Thank you!
```

---

## 🎯 Current Status

**Backend (zenzio-backend-master):**
- ✅ JWT secrets updated (64 chars)
- ✅ Security fixes deployed
- ✅ Running on production

**Frontend (zenzio-admin):**
- ✅ Changes made locally
- ⏸️ NOT YET PUSHED (waiting for your review)
- ⏸️ NOT YET DEPLOYED

**What to do next:**
1. Review the changes in this file
2. Test locally if needed
3. If approved: Follow "Deployment Steps" above
4. Users will need to log in once after deployment

---

## 📝 Files Modified

```
zenzio_admin/zenzio-admin/
├── src/
│   ├── services/
│   │   └── api.js           [MODIFIED] - Added 401 error handler
│   └── pages/
│       └── auth/
│           └── Login.jsx     [MODIFIED] - Added session expiry message
```

---

## 🔍 What to Check After Deployment

### Immediate Checks (First 5 minutes):

```bash
# 1. Check if admin panel loads
curl -I https://your-admin-url.com

# 2. Check backend logs for JWT errors
ssh ubuntu@your-server
pm2 logs backend --lines 50 | grep "invalid signature"
# Should see: no new errors after users log in

# 3. Monitor for any 401 errors
pm2 logs backend --lines 0 | grep "401"
```

### Post-Deployment (First Hour):

- Monitor user reports
- Check if users can log in successfully
- Verify all admin panel features work
- Confirm no more JWT errors in logs

---

## 💡 Why This Fix Works

**The Flow:**

```
OLD BEHAVIOR:
User → Send old token → Backend rejects (401) → Frontend shows error → User confused

NEW BEHAVIOR:
User → Send old token → Backend rejects (401) → Frontend auto-clears tokens
     → Redirects to login → Shows "session expired" → User logs in → New token works ✅
```

**Key Points:**
- Backend is already secure (JWT secrets updated)
- Frontend just needs to handle 401s properly
- One-time inconvenience for permanent security

---

## 🎉 Expected Outcome

**Day 1 (Deployment Day):**
- All users get logged out once
- Users log back in
- Everything works normally

**Day 2+ (Forever):**
- ✅ No JWT errors
- ✅ Secure authentication
- ✅ Normal operations
- ✅ Better security posture

---

**Last Updated**: 2026-05-04  
**Prepared By**: Claude Sonnet 4.5  
**Status**: ⏸️ Awaiting Your Review & Approval

**Next Step**: Review this document, then follow "Deployment Steps" section
