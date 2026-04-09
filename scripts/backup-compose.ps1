[CmdletBinding()]
param(
  [string]$OutputRoot = ".\backups"
)

$ErrorActionPreference = "Stop"

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = Join-Path $OutputRoot $timestamp
$storageBackupDir = Join-Path $backupDir "storage"

New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
New-Item -ItemType Directory -Force -Path $storageBackupDir | Out-Null

$dbDumpPath = Join-Path $backupDir "tsuki_manga.sql"
$envPath = Join-Path (Get-Location) ".env"
$publicMediaPath = Join-Path (Get-Location) "public\media"
$draftMediaPath = Join-Path (Get-Location) ".storage\draft"
$minioPath = Join-Path (Get-Location) ".docker-data\minio"

Write-Host "Creating PostgreSQL dump at $dbDumpPath"
docker compose exec -T postgres sh -lc "pg_dump -U postgres -d tsuki_manga" | Out-File -FilePath $dbDumpPath -Encoding utf8

if (Test-Path -LiteralPath $envPath) {
  Copy-Item -LiteralPath $envPath -Destination (Join-Path $backupDir ".env") -Force
}

if (Test-Path -LiteralPath $publicMediaPath) {
  Copy-Item -LiteralPath $publicMediaPath -Destination (Join-Path $storageBackupDir "public-media") -Recurse -Force
}

if (Test-Path -LiteralPath $draftMediaPath) {
  Copy-Item -LiteralPath $draftMediaPath -Destination (Join-Path $storageBackupDir "draft-media") -Recurse -Force
}

if (Test-Path -LiteralPath $minioPath) {
  Copy-Item -LiteralPath $minioPath -Destination (Join-Path $storageBackupDir "minio") -Recurse -Force
}

Write-Host "Backup completed: $backupDir"
