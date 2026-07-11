Write-Host "========================================="
Write-Host "       BashaCare Initialization Script   "
Write-Host "========================================="
Write-Host ""

Write-Host "1. Starting PostgreSQL Database via Docker Compose..."
docker-compose up -d

Write-Host "2. Installing Backend Dependencies..."
Set-Location -Path "backend"
npm install
Write-Host "   Running database migrations..."
# Assuming node src/db/migrate.js is how migrations run based on the file seen
node src/db/migrate.js
Set-Location -Path ".."

Write-Host "3. Installing Frontend Dependencies..."
Set-Location -Path "frontend"
npm install
Set-Location -Path ".."

Write-Host ""
Write-Host "========================================="
Write-Host "Initialization Complete!"
Write-Host "To start the application locally in separate terminals:"
Write-Host "  Backend: cd backend && npm run dev"
Write-Host "  Frontend: cd frontend && npm run dev"
Write-Host "========================================="
