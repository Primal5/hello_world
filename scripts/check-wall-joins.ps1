$root = Get-Location
$dungeonPath = Join-Path $root 'src\engine\DungeonGenerator.ts'
$loaderPath = Join-Path $root 'src\engine\LevelLoader.ts'

$dungeonContent = Get-Content -Raw -Path $dungeonPath
$loaderContent = Get-Content -Raw -Path $loaderPath

$requirements = @(
  @{ ok = $dungeonContent.Contains('affectsJoins: boolean;'); message = 'DungeonWallSegment doit exposer affectsJoins.' },
  @{ ok = $dungeonContent.Contains('affectsJoins: true'); message = 'Les murs structurels doivent marquer affectsJoins à true.' },
  @{ ok = $loaderContent.Contains('const joinSegments = wallSegments.filter((segment) => segment.affectsJoins);'); message = 'LevelLoader doit calculer les jonctions seulement sur les segments affectsJoins.' }
)

$errors = $requirements | Where-Object { -not $_.ok }
if ($errors.Count -gt 0) {
  Write-Host 'Wall join safety check failed:'
  $errors | ForEach-Object { Write-Host ('- ' + $_.message) }
  exit 1
}

Write-Host 'Wall join safety check passed.'
