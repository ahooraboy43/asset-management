<?php
declare(strict_types=1);
require __DIR__ . '/bootstrap.php';
$workspaceId=api_workspace_id();
api_method('GET','PUT');
if ($_SERVER['REQUEST_METHOD']==='GET') {
    $q=$pdo->prepare('SELECT state_json,updated_at FROM workspace_app_state WHERE workspace_id=? LIMIT 1');
    $q->execute([$workspaceId]); $row=$q->fetch();
    if (!$row) api_json(['state'=>null,'updatedAt'=>null]);
    $state=json_decode($row['state_json'],true);
    if (!is_array($state)) api_json(['error'=>'اطلاعات ذخیره‌شده قابل خواندن نیست.'],500);
    api_json(['state'=>$state,'updatedAt'=>$row['updated_at']]);
}
api_csrf();
$body=api_body(); $state=$body['state'] ?? null;
if (!is_array($state)) api_json(['error'=>'ساختار اطلاعات معتبر نیست.'],422);
foreach (['assets','reminders','services'] as $key) {
    if (!isset($state[$key]) || !is_array($state[$key])) api_json(['error'=>'ساختار اطلاعات کامل نیست.'],422);
    if (count($state[$key])>10000) api_json(['error'=>'تعداد رکوردها بیش از حد مجاز است.'],413);
}
$json=json_encode($state,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
if ($json===false || strlen($json)>5000000) api_json(['error'=>'حجم اطلاعات بیش از حد مجاز است.'],413);
$q=$pdo->prepare('INSERT INTO workspace_app_state(workspace_id,state_json) VALUES(?,?) ON DUPLICATE KEY UPDATE state_json=VALUES(state_json)');
$q->execute([$workspaceId,$json]);
api_json(['ok'=>true,'updatedAt'=>date(DATE_ATOM)]);
