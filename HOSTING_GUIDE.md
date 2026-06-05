# 24/7 Bot Hosting Guide

Your bot needs to be hosted on a cloud service to stay online 24/7, even when your PC is off.

## 🌟 RECOMMENDED: Render (Free Forever)

### Step 1: Prepare Your Code
✅ Already done! I've created the necessary files:
- `render.yaml` - Render configuration
- `.gitignore` - Excludes sensitive files
- `README.md` - Project documentation

### Step 2: Upload to GitHub
1. Go to https://github.com and create a new account (if you don't have one)
2. Create a new repository called "universal-tier-bot"
3. Upload these files:
   - All your bot files
   - BUT NOT the `.env` file (keep it secret!)

**Option A: Upload via GitHub Website**
- Click "uploading an existing file" on the new repo page
- Drag and drop all files EXCEPT `.env`
- Click "Commit changes"

**Option B: Use Git (if installed)**
```bash
cd "C:\Users\PC\OneDrive\Desktop\bot project"
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/universal-tier-bot.git
git push -u origin main
```

### Step 3: Deploy to Render
1. Go to https://render.com
2. Sign up for a FREE account (use your GitHub account)
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Configure:
   - **Name**: universal-tier-bot
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node src/index.js`
   - **Plan**: FREE

6. Add Environment Variables:
   - Click "Advanced" → "Add Environment Variable"
   - Add `DISCORD_TOKEN` with your bot token
   - Add `CLIENT_ID` with your client ID
   
7. Click "Create Web Service"

### Step 4: Wait for Deployment
- Render will install packages and start your bot
- Takes 2-5 minutes
- Your bot will be online 24/7!

---

## 🔄 Alternative: Railway (Also Free)

### Steps:
1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Add environment variables (DISCORD_TOKEN, CLIENT_ID)
6. Deploy!

**Railway Free Tier:** 
- $5 free credit per month
- Enough for a small Discord bot

---

## 🖥️ Alternative: Keep PC Running (Not Recommended)

If you want to keep your PC, you can use PM2:

```bash
npm install -g pm2
pm2 start src/index.js --name universal-tier-bot
pm2 save
pm2 startup
```

But this only works while your PC is on!

---

## ⚠️ Important Notes

1. **Database Persistence**: Your current database (`database/database.json`) is file-based. On free cloud hosting, this may reset when the service restarts. For production, consider:
   - MongoDB (free at mongodb.com)
   - PostgreSQL (free on Render)
   - SQLite with persistent storage

2. **Environment Variables**: NEVER commit your `.env` file to GitHub!

3. **Free Tier Limitations**:
   - Render: May sleep after 15 min of inactivity (free tier)
   - Railway: $5/month credit limit
   - Consider upgrading if you need 100% uptime

---

## 🎯 Quick Start Checklist

- [ ] Create GitHub account
- [ ] Upload code to GitHub (without .env)
- [ ] Create Render account
- [ ] Connect GitHub to Render
- [ ] Add environment variables
- [ ] Deploy!
- [ ] Bot is online 24/7! ✨

---

## 📞 Need Help?

If you get stuck:
1. Check Render logs for errors
2. Make sure environment variables are set correctly
3. Verify your bot token is still valid
4. Check that all dependencies are in package.json

Your bot will automatically restart if it crashes and will stay online even when you turn off your PC!
