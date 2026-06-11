<?php
// admin_action.php
require 'db.php';
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $id = $data['id'] ?? null;
    $action = $data['action'] ?? null;
    
    if (!$id || !in_array($action, ['approve', 'reject', 'delete'])) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid ID or action."]);
        exit;
    }
    
    try {
        if ($action === 'approve') {
            $stmt = $pdo->prepare("UPDATE stories SET status = 'approved' WHERE id = ?");
            $stmt->execute([$id]);
        } else if ($action === 'reject' || $action === 'delete') {
            $stmt = $pdo->prepare("DELETE FROM stories WHERE id = ?");
            $stmt->execute([$id]);
        }
        echo json_encode(["success" => true]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => "Failed to process action."]);
    }
} else {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed."]);
}
?>
