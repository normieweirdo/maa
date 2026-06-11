<?php
// admin_get_stories.php
require 'db.php';
header('Content-Type: application/json');

$status = $_GET['status'] ?? 'pending';

if (!in_array($status, ['pending', 'approved'])) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid status."]);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT id, name, text, timestamp, status FROM stories WHERE status = ? ORDER BY timestamp DESC");
    $stmt->execute([$status]);
    $stories = $stmt->fetchAll();
    
    foreach ($stories as &$story) {
        $story['timestamp'] = date("Y-m-d\TH:i:s\Z", strtotime($story['timestamp']));
    }
    
    echo json_encode($stories);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => "Failed to fetch stories."]);
}
?>
