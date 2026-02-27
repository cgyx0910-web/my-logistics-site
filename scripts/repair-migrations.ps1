# Mark migrations 001-025 as applied so db push only runs 026
# Run from project root: .\scripts\repair-migrations.ps1

$ErrorActionPreference = "Stop"
$versions = @(
  "001", "002", "003", "004", "005", "006", "007", "008", "009", "010",
  "011", "012", "013", "014", "015", "016", "017", "018", "019", "020",
  "021", "022", "023", "024", "025"
)

Push-Location $PSScriptRoot\..

foreach ($v in $versions) {
  Write-Host "Repair: $v --status applied"
  npx supabase migration repair $v --status applied
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed. Run: npx supabase migration list"
    Pop-Location
    exit 1
  }
}

Pop-Location
Write-Host "Done. Run: npx supabase db push"
