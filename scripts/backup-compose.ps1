[CmdletBinding()]
param(
  [string]$OutputRoot = ".\backups",
  [int]$RetentionDays = 14
)

$ErrorActionPreference = "Stop"

$rootDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupName = "tsuki-backup-$timestamp"
$tmpDir = Join-Path $OutputRoot ".tmp-$backupName"
$finalDir = Join-Path $OutputRoot $backupName

New-Item -ItemType Directory -Force -Path (Join-Path $tmpDir "db") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $tmpDir "env") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $tmpDir "storage") | Out-Null

Push-Location $rootDir
try {
  $dbDumpPath = Join-Path $tmpDir "db\tsuki_manga.sql.gz"
  Write-Host "Creating PostgreSQL dump at $dbDumpPath"
  docker compose exec -T postgres sh -lc 'pg_dump --clean --if-exists -U "$POSTGRES_USER" -d "$POSTGRES_DB"' | gzip | Set-Content -Encoding Byte -Path $dbDumpPath

  $envPath = Join-Path $rootDir ".env"
  if (Test-Path -LiteralPath $envPath) {
    Copy-Item -LiteralPath $envPath -Destination (Join-Path $tmpDir "env\.env") -Force
  }

  $publicMediaPath = Join-Path $rootDir "public\media"
  if (Test-Path -LiteralPath $publicMediaPath) {
    tar -czf (Join-Path $tmpDir "storage\public-media.tar.gz") -C $rootDir "public/media"
  }

  $draftMediaPath = Join-Path $rootDir ".storage\draft"
  if (Test-Path -LiteralPath $draftMediaPath) {
    tar -czf (Join-Path $tmpDir "storage\draft-media.tar.gz") -C $rootDir ".storage/draft"
  }

  $minioPath = Join-Path $rootDir ".docker-data\minio"
  if (Test-Path -LiteralPath $minioPath) {
    tar -czf (Join-Path $tmpDir "storage\minio.tar.gz") -C $rootDir ".docker-data/minio"
  }

  Push-Location $tmpDir
  try {
    $hashLines = Get-ChildItem -Recurse -File | Where-Object { $_.Name -ne "checksums.txt" } | Sort-Object FullName | ForEach-Object {
      $relativePath = Resolve-Path -Relative $_.FullName
      $normalizedPath = $relativePath.TrimStart(".\", "./") -replace "\\", "/"
      $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $_.FullName).Hash.ToLowerInvariant()
      "$hash  $normalizedPath"
    }
    $hashLines | Set-Content -Path "checksums.txt"
  } finally {
    Pop-Location
  }

  $manifest = @{
    backupName = $backupName
    createdAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    hostname = $env:COMPUTERNAME
    formatVersion = 1
    artifacts = @{
      databaseDump = "db/tsuki_manga.sql.gz"
      envFile = if (Test-Path (Join-Path $tmpDir "env\.env")) { "env/.env" } else { $null }
      publicMedia = if (Test-Path (Join-Path $tmpDir "storage\public-media.tar.gz")) { "storage/public-media.tar.gz" } else { $null }
      draftMedia = if (Test-Path (Join-Path $tmpDir "storage\draft-media.tar.gz")) { "storage/draft-media.tar.gz" } else { $null }
      minio = if (Test-Path (Join-Path $tmpDir "storage\minio.tar.gz")) { "storage/minio.tar.gz" } else { $null }
    }
  }

  $manifest | ConvertTo-Json -Depth 5 | Set-Content -Path (Join-Path $tmpDir "manifest.json")

  Move-Item -LiteralPath $tmpDir -Destination $finalDir -Force

  Get-ChildItem -LiteralPath $OutputRoot -Directory -Filter "tsuki-backup-*" |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$RetentionDays) } |
    Remove-Item -Recurse -Force

  Write-Host "Backup completed: $finalDir"
}
finally {
  if (Test-Path -LiteralPath $tmpDir) {
    Remove-Item -LiteralPath $tmpDir -Recurse -Force
  }
  Pop-Location
}
