@rem Gradle startup script for Windows
@rem Generated for local development — points to cached Gradle 8.7

@if "%DEBUG%"=="" @echo off

set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
set GRADLE_BIN=C:\Users\jatin\.gradle\wrapper\dists\gradle-8.7-bin\bhs2wmbdwecv87pi65oeuq5iu\gradle-8.7\bin\gradle.bat

if not exist "%GRADLE_BIN%" (
    echo ERROR: Gradle not found at %GRADLE_BIN%
    echo Please run: gradle wrapper --gradle-version 8.7
    exit /b 1
)

"%JAVA_HOME%\bin\java.exe" -version 2>nul
if errorlevel 1 (
    echo ERROR: JAVA_HOME not valid: %JAVA_HOME%
    exit /b 1
)

call "%GRADLE_BIN%" %*
