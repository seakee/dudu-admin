UPDATE `sys_user`
SET `email` = 'local-admin@example.com',
    `phone` = '13800000000',
    `password` = '$2a$12$0n/i3ghYFqIwOiXHQFixHOoU4CSlcD5d5NdNejRckd1proQkOqyzu',
    `totp_key` = NULL,
    `totp_enabled` = 0,
    `user_name` = 'local-admin',
    `updated_at` = NOW()
WHERE `id` = 1;
