<?php
header('Content-Type: application/json');
echo json_encode([
    'status' => 'ok',
    'message' => 'Laravel 11 Backend Ready',
    'php_version' => PHP_VERSION
]);
