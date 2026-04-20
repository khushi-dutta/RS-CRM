#!/bin/bash

# =============================================================================
# Solar Studio Dependencies Installation Script
# =============================================================================

echo "🚀 Installing Solar Studio dependencies..."
echo ""

# Backend
echo "📦 Installing backend dependencies..."
cd slar-crm/backend
npm install geotiff
echo "✅ Backend dependencies installed"
echo ""

# Frontend
echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install geotiff
echo "✅ Frontend dependencies installed"
echo ""

echo "🎉 All dependencies installed successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Add GOOGLE_MAPS_API_KEY to slar-crm/backend/.env"
echo "2. Enable required Google APIs in Cloud Console"
echo "3. Restart backend server: cd slar-crm/backend && npm run dev"
echo "4. Test the integration in Solar Studio"
echo ""
echo "📚 See SOLAR_STUDIO_SETUP_INSTRUCTIONS.md for detailed setup"
