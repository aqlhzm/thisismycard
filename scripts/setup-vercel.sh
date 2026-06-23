#!/bin/bash
# ThisIsMyCard - One-time Vercel setup script
set -e

echo "🚀 Setting up Vercel for ThisIsMyCard..."

# Login
vercel login
vercel link --yes

PROJECT_ID=$(cat .vercel/project.json | python3 -c "import sys,json; print(json.load(sys.stdin)['projectId'])")
ORG_ID=$(cat .vercel/project.json | python3 -c "import sys,json; print(json.load(sys.stdin)['orgId'])")

echo "Project ID: $PROJECT_ID"
echo "Org ID: $ORG_ID"

# Set env vars on Vercel
echo "Setting environment variables..."
echo "https://zqaxufcfappmlqldjryb.supabase.co" | vercel env add NEXT_PUBLIC_SUPABASE_URL production
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxYXh1ZmNmYXBwbWxxbGRqcnliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMDAwODIsImV4cCI6MjA5Nzc3NjA4Mn0.9DIQgqr56nqzx32B6HDelWJUnCXBg7CFXLJqs5-8QZk" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxYXh1ZmNmYXBwbWxxbGRqcnliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjIwMDA4MiwiZXhwIjoyMDk3Nzc2MDgyfQ.w9GP0HuwnWe306HRhoztHXo0eukcl2qVjFCA6ADSxWI" | vercel env add SUPABASE_SERVICE_ROLE_KEY production
echo "admin@thisismycard.io" | vercel env add ADMIN_EMAIL production
echo "Admin@TIMC2024!" | vercel env add ADMIN_PASSWORD production

echo "Done! Now deploy with: vercel deploy --prod"
