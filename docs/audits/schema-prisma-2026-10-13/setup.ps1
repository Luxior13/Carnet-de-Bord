param([ValidateSet('Start','Stop')][string]$Phase = 'Start')
$ErrorActionPreference = 'Stop'
$auditRoot = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$auditMarker = Join-Path $env:TEMP 'noctambule-schema-prisma-current.txt'
$pgBin = 'C:/Program Files/PostgreSQL/17/bin'
if ($Phase -eq 'Stop') {
  $auditWork = (Get-Content -LiteralPath $auditMarker -Raw).Trim()
  $auditResolved = (Resolve-Path -LiteralPath $auditWork).Path
  $tempResolved = (Resolve-Path -LiteralPath $env:TEMP).Path
  if (-not $auditResolved.StartsWith($tempResolved + '\', [StringComparison]::OrdinalIgnoreCase) -or (Split-Path $auditResolved -Leaf) -notmatch '^noctambule-schema-[a-f0-9]{32}$') { throw 'Unexpected temporary directory' }
  $process = Start-Process -FilePath (Join-Path $pgBin 'pg_ctl.exe') -ArgumentList @('-D', ('"' + (Join-Path $auditWork 'pgdata') + '"'), '-m','fast','-w','stop') -WindowStyle Hidden -PassThru
  $null = $process.Handle
  $process.WaitForExit()
  if ($process.ExitCode -ne 0) { throw 'Could not stop the owned PostgreSQL cluster' }
  $backupList = Join-Path $auditWork 'backup-paths.json'
  if (Test-Path -LiteralPath $backupList) {
    $backupDirectory = [IO.Path]::GetFullPath((Join-Path $auditRoot '.codex-tmp/database-backups'))
    foreach ($backup in (Get-Content -LiteralPath $backupList -Raw | ConvertFrom-Json)) {
      $backupPath = [IO.Path]::GetFullPath([string]$backup)
      if ((Split-Path $backupPath -Parent) -ne $backupDirectory -or (Split-Path $backupPath -Leaf) -notmatch '^carnet-pro-[0-9TZ-]+-[a-f0-9-]{36}\.jsonl(\.sha256|\.signature\.json)?$') { throw 'Unexpected backup cleanup target' }
      if (Test-Path -LiteralPath $backupPath) {
        if ((Get-Item -LiteralPath $backupPath).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Unexpected backup link' }
        Remove-Item -LiteralPath $backupPath
      }
    }
  }
  $links = @(Get-ChildItem -LiteralPath $auditResolved -Recurse -Force | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint })
  if ($links.Count) { throw 'Refusing recursive removal through links' }
  Remove-Item -LiteralPath $auditResolved -Recurse -Force
  Remove-Item -LiteralPath $auditMarker
  Write-Output 'Owned PostgreSQL cluster stopped; temporary data and secrets deleted.'
  exit
}
if (Test-Path -LiteralPath $auditMarker) { throw 'An audit environment already exists' }
if (Get-NetTCPConnection -LocalPort 54664 -State Listen -ErrorAction SilentlyContinue) { throw 'Port 54664 already occupied' }
$auditWork = Join-Path $env:TEMP ('noctambule-schema-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $auditWork | Out-Null
Set-Content -LiteralPath $auditMarker -Value $auditWork -Encoding UTF8
$password = [Guid]::NewGuid().ToString('N')
$pwFile = Join-Path $auditWork 'pg-password.txt'
Set-Content -LiteralPath $pwFile -Value $password -Encoding ASCII
$dataDir = Join-Path $auditWork 'pgdata'
$init = Start-Process -FilePath (Join-Path $pgBin 'initdb.exe') -ArgumentList @('-D', ('"' + $dataDir + '"'), '-U','postgres','--encoding=UTF8','--locale=C','--auth=scram-sha-256', ('--pwfile="' + $pwFile + '"')) -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $auditWork 'init.log') -RedirectStandardError (Join-Path $auditWork 'init.err.log')
$null = $init.Handle
$init.WaitForExit()
if ($init.ExitCode -ne 0) { throw 'initdb failed; inspect private logs' }
Add-Content -LiteralPath (Join-Path $dataDir 'postgresql.conf') -Value "`nlisten_addresses = '127.0.0.1'`nport = 54664`ntimezone = 'UTC'"
$start = Start-Process -FilePath (Join-Path $pgBin 'pg_ctl.exe') -ArgumentList @('-D', ('"' + $dataDir + '"'), '-l', ('"' + (Join-Path $auditWork 'postgres.log') + '"'), '-w','start') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $auditWork 'start.log') -RedirectStandardError (Join-Path $auditWork 'start.err.log')
$null = $start.Handle
$start.WaitForExit()
if ($start.ExitCode -ne 0) { throw 'PostgreSQL start failed; inspect private logs' }
$env:PGPASSWORD = $password
foreach ($database in @('schema_review_test','schema_invalid_test','schema_clean_test','schema_restore_test','schema_shadow_test','settings_service_test')) {
  & (Join-Path $pgBin 'createdb.exe') -h 127.0.0.1 -p 54664 -U postgres $database
  if ($LASTEXITCODE -ne 0) { throw ('createdb failed: ' + $database) }
}
$config = @{ DATABASE_URL=('postgresql://postgres:' + $password + '@127.0.0.1:54664/schema_review_test?schema=public'); AUDIT_ENCRYPTION_CURRENT_VERSION='1' }
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
foreach ($name in @('AUDIT_ENCRYPTION_KEY_V1','MFA_ENCRYPTION_KEY_V1')) { $bytes = New-Object byte[] 32; $rng.GetBytes($bytes); $config[$name] = [Convert]::ToBase64String($bytes) }
$rng.Dispose()
$config | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $auditWork 'env.json') -Encoding UTF8
# Preserve the previous migration chain independently of the current checkout.
$previous = Join-Path $auditWork 'previous'
New-Item -ItemType Directory -Path (Join-Path $previous 'migrations') -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $auditRoot 'packages/database/prisma/schema.prisma') -Destination $previous
Get-ChildItem -LiteralPath (Join-Path $auditRoot 'packages/database/prisma/migrations') | Where-Object { $_.Name -ne '20261013120000_system_setting_positive_version' } | Copy-Item -Destination (Join-Path $previous 'migrations') -Recurse
Remove-Item Env:PGPASSWORD
Remove-Item -LiteralPath $pwFile
Write-Output 'PostgreSQL 17 ready on 127.0.0.1:54664; six dedicated test databases.'
