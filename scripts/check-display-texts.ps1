$root = Get-Location
$files = @(
  'src\text\DisplayText.ts',
  'src\core\Game.ts',
  'src\engine\LevelLoader.ts',
  'src\gameplay\interaction\InteractionSystem.ts',
  'src\ui\store\uiStore.ts',
  'src\ui\inventory\InventoryPanel.tsx',
  'src\ui\hud\HealthOrb.tsx',
  'src\data\items.ts',
  'src\data\dialogues.ts'
) | ForEach-Object { Join-Path $root $_ }

$utf8 = New-Object System.Text.UTF8Encoding($false, $true)
$stringPattern = '["'']([^"'']*\p{L}[^"'']*\s[^"'']*)["'']'
$suspiciousCodepoints = @(0x00C3, 0x00C2, 0xFFFD)
$violations = @()
$encodingViolations = @()

function Read-Utf8Text([string]$path) {
  return [System.IO.File]::ReadAllText($path, $utf8)
}

foreach ($file in $files) {
  $content = Read-Utf8Text $file
  foreach ($codepoint in $suspiciousCodepoints) {
    if ($content.Contains([string][char]$codepoint)) {
      $encodingViolations += "- $($file.Replace($root.Path + '\\', ''))"
      break
    }
  }

  if ($file.EndsWith('src\text\DisplayText.ts')) {
    continue
  }

  $lines = $content -split "`r?`n"
  for ($index = 0; $index -lt $lines.Length; $index++) {
    $trimmed = $lines[$index].Trim()
    if ($trimmed.StartsWith('import ') -or $trimmed.StartsWith('export ') -or $trimmed.Contains('viewBox={')) {
      continue
    }

    $matches = [regex]::Matches($trimmed, $stringPattern)
    foreach ($match in $matches) {
      $value = $match.Groups[1].Value
      if ($value.Contains('DISPLAY_TEXT') -or $value.Contains('../') -or $value.Contains('./')) {
        continue
      }
      $violations += "- $($file.Replace($root.Path + '\\', '')):$($index + 1) -> $value"
    }
  }
}

if ($encodingViolations.Count -gt 0) {
  Write-Host 'Mojibake detected in display text sources:'
  $encodingViolations | ForEach-Object { Write-Host $_ }
  exit 1
}

if ($violations.Count -gt 0) {
  Write-Host 'Raw display text found outside src/text/DisplayText.ts:'
  $violations | ForEach-Object { Write-Host $_ }
  exit 1
}

Write-Host 'Display text check passed.'