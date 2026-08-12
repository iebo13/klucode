<?php
/**
 * First-party contact-form handler for the KluCode static export.
 *
 * OFF BY DEFAULT. The site ships with the mailto fallback; this file only
 * does anything once you deliberately switch the form over to it.
 *
 * Why this exists: the alternative to a handler on your own server is a
 * third-party form service — a new data processor that would have to be named
 * in the Datenschutzerklärung and would put visitor messages on someone
 * else's infrastructure. This stays on the Plesk server you already
 * administer, so the site's "keine fremden Server" claim stays true.
 *
 * To enable:
 *   1. Set RECIPIENT below to your real address.
 *   2. Upload this file next to the exported site (document root, so it is
 *      reachable as /contact.php).
 *   3. In web/src/content/profile.ts set:  formEndpoint: '/contact.php'
 *   4. Update the Datenschutzerklärung §5 (Kontaktformular) in de.ts/en.ts:
 *      the form then DOES transmit data to this website's server. The current
 *      §5 text explicitly promises an update before server-side sending is
 *      enabled — keep that promise.
 *   5. Rebuild and redeploy, then test end to end.
 *
 * The client (contact-form.tsx) POSTs JSON: { name, email, company, message }
 * and only checks response.ok — the response body is for debugging.
 */

declare(strict_types=1);

// ---------------------------------------------------------------------------
const RECIPIENT = 'CHANGE-ME@klucode.de'; // where enquiries land
const SUBJECT_PREFIX = 'KluCode';         // mail subject: "KluCode — <name>"
const MAX_LEN = 5000;                     // hard cap per field, defense in depth
// ---------------------------------------------------------------------------

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function fail(int $code, string $why): never {
  http_response_code($code);
  echo json_encode(['ok' => false, 'error' => $why]);
  exit;
}

if (RECIPIENT === 'CHANGE-ME@klucode.de') {
  fail(500, 'handler not configured');
}
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
  header('Allow: POST');
  fail(405, 'POST only');
}

$raw = file_get_contents('php://input');
if ($raw === false || strlen($raw) > 64 * 1024) {
  fail(413, 'payload too large');
}
$data = json_decode($raw, true);
if (!is_array($data)) {
  fail(400, 'expected JSON');
}

/** Trimmed, length-capped string field; CR/LF stripped where noted. */
function field(array $data, string $key, bool $singleLine): string {
  $v = $data[$key] ?? '';
  if (!is_string($v)) return '';
  $v = trim($v);
  if ($singleLine) {
    // Anything that ends up near a mail header must not smuggle new headers in.
    $v = str_replace(["\r", "\n"], ' ', $v);
  }
  return mb_substr($v, 0, MAX_LEN);
}

$name = field($data, 'name', true);
$email = field($data, 'email', true);
$company = field($data, 'company', true);
$message = field($data, 'message', false);

if ($name === '' || $message === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
  fail(422, 'missing or invalid fields');
}

// From: an address on this domain (SPF/DMARC will reject forged visitor
// addresses); the visitor goes into Reply-To so answering works normally.
$host = preg_replace('/^www\./', '', $_SERVER['SERVER_NAME'] ?? 'klucode.de');
$fromAddress = 'website@' . $host;

$subject = mb_encode_mimeheader(SUBJECT_PREFIX . ' — ' . $name, 'UTF-8');
$body = $name . "\n"
  . ($company !== '' ? $company . "\n" : '')
  . $email . "\n\n"
  . $message . "\n";

$headers = [
  'From: ' . $fromAddress,
  'Reply-To: ' . $email,
  'MIME-Version: 1.0',
  'Content-Type: text/plain; charset=UTF-8',
  'Content-Transfer-Encoding: 8bit',
];

if (!mail(RECIPIENT, $subject, $body, implode("\r\n", $headers))) {
  fail(500, 'mail() failed');
}

echo json_encode(['ok' => true]);
