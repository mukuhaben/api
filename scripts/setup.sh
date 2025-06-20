#!/bin/bash

# FirstCraft E-commerce Setup Script
echo "🚀 Setting up FirstCraft E-commerce Application..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v18 or higher."
    exit 1
fi

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install PostgreSQL."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"
echo "✅ npm version: $(npm -v)"

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
if [ ! -f "package.json" ]; then
    echo "❌ Backend package.json not found!"
    exit 1
fi

npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install backend dependencies"
    exit 1
fi

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd ../frontend
if [ ! -f "package.json" ]; then
    echo "❌ Frontend package.json not found!"
    exit 1
fi

npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install frontend dependencies"
    exit 1
fi

cd ..

# Check if .env files exist
echo "🔧 Checking environment configuration..."

if [ ! -f "backend/.env" ]; then
    echo "⚠️  Backend .env file not found. Please create it using the template in README.md"
    echo "📝 Creating sample .env file..."
    cp backend/.env.example backend/.env 2>/dev/null || echo "Please create backend/.env manually"
fi

if [ ! -f "frontend/.env" ]; then
    echo "⚠️  Frontend .env file not found. Please create it using the template in README.md"
    echo "📝 Creating sample .env file..."
    cp frontend/.env.example frontend/.env 2>/dev/null || echo "Please create frontend/.env manually"
fi

# Create logs directory
mkdir -p backend/logs
mkdir -p backend/uploads

# Set permissions
chmod +x scripts/*.sh

echo "✅ Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Configure your .env files in both backend and frontend directories"
echo "2. Create PostgreSQL database: createdb firstcraft_ecommerce"
echo "3. Run database migrations: cd backend && npm run migrate"
echo "4. Seed the database: npm run seed"
echo "5. Start the backend: npm run dev"
echo "6. Start the frontend: cd ../frontend && npm run dev"
echo ""
echo "🌐 Application URLs:"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:3000"
echo ""
echo "👤 Default login credentials:"
echo "   Admin: admin@firstcraft.com / admin123"
echo "   Sales Agent: agent@firstcraft.com / agent123"
echo "   Customer: customer@example.com / customer123"
