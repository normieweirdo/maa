<?php
// get_stories.php
require 'db.php';
header('Content-Type: application/json');

try {
    $stmt = $pdo->prepare("SELECT id, name, text, timestamp FROM stories WHERE status = 'approved' ORDER BY timestamp DESC");
    $stmt->execute();
    $stories = $stmt->fetchAll();
    
    // Format timestamp to ISO 8601 to match existing frontend expectations
    foreach ($stories as &$story) {
        $story['timestamp'] = date("Y-m-d\TH:i:s\Z", strtotime($story['timestamp']));
    }
    
    echo json_encode($stories);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => "Failed to fetch stories."]);
}
?>
