# StatViz Deployment Guide

## Prerequisites

1. **GitHub Account**: Your repo is already at `github.com/Ahiya1/2L`
2. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
3. **Database**: Set up a PostgreSQL database (recommended: Supabase or Vercel Postgres)

## Step 1: Set Up Database

### Option A: Supabase (Recommended - Free Tier)
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Wait for database to initialize
4. Go to **Settings** → **Database**
5. Copy **Connection Pooling** URL (mode: Transaction, port 6543)
   - Format: `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`

### Option B: Vercel Postgres
1. In Vercel dashboard, go to **Storage** → **Create Database**
2. Select **Postgres**
3. Copy the `DATABASE_URL` from environment variables

## Step 2: Prepare Environment Variables

Generate the following:

### JWT_SECRET
```bash
openssl rand -base64 32
```

### ADMIN_PASSWORD_HASH_BASE64
```bash
# Replace 'your-password' with your admin password
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('your-password', 10).then(hash => console.log('Base64:', Buffer.from(hash).toString('base64')))"
```

## Step 3: Deploy to Vercel

### Via Vercel Dashboard (Easiest)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import Git Repository: `Ahiya1/2L`
3. **Root Directory**: Set to `Prod/StatViz` (important!)
4. **Framework Preset**: Next.js (auto-detected)
5. **Environment Variables**: Add these:

```env
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
JWT_SECRET=[generated from step 2]
ADMIN_USERNAME=ahiya
ADMIN_PASSWORD_HASH_BASE64=[generated from step 2]
STORAGE_TYPE=local
NEXT_PUBLIC_BASE_URL=https://[your-project].vercel.app
```

6. Click **Deploy**

### Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy (from StatViz directory)
cd /home/ahiya/Ahiya/2L/Prod/StatViz
vercel

# Follow prompts:
# - Set root directory to current directory
# - Add environment variables when prompted
```

## Step 4: Run Database Migrations

After first deployment:

```bash
# Set DATABASE_URL to your production database
export DATABASE_URL="postgresql://..."

# Run migrations
npx prisma migrate deploy

# Seed database (optional)
npx prisma db seed
```

Or use Vercel CLI:
```bash
vercel env pull .env.production
npx prisma migrate deploy
```

## Step 5: Update NEXT_PUBLIC_BASE_URL

After deployment, update the environment variable:
1. Go to Vercel project settings
2. **Environment Variables**
3. Update `NEXT_PUBLIC_BASE_URL` to your actual Vercel URL (e.g., `https://statviz.vercel.app`)
4. Redeploy

## File Storage Considerations

Current setup uses `STORAGE_TYPE=local`, which stores uploads in Vercel's ephemeral filesystem.

**⚠️ Warning**: Files will be lost on redeployment!

**Recommended for production**: Use S3-compatible storage (AWS S3, Cloudflare R2, or Supabase Storage)

To enable S3:
1. Set `STORAGE_TYPE=s3`
2. Add environment variables:
   ```env
   S3_BUCKET=your-bucket-name
   AWS_ACCESS_KEY_ID=your-key
   AWS_SECRET_ACCESS_KEY=your-secret
   AWS_REGION=us-east-1
   ```

## Troubleshooting

### Build Fails
- Check Vercel build logs
- Ensure `Root Directory` is set to `Prod/StatViz`
- Verify all environment variables are set

### Database Connection Fails
- Use **connection pooling** URL (port 6543 for Supabase)
- Check database is not paused (Supabase free tier pauses after inactivity)
- Verify DATABASE_URL format

### Admin Login Fails
- Verify `ADMIN_PASSWORD_HASH_BASE64` is correctly generated
- Check `ADMIN_USERNAME` matches

## Post-Deployment

1. Test admin login at `https://[your-domain]/admin`
2. Create a test project
3. Upload HTML/DOCX files
4. Test student preview link
5. Verify Plotly charts render correctly

## Custom Domain (Optional)

1. Go to Vercel project settings → **Domains**
2. Add your custom domain
3. Update DNS records as instructed
4. Update `NEXT_PUBLIC_BASE_URL` environment variable
