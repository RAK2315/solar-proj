# Renders every slide of the deck to a PNG with PowerPoint itself, for checking
# that no text overflows a box and no picture is stretched.
#   powershell -File ppt\build\render.ps1 [outDir]
param([string]$Out = (Join-Path $PSScriptRoot 'render'))
$deck = Join-Path (Split-Path $PSScriptRoot -Parent) 'SURYA-AGENT-Round1.pptx'
New-Item -ItemType Directory -Force $Out | Out-Null
Get-ChildItem $Out -Filter *.png | Remove-Item -Confirm:$false
$app = New-Object -ComObject PowerPoint.Application
try {
  # ReadOnly, no title, no window: the deck on disk is not touched.
  $pres = $app.Presentations.Open($deck, $true, $false, $false)
  foreach ($slide in $pres.Slides) {
    $slide.Export((Join-Path $Out ('slide-{0:d2}.png' -f $slide.SlideIndex)), 'PNG', 1600, 900)
  }
  $pres.Close()
} finally {
  $app.Quit()
}
Write-Output "rendered to $Out"
