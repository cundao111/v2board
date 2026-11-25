<?php

namespace App\Plugins\BatchResetUserSecret;

use App\Models\User;
use App\Utils\Helper;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class BatchResetUserSecretService
{
    public function reset(array $emails): array
    {
        return DB::transaction(function () use ($emails) {
            $users = User::whereIn('email', $emails)->lockForUpdate()->get();
            $usersByEmail = [];
            foreach ($users as $user) {
                $usersByEmail[strtolower($user->email)] = $user;
            }

            $resetEmails = [];
            $notFoundEmails = [];
            foreach ($emails as $email) {
                $key = strtolower($email);
                if (!isset($usersByEmail[$key])) {
                    $notFoundEmails[] = $email;
                    continue;
                }

                $user = $usersByEmail[$key];
                $user->uuid = Helper::guid(true);
                $user->token = $this->generateUniqueToken();
                if (!$user->save()) {
                    throw new RuntimeException('重置用户安全信息失败：' . $user->email);
                }
                $resetEmails[] = $user->email;
            }

            return [
                'reset_emails' => $resetEmails,
                'not_found_emails' => $notFoundEmails,
            ];
        });
    }

    private function generateUniqueToken(): string
    {
        do {
            $token = Helper::guid();
        } while (User::where('token', $token)->exists());

        return $token;
    }
}
