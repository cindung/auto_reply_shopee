@echo off
cd /d "%~dp0"
echo Running git init and push from %CD%
git init
git add .
git commit -m "Initial commit" || echo No changes to commit
git branch -M main
git remote remove origin 2>nul || rem
git remote add origin https://github.com/cindung/auto_reply_shopee.git
echo Now pushing to origin main. You may be prompted for credentials.
git push -u origin main
pause
