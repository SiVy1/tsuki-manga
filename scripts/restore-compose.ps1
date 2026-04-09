[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$From,
  [ValidateSet("full", "db-only", "storage-only", "env-only", "minio-only")]
  [string]$Mode = "full",
  [switch]$DryRun,
  [switch]$SkipSafetyBackup,
  [switch]$Force
)

$ErrorActionPreference = "Stop"
$rootDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$backupDir = (Resolve-Path $From).Path

if (-not (Test-Path (Join-Path $backupDir "manifest.json")) -or -not (Test-Path (Join-Path $backupDir "checksums.txt"))) {
  throw "Backup is missing manifest.json or checksums.txt"
}

if (-not $DryRun) {
  Push-Location $backupDir
  try {
    Get-Content "checksums.txt" | ForEach-Object {
      if (-not $_) { return }
      $parts = $_ -split "\s+", 2
      $expected = $parts[0]
      $relativePath = $parts[1].Trim()
      $filePath = Join-Path $backupDir ($relativePath -replace "/", "\")
      $actual = (Get-FileHash -Algorithm SHA256 -LiteralPath $filePath).Hash.ToLowerInvariant()
      if ($actual -ne $expected) {
        throw "Checksum mismatch for $relativePath"
      }
    }
  } finally {
    Pop-Location
  }
}

if (-not $Force -and -not $DryRun) {
  throw "Restore will modify current data. Re-run with -Force to continue."
}

if (-not $SkipSafetyBackup -and -not $DryRun -and $Mode -ne "env-only") {
  & (Join-Path $PSScriptRoot "backup-compose.ps1") -OutputRoot (Join-Path $rootDir "backups\pre-restore")
}

if ($DryRun) {
  Write-Host "Dry run complete for restore mode: $Mode"
  exit 0
}

function Restore-Archive {
  param(
    [string]$ArchiveRelativePath,
    [string]$TargetRelativePath
  )

  $archivePath = Join-Path $backupDir ($ArchiveRelativePath -replace "/", "\")
  if (-not (Test-Path -LiteralPath $archivePath)) {
    return
  }

  $targetPath = Join-Path $rootDir ($TargetRelativePath -replace "/", "\")
  if (Test-Path -LiteralPath $targetPath) {
    Remove-Item -LiteralPath $targetPath -Recurse -Force
  }

  tar -xzf $archivePath -C $rootDir
}

Push-Location $rootDir
try {
  docker compose down

  if ($Mode -in @("full", "env-only")) {
    $envBackup = Join-Path $backupDir "env\.env"
    if (Test-Path -LiteralPath $envBackup) {
      Copy-Item -LiteralPath $envBackup -Destination (Join-Path $rootDir ".env") -Force
    }
  }

  if ($Mode -in @("full", "storage-only")) {
    Restore-Archive -ArchiveRelativePath "storage/public-media.tar.gz" -TargetRelativePath "public/media"
    Restore-Archive -ArchiveRelativePath "storage/draft-media.tar.gz" -TargetRelativePath ".storage/draft"
    Restore-Archive -ArchiveRelativePath "storage/minio.tar.gz" -TargetRelativePath ".docker-data/minio"
  }

  if ($Mode -eq "minio-only") {
    Restore-Archive -ArchiveRelativePath "storage/minio.tar.gz" -TargetRelativePath ".docker-data/minio"
  }

  if ($Mode -in @("full", "db-only")) {
    docker compose up -d postgres
    Get-Content (Join-Path $backupDir "db\tsuki_manga.sql.gz") -Encoding Byte | gzip -d | docker compose exec -T postgres sh -lc 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
  }

  if ($Mode -in @("full", "db-only", "storage-only", "env-only")) {
    docker compose up -d app
  }

  Write-Host "Restore completed for mode: $Mode"
}
finally {
  Pop-Location
}
