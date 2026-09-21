' Chay cac server hoan toan an trong background
Dim fso, sh, scriptDir, bridgeDir
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

If fso.FolderExists(scriptDir & "\dashboard") Then
    bridgeDir = scriptDir
Else
    bridgeDir = fso.GetAbsolutePathName(scriptDir & "\..")
End If

sh.CurrentDirectory = bridgeDir

' Server 0: Next.js Control Center Dashboard (port 3100)
sh.Run "cmd /c ""cd /d """ & bridgeDir & "\dashboard"" && node start.mjs""", 0, False

' Server 1: ChatGPT & Facebook Ca Nhan (port 3101)
sh.Run "cmd /c ""cd /d """ & bridgeDir & """ && node server.mjs >> server.log 2>&1""", 0, False

' Server 4: Telegram Bot & Remote Watchdog (port 3104)
sh.Run "cmd /c ""cd /d """ & bridgeDir & """ && node bot-server.mjs >> bot-server.log 2>&1""", 0, False
