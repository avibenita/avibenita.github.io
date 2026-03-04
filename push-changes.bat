@echo off
cd /d C:\GitHub

echo Adding all changes...
git add .

echo Committing with default message...
git commit -m "Quick update from batch script"

echo Pushing to GitHub main branch...
git push origin main

echo Done!
pause
