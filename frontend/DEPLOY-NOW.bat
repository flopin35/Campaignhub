@echo off
title CampaignHub - publishing
cd /d "%~dp0"
echo Publishing CampaignHub to production...
echo.
call npx --yes vercel --prod --yes
echo.
echo Finished. You can close this window.
pause
