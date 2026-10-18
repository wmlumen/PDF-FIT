Write-Host "Iniciando el servidor SNC v3..." -ForegroundColor Cyan
Write-Host "El servidor estara disponible en: http://localhost:5556/index.html" -ForegroundColor Yellow
Start-Process "http://localhost:5556/index.html"
npm start
Read-Host "Presiona Enter para cerrar..."
