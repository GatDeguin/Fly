param([switch]$PrepareOnly)
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$localPath = Join-Path $projectRoot '.local'
New-Item -ItemType Directory -Path $localPath -Force | Out-Null
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$nodePath = if ($nodeCommand) { $nodeCommand.Source } else { 'C:\Program Files\nodejs\node.exe' }
if (-not (Test-Path -LiteralPath $nodePath)) { throw 'Node.js is required for the optional phone bridge. Open index.html for normal PC flight.' }
$addresses = @([Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces() | Where-Object { $_.OperationalStatus -eq 'Up' } | ForEach-Object { $_.GetIPProperties().UnicastAddresses } | Where-Object { $_.Address.AddressFamily -eq 'InterNetwork' -and -not [Net.IPAddress]::IsLoopback($_.Address) } | ForEach-Object { $_.Address.ToString() } | Where-Object { $_ -match '^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)' } | Sort-Object -Unique)
$configPath = Join-Path $localPath 'tls.json'
$pfxPath = Join-Path $localPath 'server.pfx'
$caPath = Join-Path $localPath 'SkyJourney-Local-CA.cer'
$fingerprint = ($addresses -join ',')
$existing = $null
if (Test-Path -LiteralPath $configPath) { try { $existing = Get-Content -Raw -LiteralPath $configPath | ConvertFrom-Json } catch {} }
if (-not $existing -or $existing.version -ne 2 -or $existing.addresses -ne $fingerprint -or -not (Test-Path -LiteralPath $pfxPath) -or -not (Test-Path -LiteralPath $caPath) -or [DateTime]::Parse($existing.expires).ToUniversalTime() -lt [DateTime]::UtcNow.AddDays(7)) {
  Write-Host 'Creating a local HTTPS certificate. No certificate stores or firewall rules are changed.'
  $hash = [Security.Cryptography.HashAlgorithmName]::SHA256
  $padding = [Security.Cryptography.RSASignaturePadding]::Pkcs1
  $caKey = [Security.Cryptography.RSACng]::new(2048)
  $caRequest = [Security.Cryptography.X509Certificates.CertificateRequest]::new('CN=SkyJourney Local CA', $caKey, $hash, $padding)
  $caRequest.CertificateExtensions.Add([Security.Cryptography.X509Certificates.X509BasicConstraintsExtension]::new($true, $false, 0, $true))
  $caRequest.CertificateExtensions.Add([Security.Cryptography.X509Certificates.X509KeyUsageExtension]::new([Security.Cryptography.X509Certificates.X509KeyUsageFlags]::KeyCertSign -bor [Security.Cryptography.X509Certificates.X509KeyUsageFlags]::CrlSign, $true))
  $caRequest.CertificateExtensions.Add([Security.Cryptography.X509Certificates.X509SubjectKeyIdentifierExtension]::new($caRequest.PublicKey, $false))
  $start = [DateTimeOffset]::UtcNow.AddMinutes(-10)
  $expiry = [DateTimeOffset]::UtcNow.AddYears(1)
  $caCertificate = $caRequest.CreateSelfSigned($start, $expiry.AddDays(1))
  $serverKey = [Security.Cryptography.RSACng]::new(2048)
  $request = [Security.Cryptography.X509Certificates.CertificateRequest]::new('CN=SkyJourney Local Flight', $serverKey, $hash, $padding)
  $request.CertificateExtensions.Add([Security.Cryptography.X509Certificates.X509BasicConstraintsExtension]::new($false, $false, 0, $true))
  $request.CertificateExtensions.Add([Security.Cryptography.X509Certificates.X509KeyUsageExtension]::new([Security.Cryptography.X509Certificates.X509KeyUsageFlags]::DigitalSignature -bor [Security.Cryptography.X509Certificates.X509KeyUsageFlags]::KeyEncipherment, $true))
  $eku = [Security.Cryptography.OidCollection]::new()
  $eku.Add([Security.Cryptography.Oid]::new('1.3.6.1.5.5.7.3.1')) | Out-Null
  $request.CertificateExtensions.Add([Security.Cryptography.X509Certificates.X509EnhancedKeyUsageExtension]::new($eku, $false))
  $san = [Security.Cryptography.X509Certificates.SubjectAlternativeNameBuilder]::new()
  $san.AddDnsName('localhost')
  $san.AddIPAddress([Net.IPAddress]::Parse('127.0.0.1'))
  foreach ($address in $addresses) { $san.AddIPAddress([Net.IPAddress]::Parse($address)) }
  $request.CertificateExtensions.Add($san.Build())
  $serial = New-Object byte[] 16
  $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
  $rng.GetBytes($serial)
  $unsigned = $request.Create($caCertificate, $start, $expiry, $serial)
  $serverCertificate = [Security.Cryptography.X509Certificates.RSACertificateExtensions]::CopyWithPrivateKey($unsigned, $serverKey)
  $passwordBytes = New-Object byte[] 24
  $rng.GetBytes($passwordBytes)
  $password = [Convert]::ToBase64String($passwordBytes)
  $chain = [Security.Cryptography.X509Certificates.X509Certificate2Collection]::new()
  $chain.Add($serverCertificate) | Out-Null
  $publicCA = [Security.Cryptography.X509Certificates.X509Certificate2]::new($caCertificate.Export([Security.Cryptography.X509Certificates.X509ContentType]::Cert))
  $chain.Add($publicCA) | Out-Null
  [IO.File]::WriteAllBytes($pfxPath, $chain.Export([Security.Cryptography.X509Certificates.X509ContentType]::Pkcs12, $password))
  [IO.File]::WriteAllBytes($caPath, $caCertificate.Export([Security.Cryptography.X509Certificates.X509ContentType]::Cert))
  @{ version = 2; password = $password; addresses = $fingerprint; expires = $expiry.ToString('o') } | ConvertTo-Json | Set-Content -LiteralPath $configPath -Encoding UTF8
  $rng.Dispose()
  $serverKey.Dispose()
  $caKey.Dispose()
}
if ($PrepareOnly) { Write-Host 'Local HTTPS certificate is ready.'; exit 0 }
Write-Host 'Launching SkyJourney. Keep this window open while flying with your phone.'
& $nodePath (Join-Path $PSScriptRoot 'local-server.mjs') --open
exit $LASTEXITCODE
