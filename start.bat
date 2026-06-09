@echo off
chcp 65001 >nul
title 心域·恋爱交互游戏

echo ========================================
echo    心域 · 恋爱交互游戏 — 启动器
echo ========================================
echo.

cd /d "%~dp0"

REM 检查环境变量文件
if exist .env (
    echo [ok] 找到 .env 配置文件
) else (
    echo [..] 首次运行，创建 .env 配置文件...
    set /p USER_KEY="请输入你的 API Key (sk-...) : "
    (
        echo LLM_API_KEY=%USER_KEY%
        echo LLM_API_BASE=https://api.openai.com/v1
        echo LLM_MODEL=gpt-4o-mini
    ) > .env
    echo [ok] 已保存到 .env
)
echo.

REM 安装服务端依赖
echo [..] 安装服务端依赖...
cd server
call npm install --silent 2>nul
if %ERRORLEVEL% neq 0 (
    echo [!!] npm install 失败
    pause
    exit /b 1
)
echo [ok] 依赖就绪
echo.

REM 启动服务端
echo [..] 启动聊天服务器...
start "心域-Server" cmd /c "node server.js"
timeout /t 2 /nobreak >nul
echo [ok] 服务器启动 (端口 3001)
echo.

REM 启动前端
echo [..] 启动前端界面...
start "心域-前端" cmd /c "npx vite --host"
timeout /t 3 /nobreak >nul
echo.

echo ========================================
echo   🎯 浏览器已打开: http://localhost:5173
echo   后端服务器:      http://localhost:3001
echo ========================================
echo.
echo 如果浏览器没有自动打开，请手动访问 http://localhost:5173
echo.
echo 按任意键关闭所有窗口...
pause >nul
taskkill /f /t /fi "WINDOWTITLE eq 心域-*" >nul 2>nul
