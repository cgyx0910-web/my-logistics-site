# Run repairs 007-025 only (use after 001-006 already applied)
# Run from project root: .\scripts\repair-migrations-007-to-025.ps1

$ErrorActionPreference = "Stop"
$versions = @(
  "007", "008", "009", "010", "011", "012", "013", "014", "015",
  "016", "017", "018", "019", "020", "021", "022", "023", "024", "025"
)

Push-Location $PSScriptRoot\..

foreach ($v in $versions) {
  Write-Host "Repair: $v --status applied"
  npx supabase migration repair $v --status applied
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed at $v"
    Pop-Location
    exit 1
  }
}

Pop-Location
Write-Host "Done. Run: npx supabase db push"
