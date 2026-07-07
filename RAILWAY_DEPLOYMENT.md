# Railway Deployment Guide

This guide walks you through deploying the Book Clubs application to Railway.app.

## Overview

Your application will be deployed as two separate services on Railway:
1. **Backend** (Django API)
2. **Frontend** (React app)

Plus a MySQL database that Railway will provision automatically.

---

## Prerequisites

1. A Railway account ([signup at railway.app](https://railway.app))
2. Railway CLI installed (optional): `npm install -g @railway/cli`
3. Git repository pushed to GitHub/GitLab/Bitbucket

---

## Deployment Steps

### 1. Create a New Project on Railway

1. Log in to [Railway.app](https://railway.app)
2. Click "New Project"
3. Choose "Deploy from GitHub repo"
4. Select your repository
5. Railway will detect your services

### 2. Deploy the Backend

#### A. Create PostgreSQL Database

1. In your Railway project, click "New Service"
2. Choose "Database" → "PostgreSQL"
3. Railway will automatically provision the database and create a `DATABASE_URL` variable

#### B. Configure Backend Service

1. Click "New Service" → "GitHub Repo"
2. Select your repository
3. Set the **Root Directory** to `backend`
4. Railway will auto-detect the Django app

#### C. Set Environment Variables

In the Backend service settings, add these variables:

```bash
# Required
SECRET_KEY=<generate-a-strong-random-key>
DEBUG=False
ALLOWED_HOSTS=<your-backend-domain>.railway.app
DATABASE_URL=<automatically-provided-by-railway>

# CORS & CSRF (update after deploying frontend)
CORS_ALLOWED_ORIGINS=https://<your-frontend-domain>.railway.app
CSRF_TRUSTED_ORIGINS=https://<your-frontend-domain>.railway.app

# JWT
JWT_SECRET_KEY=<generate-a-strong-random-key>
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# Frontend URL (update after deploying frontend)
FRONTEND_URL=https://<your-frontend-domain>.railway.app

# Optional: Google OAuth
USE_GOOGLE_OAUTH=False
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GOOGLE_REDIRECT_URI=https://<your-backend-domain>.railway.app/api/auth/google/callback
```

**Tips:**
- Generate SECRET_KEY with: `python -c "import secrets; print(secrets.token_urlsafe(50))"`
- Railway automatically provides `DATABASE_URL` when you add PostgreSQL
- Get your backend URL from Railway after first deployment

### 3. Deploy the Frontend

#### A. Create Frontend Service

1. Click "New Service" → "GitHub Repo"
2. Select your repository
3. Set the **Root Directory** to `frontend`

#### B. Set Environment Variables

In the Frontend service settings, add:

```bash
REACT_APP_API_URL=https://<your-backend-domain>.railway.app/api
REACT_APP_USE_GOOGLE_OAUTH=false

# Optional: Google OAuth
REACT_APP_GOOGLE_CLIENT_ID=<your-google-client-id>
```

### 4. Update CORS Settings

After both services are deployed:

1. Note your frontend URL (e.g., `https://bookclubs-frontend.railway.app`)
2. Go back to Backend service settings
3. Update these environment variables:
   ```bash
   CORS_ALLOWED_ORIGINS=https://bookclubs-frontend.railway.app
   CSRF_TRUSTED_ORIGINS=https://bookclubs-frontend.railway.app
   FRONTEND_URL=https://bookclubs-frontend.railway.app
   ```
4. Redeploy the backend service

### 5. Run Database Migrations

Railway will automatically run migrations on deploy (via the Procfile), but you can also run them manually:

1. Go to Backend service
2. Click on "Deployments"
3. Open the latest deployment
4. Click "View Logs" to verify migrations ran successfully

Or use Railway CLI:
```bash
railway run python manage.py migrate
```

### 6. Create Superuser (Optional)

To access the Django admin:

```bash
railway run python manage.py createsuperuser
```

Or use the Railway dashboard terminal.

---

## Custom Domain (Optional)

### Backend Domain

1. Go to Backend service settings
2. Click "Settings" → "Networking" → "Custom Domain"
3. Add your domain (e.g., `api.yourdomain.com`)
4. Update DNS records as instructed
5. Update environment variables:
   ```bash
   ALLOWED_HOSTS=api.yourdomain.com
   CSRF_TRUSTED_ORIGINS=https://api.yourdomain.com,https://yourdomain.com
   ```

### Frontend Domain

1. Go to Frontend service settings
2. Click "Settings" → "Networking" → "Custom Domain"
3. Add your domain (e.g., `yourdomain.com`)
4. Update DNS records
5. Update backend CORS settings to include your custom domain

---

## Troubleshooting

### Backend Issues

**500 Error:**
- Check Railway logs: Backend service → Deployments → View Logs
- Verify all environment variables are set correctly
- Ensure `DEBUG=False` in production
- Check `DATABASE_URL` is properly configured

**Database Connection Error:**
- Ensure PostgreSQL service is running
- Verify `DATABASE_URL` is automatically linked
- Check if migrations ran successfully

**Static Files Not Loading:**
- Verify `python manage.py collectstatic` ran during build
- Check whitenoise is installed and configured

### Frontend Issues

**API Errors:**
- Verify `REACT_APP_API_URL` points to correct backend URL
- Check CORS settings in backend
- Ensure backend is deployed and running

**Blank Page:**
- Check browser console for errors
- Verify build completed successfully
- Check Railway deployment logs

### CORS Errors

1. Verify `CORS_ALLOWED_ORIGINS` includes your frontend URL
2. Verify `CSRF_TRUSTED_ORIGINS` includes your frontend URL
3. Make sure URLs include `https://` (not `http://`)
4. Redeploy backend after making changes

---

## Monitoring

### View Logs

- Backend: Railway Dashboard → Backend Service → Deployments → View Logs
- Frontend: Railway Dashboard → Frontend Service → Deployments → View Logs
- Database: Railway Dashboard → PostgreSQL → Logs

### Metrics

Railway provides built-in metrics:
- CPU usage
- Memory usage
- Network traffic
- Deployment history

---

## Scaling

Railway automatically scales your application. For more control:

1. Go to service settings
2. Adjust resources under "Settings" → "Resources"
3. Configure autoscaling if needed

---

## Environment Variables Reference

### Backend Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `SECRET_KEY` | Yes | Django secret key | `django-insecure-xyz...` |
| `DEBUG` | Yes | Debug mode | `False` |
| `DATABASE_URL` | Yes (auto) | PostgreSQL connection | Auto-provided by Railway |
| `ALLOWED_HOSTS` | Yes | Allowed hostnames | `api.railway.app` |
| `CORS_ALLOWED_ORIGINS` | Yes | Frontend URLs | `https://frontend.railway.app` |
| `CSRF_TRUSTED_ORIGINS` | Yes | Trusted origins | `https://frontend.railway.app` |
| `JWT_SECRET_KEY` | Yes | JWT signing key | Random secure string |
| `FRONTEND_URL` | Yes | Frontend URL | `https://frontend.railway.app` |
| `USE_GOOGLE_OAUTH` | No | Enable OAuth | `False` |
| `GOOGLE_CLIENT_ID` | If OAuth | Google client ID | `xyz.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | If OAuth | Google secret | `GOCSPX-xyz...` |

### Frontend Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `REACT_APP_API_URL` | Yes | Backend API URL | `https://api.railway.app/api` |
| `REACT_APP_USE_GOOGLE_OAUTH` | No | Enable OAuth | `false` |
| `REACT_APP_GOOGLE_CLIENT_ID` | If OAuth | Google client ID | `xyz.apps.googleusercontent.com` |

---

## Additional Resources

- [Railway Documentation](https://docs.railway.app/)
- [Railway Templates](https://railway.app/templates)
- [Django Deployment Checklist](https://docs.djangoproject.com/en/stable/howto/deployment/checklist/)

---

## Support

If you encounter issues:
1. Check Railway logs first
2. Review this deployment guide
3. Consult Railway's documentation
4. Check Django/React documentation for app-specific issues
