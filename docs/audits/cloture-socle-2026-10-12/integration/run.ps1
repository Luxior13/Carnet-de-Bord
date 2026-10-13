param([Parameter(Mandatory=$true)][ValidateSet('Build','Start','Smoke','Pages','Restore','Tests','Static','Stop')][string]$Phase)
$ErrorActionPreference = 'Stop'
$auditRoot = (Resolve-Path (Join-Path $PSScriptRoot '../../../..')).Path
$auditWork = (Get-Content -LiteralPath (Join-Path $env:TEMP 'noctambule-cloture-socle-current.txt') -Raw).Trim()
$env:AUDIT_ENV_FILE = Join-Path $auditWork 'env.json'
$auditConfig = Get-Content -LiteralPath $env:AUDIT_ENV_FILE -Raw | ConvertFrom-Json
$auditDatabase = [Uri]$auditConfig.E2E_DATABASE_URL
if ($auditDatabase.Host -ne '127.0.0.1' -or $auditDatabase.Port -ne 54663 -or $auditDatabase.AbsolutePath -ne '/socle_e2e_test' -or $auditConfig.WEB_URL -ne 'http://127.0.0.1:3132') { throw 'Only the isolated closure environment is allowed' }
foreach ($entry in $auditConfig.PSObject.Properties) { [Environment]::SetEnvironmentVariable($entry.Name, [string]$entry.Value, 'Process') }
$env:DATABASE_URL = $auditConfig.E2E_DATABASE_URL
$auditWeb = Join-Path $auditRoot 'apps/web'
Push-Location $auditWeb
try {
  # Windows PowerShell treats native stderr (including Bun's command banner)
  # as NativeCommandError; the native exit code remains the result authority.
  $ErrorActionPreference = 'Continue'
  switch ($Phase) {
    'Build' {
      & bun run build *> (Join-Path $auditWork 'build-final.log')
      $auditExit = $LASTEXITCODE
      Get-Content -LiteralPath (Join-Path $auditWork 'build-final.log') -Tail 45
      exit $auditExit
    }
    'Start' {
      if (Get-NetTCPConnection -LocalPort 3132 -State Listen -ErrorAction SilentlyContinue) { throw 'Port 3132 already occupied' }
      $next = Join-Path $auditRoot 'node_modules/next/dist/bin/next'
      $server = Start-Process -FilePath (Get-Command node).Source -ArgumentList @(('"' + $next + '"'), 'start', '-p', '3132', '--hostname', '127.0.0.1') -WorkingDirectory $auditWeb -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $auditWork 'next.out.log') -RedirectStandardError (Join-Path $auditWork 'next.err.log') -ErrorAction Stop
      @{ pid=$server.Id; started=$server.StartTime.ToUniversalTime().ToString('o') } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $auditWork 'next-process.json') -Encoding UTF8
      Write-Output ('Isolated Next process started: ' + $server.Id)
    }
    'Smoke' {
      $auditPlaywrightConfig = Join-Path $PSScriptRoot 'playwright.config.cjs'
      & node (Join-Path $auditRoot 'node_modules/@playwright/test/cli.js') test "--config=$auditPlaywrightConfig" *> (Join-Path $auditWork 'smoke-private.log')
      $auditExit = $LASTEXITCODE
      Get-Content -LiteralPath (Join-Path $auditWork 'smoke-private.log') -Tail 35
      exit $auditExit
    }
    'Pages' { & node (Join-Path $PSScriptRoot 'pages.cjs'); exit $LASTEXITCODE }
    'Restore' { & bun (Join-Path $PSScriptRoot 'restore.ts'); exit $LASTEXITCODE }
    'Tests' {
      $auditTestResults = Join-Path $auditWork 'web-final.json'
      & bun run test --maxWorkers=1 --reporter=json "--outputFile=$auditTestResults" *> (Join-Path $auditWork 'web-final.log')
      $auditExit = $LASTEXITCODE
      if (Test-Path -LiteralPath (Join-Path $auditWork 'web-final.json')) {
        $result = Get-Content -LiteralPath (Join-Path $auditWork 'web-final.json') -Raw | ConvertFrom-Json
        $result | Select-Object numTotalTests,numPassedTests,numFailedTests,numPendingTests,numPassedTestSuites,numFailedTestSuites
      } else { Get-Content -LiteralPath (Join-Path $auditWork 'web-final.log') -Tail 20 }
      exit $auditExit
    }
    'Static' {
      Set-Location $auditRoot
      & bunx turbo run lint typecheck --force *> (Join-Path $auditWork 'static-final.log')
      $auditExit = $LASTEXITCODE
      Get-Content -LiteralPath (Join-Path $auditWork 'static-final.log') -Tail 22
      exit $auditExit
    }
    'Stop' {
      $record = Get-Content -LiteralPath (Join-Path $auditWork 'next-process.json') -Raw | ConvertFrom-Json
      $process = Get-CimInstance Win32_Process -Filter ('ProcessId = ' + [int]$record.pid)
      if ($process) {
        if ($process.CommandLine -notmatch 'next.*start.*3132' -or $process.ExecutablePath -notmatch 'node') { throw 'Server ownership mismatch' }
        Stop-Process -Id $record.pid
      }
      Write-Output 'Isolated Next process stopped'
    }
  }
} finally { Pop-Location }
