$root = Get-Location
$files = @(
  'src\core\Game.ts',
  'src\engine\LevelLoader.ts',
  'src\gameplay\interaction\InteractionSystem.ts',
  'src\ui\store\uiStore.ts',
  'src\ui\inventory\InventoryPanel.tsx',
  'src\ui\hud\HealthOrb.tsx',
  'src\data\items.ts',
  'src\data\dialogues.ts'
) | ForEach-Object { Join-Path $root $_ }

$stringPattern = '[''"'']([^''"'']*[A-Za-zÀ-ÿ][^''"'']*\s[^''"'']*)[''"'']'
$violations = @()

foreach ($file in $files) {
  $lines = Get-Content -Path $file
  for ($index = 0; $index -lt $lines.Length; $index++) {
    $trimmed = $lines[$index].Trim()
    if ($trimmed.StartsWith('import ') -or $trimmed.StartsWith('export ') -or $trimmed.Contains('viewBox={`')) {
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

if ($violations.Count -gt 0) {
  Write-Host 'Raw display text found outside src/text/DisplayText.ts:'
  $violations | ForEach-Object { Write-Host $_ }
  exit 1
}

Write-Host 'Display text check passed.'
