# Native PowerShell launcher: transport argv as data, not shell syntax.
if ($args.Count -eq 1 -and $args[0] -eq '--crew-batch-guard') {
    try {
        $self = Get-CimInstance Win32_Process -Filter "ProcessId=$PID" -ErrorAction Stop
        $parent = Get-CimInstance Win32_Process -Filter "ProcessId=$($self.ParentProcessId)" -ErrorAction Stop
        if ($parent.Name -ne 'cmd.exe' -or -not $parent.CommandLine) { throw 'Cannot inspect the batch launcher.' }
        if ($parent.CommandLine -match "[\r\n]") { throw 'Batch forwarding cannot preserve multiline task text.' }
        exit 0
    } catch {
        [Console]::Error.WriteLine('crew: unsafe batch task arguments; use crew.ps1 or --task-file with a UTF-8 file. No task was created.')
        exit 2
    }
}
$json = ConvertTo-Json -InputObject @($args) -Compress
$encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($json))
& node (Join-Path $PSScriptRoot '../crew.mjs') _argv $encoded
exit $LASTEXITCODE
