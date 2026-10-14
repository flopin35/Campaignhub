@echo off
title CampaignHub - publishing
cd /d "%~dp0"

if not exist ".env.openai" goto rules
echo [0/2] Checking your OpenAI key and saving it in Vercel...
set /p OPENAI_KEY=<.env.openai
set OA_STATUS=none
for /f %%c in ('curl.exe -s -o nul -w "%%{http_code}" https://api.openai.com/v1/models -H "Authorization: Bearer %OPENAI_KEY%"') do set OA_STATUS=%%c
set OPENAI_KEY=
if "%OA_STATUS%"=="200" echo    OpenAI key works.
if not "%OA_STATUS%"=="200" echo    WARNING: OpenAI answered %OA_STATUS% - the key may be wrong or the account has no credit.
call npx --yes vercel env rm OPENAI_API_KEY production --yes >nul 2>&1
call npx --yes vercel env add OPENAI_API_KEY production < .env.openai
if errorlevel 1 goto keyfail
del ".env.openai"
echo    Saved in Vercel and removed from this computer.
goto rules
:keyfail
echo    Could not save the key in Vercel. Run "npx vercel login", then run this file again.

:rules
echo.
echo [1/2] Publishing security rules to Firebase...
pushd ..\firebase
call npx --yes firebase-tools deploy --only firestore:rules,storage --project new1-e94db --non-interactive
if errorlevel 1 echo    Skipped - the website publishes the rules itself after step 2.
popd
echo.
echo [2/2] Publishing the website...
call npx --yes vercel --prod --yes
echo.
echo Finished. Open https://www.campaignhubgh.com/api/billing/config and check the "health" part.
pause
