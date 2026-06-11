<?php
// admin_add_approved.php
require 'db.php';
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $name = trim($data['name'] ?? '');
    $text = trim($data['text'] ?? '');
    
    if (empty($name) || empty($text)) {
        http_response_code(400);
        echo json_encode(["error" => "Name and text are required."]);
        exit;
    }
    
    try {
        $stmt = $pdo->prepare("INSERT INTO stories (name, text, status) VALUES (?, ?, 'approved')");
        $stmt->execute([$name, $text]);
        echo json_encode(["success" => true, "id" => $pdo->lastInsertId()]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => "Failed to add story."]);
    }
} else {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed."]);
}
?>
