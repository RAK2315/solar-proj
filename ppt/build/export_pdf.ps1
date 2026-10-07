# Saves the deck as a PDF with PowerPoint itself, so the PDF is exactly what the
# deck looks like on this machine, fonts included. The PDF is what gets submitted.
#   powershell -File ppt\build\export_pdf.ps1
$root = Split-Path $PSScriptRoot -Parent
$deck = Join-Path $root 'SURYA-AGENT-Round1.pptx'
$pdf = Join-Path $root 'SURYA-AGENT-Round1.pdf'
$app = New-Object -ComObject PowerPoint.Application
try {
  $pres = $app.Presentations.Open($deck, $true, $false, $false)
  $pres.SaveAs($pdf, 32)   # 32 is ppSaveAsPDF
  $pres.Close()
} finally {
  $app.Quit()
}
Write-Output $pdf
