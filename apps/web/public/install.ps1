# UTF-8 output
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

$ErrorActionPreference = "Stop"

$InstallDir = "$env:LOCALAPPDATA\Programs\klic"
$BinName = "klic-leaderboard"
$InstallUrl = "https://use.klic.co.kr/cli/klic-leaderboard"
$ServiceName = "KLICLeaderboard"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  KLIC Leaderboard CLI Installer" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Claude Code is installed
$ClaudeProjects = $null
foreach ($d in @("$env:USERPROFILE\.claude\projects", "$env:USERPROFILE\.config\claude\projects", "$env:APPDATA\claude\projects", "$env:APPDATA\Claude\projects")) {
    if (Test-Path $d) { $ClaudeProjects = $d; break }
}
if (-not $ClaudeProjects) {
    Write-Host ""
    Write-Host "⚠ Claude Code가 설치되어 있지 않습니다." -ForegroundColor Red
    Write-Host ""
    Write-Host "  KLIC Leaderboard는 Claude Code 사용 데이터를 수집합니다." -ForegroundColor White
    Write-Host "  Claude Code를 먼저 설치한 후 이 스크립트를 다시 실행하세요." -ForegroundColor White
    Write-Host ""
    Write-Host "  Claude Code 설치: https://claude.ai/download" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

# Check node, install if missing
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js가 설치되어 있지 않습니다. 자동 설치합니다..." -ForegroundColor Yellow
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements | Out-Null
    } else {
        Write-Host "winget을 찾을 수 없습니다. 수동으로 설치해주세요." -ForegroundColor Red
        Write-Host "https://nodejs.org" -ForegroundColor Cyan
        exit 1
    }
    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Host "Node.js 설치에 실패했습니다." -ForegroundColor Red
        Write-Host "수동 설치: https://nodejs.org" -ForegroundColor Cyan
        exit 1
    }
}

# 1. Download
Write-Host "Node.js: $(node --version)" -ForegroundColor Gray
Write-Host "[1/5] CLI 다운로드 중..." -ForegroundColor Green
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
$OutPath = "$InstallDir\$BinName.js"
Invoke-WebRequest -Uri $InstallUrl -OutFile $OutPath
Write-Host "   -> $OutPath" -ForegroundColor Gray

# Create .cmd wrapper so Windows can run it directly
$CmdPath = "$InstallDir\$BinName.cmd"
$NodeExe = (Get-Command node).Source
"@echo off`r`n`"$NodeExe`" `"%~dp0\$BinName.js`" %*" | Out-File -FilePath $CmdPath -Encoding ASCII
Write-Host "   -> $CmdPath" -ForegroundColor Gray

# 2. Add to PATH
Write-Host "[2/4] PATH 등록 중..." -ForegroundColor Green
$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($UserPath -notlike "*$InstallDir*") {
    [Environment]::SetEnvironmentVariable("Path", "$UserPath;$InstallDir", "User")
    $env:Path = "$env:Path;$InstallDir"
}
Write-Host "   -> $InstallDir added to PATH" -ForegroundColor Gray

# 3. Register scheduled task (runs every 30 min, starts on logon)
Write-Host "[3/5] 작업 스케줄러 등록 중..." -ForegroundColor Green
$LogDir = "$env:USERPROFILE\.klic\leaderboard"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

# Remove existing task
Unregister-ScheduledTask -TaskName $ServiceName -Confirm:$false -ErrorAction SilentlyContinue

$NodePath = (Get-Command node).Source
$Action = New-ScheduledTaskAction -Execute "$InstallDir\$BinName.cmd" -Argument "daemon" -WorkingDirectory $LogDir
$Trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 30)
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartInterval (New-TimeSpan -Minutes 1) -RestartCount 3

Register-ScheduledTask -TaskName $ServiceName -Action $Action -Trigger $Trigger -Settings $Settings -Description "KLIC Leaderboard - 30분마다 Claude Code 사용량 제출" | Out-Null
Write-Host "   -> 작업 스케줄러 등록 완료 (로그인 시 + 30분마다 실행)" -ForegroundColor Gray

# 4. Login
Write-Host ""
Write-Host "[4/5] 로그인이 필요합니다." -ForegroundColor Yellow
Write-Host ""
Write-Host "  1. 브라우저에서 API 키 발급:" -ForegroundColor White
Write-Host "     https://use.klic.co.kr/ko/settings" -ForegroundColor Cyan
Write-Host ""
Write-Host "  2. 아래 명령어로 로그인:" -ForegroundColor White
Write-Host "     klic-leaderboard login" -ForegroundColor Cyan
Write-Host ""

try {
    klic-leaderboard login
    if ($LASTEXITCODE -ne 0) { throw }
    # Login succeeded - start daemon
    Start-ScheduledTask -TaskName $ServiceName
    Write-Host ""
    Write-Host "[5/5] 데몬 시작 완료!" -ForegroundColor Green
    Write-Host "   30분마다 Claude Code 사용량이 자동 제출됩니다." -ForegroundColor Gray
} catch {
    Write-Host ""
    Write-Host "[5/5] 로그인을 건너뛰셨습니다." -ForegroundColor Yellow
    Write-Host "   나중에 로그인한 후 데몬을 수동으로 시작하세요:" -ForegroundColor Gray
    Write-Host "     Start-ScheduledTask -TaskName $ServiceName" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  서비스 관리" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  로그:    Get-Content $LogDir\daemon.log -Tail 20" -ForegroundColor Gray
Write-Host "  중지:    Unregister-ScheduledTask -TaskName $ServiceName" -ForegroundColor Gray
Write-Host "  재시작:  Start-ScheduledTask -TaskName $ServiceName" -ForegroundColor Gray
