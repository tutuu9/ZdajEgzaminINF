export const phpCheck = [
  '<?php',
  "header('Content-Type: text/plain; charset=UTF-8');",
  "echo 'PHP działa';",
].join('\n');

export const phpCities = [
  '<?php',
  "header('Content-Type: text/html; charset=UTF-8');",
  '',
  "$login = 'TWÓJ_LOGIN';",
  "$password = 'TWOJE_HASŁO';",
  '$port = 3306;',
  '',
  "$db = new mysqli('127.0.0.1', $login, $password, 'inf03_xampp_demo', $port);",
  "$db->set_charset('utf8mb4');",
  "$result = $db->query('SELECT nazwa FROM miasta ORDER BY id');",
  '',
  "echo '<ul>';",
  'while ($row = $result->fetch_assoc()) {',
  "    $name = htmlspecialchars($row['nazwa'], ENT_QUOTES, 'UTF-8');",
  "    echo '<li>' . $name . '</li>';",
  '}',
  "echo '</ul>';",
  '$db->close();',
].join('\n');
