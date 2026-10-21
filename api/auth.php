<?php
declare(strict_types=1);
require __DIR__ . '/bootstrap.php';
api_method('GET','POST');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (empty($_SESSION['user_id']) || empty($_SESSION['workspace_id'])) api_json(['authenticated'=>false]);
    api_json(['authenticated'=>true,'email'=>$_SESSION['email'] ?? '', 'csrfToken'=>$_SESSION['csrf_token'] ?? '']);
}
api_origin();
$body=api_body();
$action=(string)($body['action'] ?? '');
if ($action === 'logout') {
    if (!empty($_SESSION['user_id'])) api_csrf();
    $_SESSION=[];
    if (ini_get('session.use_cookies')) {
        $p=session_get_cookie_params();
        setcookie(session_name(),'',time()-42000,$p['path'],'',(bool)$p['secure'],(bool)$p['httponly']);
    }
    session_destroy();
    api_json(['ok'=>true]);
}
if ($action === 'register') {
    $email=strtolower(trim((string)($body['email'] ?? '')));
    $password=(string)($body['password'] ?? '');
    $display=trim((string)($body['displayName'] ?? ''));
    if (!filter_var($email,FILTER_VALIDATE_EMAIL) || strlen($email)>190) api_json(['error'=>'ایمیل معتبر وارد کنید.'],422);
    if (strlen($password)<12) api_json(['error'=>'رمز عبور باید حداقل ۱۲ نویسه داشته باشد.'],422);
    if (strlen($password)>4096) api_json(['error'=>'رمز عبور بیش از حد طولانی است.'],422);
    try {
        $pdo->beginTransaction();
        $q=$pdo->prepare('INSERT INTO users(email,password_hash,display_name) VALUES(?,?,?)');
        $q->execute([$email,password_hash($password,PASSWORD_DEFAULT),mb_substr($display,0,120)]);
        $userId=(int)$pdo->lastInsertId();
        $q=$pdo->prepare('INSERT INTO workspaces(name,owner_user_id) VALUES(?,?)');
        $q->execute(['فضای کاری '.$email,$userId]);
        $workspaceId=(int)$pdo->lastInsertId();
        $q=$pdo->prepare("INSERT INTO workspace_members(workspace_id,user_id,role) VALUES(?,?,'owner')");
        $q->execute([$workspaceId,$userId]);
        $pdo->commit();
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        if ($e->getCode()==='23000') api_json(['error'=>'این ایمیل قبلاً ثبت شده است.'],409);
        error_log('asset-management registration failed: '.$e->getMessage());
        api_json(['error'=>'ثبت‌نام انجام نشد.'],500);
    }
    session_regenerate_id(true);
    $_SESSION['user_id']=$userId; $_SESSION['workspace_id']=$workspaceId; $_SESSION['email']=$email; $_SESSION['csrf_token']=bin2hex(random_bytes(32));
    api_json(['ok'=>true,'email'=>$email,'csrfToken'=>$_SESSION['csrf_token']],201);
}
if ($action === 'login') {
    $email=strtolower(trim((string)($body['email'] ?? '')));
    $password=(string)($body['password'] ?? '');
    $q=$pdo->prepare('SELECT id,email,password_hash FROM users WHERE email=? LIMIT 1');
    $q->execute([$email]); $user=$q->fetch();
    if (!$user || !password_verify($password,$user['password_hash'])) api_json(['error'=>'ایمیل یا رمز عبور نادرست است.'],401);
    $q=$pdo->prepare("SELECT w.id FROM workspaces w JOIN workspace_members m ON m.workspace_id=w.id WHERE m.user_id=? ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,w.id LIMIT 1");
    $q->execute([(int)$user['id']]); $workspace=$q->fetch();
    if (!$workspace) api_json(['error'=>'برای این حساب فضای کاری تعریف نشده است.'],403);
    session_regenerate_id(true);
    $_SESSION['user_id']=(int)$user['id']; $_SESSION['workspace_id']=(int)$workspace['id']; $_SESSION['email']=$user['email']; $_SESSION['csrf_token']=bin2hex(random_bytes(32));
    api_json(['ok'=>true,'email'=>$user['email'],'csrfToken'=>$_SESSION['csrf_token']]);
}
api_json(['error'=>'عملیات شناخته‌شده نیست.'],400);
