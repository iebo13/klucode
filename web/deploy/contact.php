<?php
/**
 * First-party contact-form handler for the KluCode static export.
 *
 * LIVE ON PRODUCTION. profile.ts points formEndpoint here for any build whose
 * NEXT_PUBLIC_SITE_URL is klucode.de. Previews keep the mailto hand-off,
 * because GitHub Pages serves static files and will not execute PHP.
 *
 * Why this exists: the alternative to a handler on your own server is a
 * third-party form service — a new data processor that would have to be named
 * in the Datenschutzerklärung and would put visitor messages on someone
 * else's infrastructure. This stays on the Plesk server you already
 * administer, so the site's "keine fremden Server" claim stays true.
 *
 * It is also load-bearing legally. With no phone number on the site, this form
 * is the second contact channel § 5 DDG wants alongside email, on the strength
 * of ECJ C-298/07. A form that does not transmit would not count.
 *
 * DEPLOYING IT:
 *   1. Upload this file to the document root, so it answers on /contact.php.
 *   2. Confirm mail() actually sends on the Plesk server, and that
 *      website@klucode.de passes SPF/DMARC for the domain.
 *   3. Test end to end from the live site before relying on it.
 *
 * The client (contact-form.tsx) POSTs JSON:
 *   { name, email, company, message, website }
 * and only checks response.ok — the response body is for debugging.
 * `website` is the honeypot and must arrive empty. See SPAM below.
 */

declare(strict_types=1);

// ---------------------------------------------------------------------------
const RECIPIENT = 'info@klucode.de';  // where enquiries land
const MAIL_DOMAIN = 'klucode.de';     // the From: domain, see $fromAddress below
const SUBJECT_PREFIX = 'KluCode';     // mail subject: "KluCode — <name>"
const MAX_LEN = 5000;                 // hard cap per field, defense in depth
const MAX_PER_HOUR = 6;               // per IP, see SPAM below
// ---------------------------------------------------------------------------

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function fail(int $code, string $why): never {
  http_response_code($code);
  echo json_encode(['ok' => false, 'error' => $why]);
  exit;
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

// --- SPAM ------------------------------------------------------------------
// A public endpoint that sends mail gets found. Two cheap defences, in the
// order they cost least.
//
// The honeypot: `website` is a real input in the form, positioned off-screen,
// tabbable only by something that is not reading the layout, and labelled to
// be left alone. A person never sees it. A bot filling every field it finds
// does. Answer 200 and send nothing, because a bot told it failed will retry
// with the field removed, and one told it succeeded will not.
if (field($data, 'website', true) !== '') {
  echo json_encode(['ok' => true]);
  exit;
}

// ---------------------------------------------------------------------------

if ($name === '' || $message === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
  fail(422, 'missing or invalid fields');
}

/**
 * The rate limit, which is what a determined script runs into once the
 * honeypot has stopped being enough. Per IP, in the system temp directory,
 * one small file each.
 *
 * AFTER validation on purpose. Counted before it, a script posting garbage
 * would spend somebody else's quota, and IP addresses are shared far more
 * often than they look: an office behind one NAT, a mobile carrier behind
 * CGNAT, a household. Only a request that is about to actually send mail is
 * worth counting, because sending mail is the thing being limited.
 *
 * It fails OPEN. If the store cannot be opened or locked the message still
 * goes through, because a temp directory that has gone read-only should not
 * quietly disconnect the contact page, and the honeypot is still in front of
 * it. The files are a few dozen bytes each and are left for the system's own
 * temp cleanup to collect.
 */
$ip = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
if ($ip !== '') {
  $path = sys_get_temp_dir() . '/klucode-contact-' . hash('sha256', $ip) . '.json';
  $handle = @fopen($path, 'c+');
  if ($handle !== false) {
    if (flock($handle, LOCK_EX)) {
      $now = time();
      $seen = json_decode((string) stream_get_contents($handle), true);
      // Only the last hour counts, which also keeps the file from growing.
      $recent = is_array($seen)
        ? array_values(array_filter($seen, static fn($t) => is_int($t) && $t > $now - 3600))
        : [];
      if (count($recent) >= MAX_PER_HOUR) {
        flock($handle, LOCK_UN);
        fclose($handle);
        fail(429, 'too many messages, please try again later');
      }
      $recent[] = $now;
      ftruncate($handle, 0);
      rewind($handle);
      fwrite($handle, json_encode($recent));
      fflush($handle);
      flock($handle, LOCK_UN);
    }
    fclose($handle);
  }
}

// From: an address on this domain, so SPF and DMARC pass. The visitor goes into
// Reply-To, so answering works normally without ever forging their address.
//
// The domain is a constant and NOT $_SERVER['SERVER_NAME']: with Apache's
// UseCanonicalName off, which is common on Plesk, SERVER_NAME is taken from the
// request's Host header, and a header is whatever the caller says it is. That
// would have let anyone make this server emit mail From: a domain of their
// choosing.
$fromAddress = 'website@' . MAIL_DOMAIN;

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
