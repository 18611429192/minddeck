$ErrorActionPreference = "Stop"

Write-Host "MindDeck -> GitHub publish" -ForegroundColor Cyan
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw "没有找到 git。请先安装 Git for Windows: https://git-scm.com/download/win"
}

$remote = git remote get-url origin 2>$null
if (-not $remote) {
  git remote add origin https://github.com/18611429192/minddeck.git
} elseif ($remote -ne "https://github.com/18611429192/minddeck.git") {
  Write-Host "当前 origin: $remote"
  git remote set-url origin https://github.com/18611429192/minddeck.git
}

git branch -M main
Write-Host "正在推送到 https://github.com/18611429192/minddeck ..." -ForegroundColor Yellow
git push -u origin main
Write-Host "发布完成。" -ForegroundColor Green
