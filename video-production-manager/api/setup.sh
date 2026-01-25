#!/bin/bash

# Video Production Manager - API Setup Script
# This script sets up the backend API server

set -e

echo "🚀 Video Production Manager - API Setup"
echo "======================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this from the api/ directory."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Error: Node.js 18 or higher required. You have $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"
echo ""

# Check for .env file
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your database credentials"
    echo ""
    echo "DATABASE_URL=\"postgresql://user:password@localhost:5432/video_production\""
    echo ""
    read -p "Press Enter to continue after updating .env..."
fi

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npm run prisma:generate

if [ $? -ne 0 ]; then
    echo "❌ Failed to generate Prisma Client"
    exit 1
fi

echo "✅ Prisma Client generated"
echo ""

# Ask about database setup
echo "🗄️  Database Setup"
echo "Do you want to run database migrations now?"
echo "This will create all tables in your database."
read -p "(y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Running migrations..."
    npm run prisma:migrate
    
    if [ $? -eq 0 ]; then
        echo "✅ Database migrations completed"
    else
        echo "⚠️  Migration failed. You can run 'npm run prisma:migrate' manually later."
    fi
fi

echo ""
echo "✅ Setup Complete!"
echo ""
echo "📘 Next Steps:"
echo "   1. Ensure PostgreSQL is running"
echo "   2. Start the API server: npm run dev"
echo "   3. API will be available at: http://localhost:3001"
echo ""
echo "📡 Server Discovery:"
echo "   The server will automatically advertise on your LAN"
echo "   Other devices can discover it without knowing the IP"
echo ""
echo "📖 Documentation:"
echo "   - API README: ./README.md"
echo "   - Setup Guide: ../docs/GETTING_STARTED_DATABASE.md"
echo "   - Architecture: ../docs/DATABASE_ARCHITECTURE.md"
echo ""
echo "🎉 Ready to go! Run: npm run dev"
echo ""
