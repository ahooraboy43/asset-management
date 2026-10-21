<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');

function api_json(array $data, int $status = 200): never {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
function api_body(): array {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $value = json_decode($raw, true);
    if (!is_array($value)) api_json(['error' => 'درخواست JSON معتبر نیست.'], 400);
    return $value;
}
function api_method(string ...$allowed): void {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (!in_array($method, $allowed, true)) {
        header('Allow: ' . implode(', ', $allowed));
        api_json(['error' => 'روش درخواست مجاز نیست.'], 405);
    }
}
function api_origin(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin === '') return;
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $expected = $scheme . '://' . ($_SERVER['HTTP_HOST'] ?? '');
    if (!hash_equals($expected, $origin)) api_json(['error' => 'مبدأ درخواست مجاز نیست.'], 403);
}
$configPath = dirname(__DIR__) . '/asset-management-config.php';
if (!is_file($configPath)) $configPath = __DIR__ . '/config.php';
if (!is_file($configPath)) api_json(['error' => 'تنظیمات سرور آماده نیست. فایل تنظیمات خصوصی را طبق راهنمای نصب ایجاد کنید.'], 503);
$config = require $configPath;
try {
    $dsn = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $config['db_host'] ?? 'localhost', $config['db_name'] ?? '');
    $pdo = new PDO($dsn, $config['db_user'] ?? '', $config['db_password'] ?? '', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
} catch (Throwable $e) {
    error_log('asset-management DB connection failed: ' . $e->getMessage());
    api_json(['error' => 'اتصال به دیتابیس برقرار نشد؛ تنظیمات سرور را بررسی کنید.'], 503);
}
$secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
session_name('asset_management_session');
session_set_cookie_params(['lifetime'=>0, 'path'=>'/', 'secure'=>$secure, 'httponly'=>true, 'samesite'=>'Strict']);
if (session_status() !== PHP_SESSION_ACTIVE) session_start();
function api_user_id(): int {
    if (empty($_SESSION['user_id']) || empty($_SESSION['workspace_id'])) api_json(['error'=>'برای ادامه وارد حساب شوید.'], 401);
    return (int)$_SESSION['user_id'];
}
function api_workspace_id(): int {
    api_user_id();
    return (int)$_SESSION['workspace_id'];
}
function api_csrf(): void {
    api_origin();
    $known = (string)($_SESSION['csrf_token'] ?? '');
    $sent = (string)($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    if ($known === '' || $sent === '' || !hash_equals($known, $sent)) api_json(['error'=>'اعتبار درخواست منقضی شده؛ دوباره وارد شوید.'], 403);
}
