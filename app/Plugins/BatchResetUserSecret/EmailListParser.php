<?php

namespace App\Plugins\BatchResetUserSecret;

use InvalidArgumentException;

class EmailListParser
{
    public const MAX_EMAILS = 500;

    public function parse(string $input): array
    {
        $input = trim($input);
        if ($input === '') {
            throw new InvalidArgumentException('请输入需要重置的用户邮箱。');
        }
        if (strpos($input, '，') !== false) {
            throw new InvalidArgumentException('邮箱之间请使用英文逗号（,）分隔，不能使用中文逗号。');
        }

        $emails = [];
        $duplicates = [];
        foreach (explode(',', $input) as $position => $value) {
            $email = trim($value);
            if ($email === '') {
                throw new InvalidArgumentException('第 ' . ($position + 1) . ' 项为空，请检查是否存在连续逗号或末尾逗号。');
            }
            if (strlen($email) > 254 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                throw new InvalidArgumentException('邮箱格式错误：' . $email);
            }

            $key = strtolower($email);
            if (isset($emails[$key])) {
                $duplicates[$key] = $email;
                continue;
            }
            $emails[$key] = $email;
        }

        if (count($emails) > self::MAX_EMAILS) {
            throw new InvalidArgumentException('单次最多处理 ' . self::MAX_EMAILS . ' 个邮箱。');
        }

        return [
            'emails' => array_values($emails),
            'duplicates' => array_values($duplicates),
        ];
    }
}
