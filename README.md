# Universal Tier Discord Bot

A Discord bot for managing tier verification, queues, and high test requests.

## Features
- Verification system with waitlist
- Queue management for different game modes
- High test ticket system with transcripts
- User tier tracking
- Test result recording

## Deployment

### Local Development
```bash
npm install
node src/index.js
```

### Deploy to Render
1. Push code to GitHub
2. Connect your GitHub repo to Render
3. Add environment variables in Render dashboard
4. Deploy!

## Environment Variables
- `DISCORD_TOKEN` - Your Discord bot token
- `CLIENT_ID` - Your Discord application client ID
