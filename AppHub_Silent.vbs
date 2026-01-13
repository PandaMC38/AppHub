Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")
CurrentDir = FSO.GetParentFolderName(WScript.ScriptFullName)

' Check if node_modules exists
If Not FSO.FolderExists(CurrentDir & "\node_modules") Then
    ' Run npm install visibly (1) and wait (True)
    WshShell.Run "cmd /c cd /d " & chr(34) & CurrentDir & chr(34) & " && echo Installation des dependances (Premier lancement)... && npm install", 1, True
End If

' Launch App silently (0)
WshShell.Run chr(34) & CurrentDir & "\launch.bat" & Chr(34), 0
Set WshShell = Nothing
