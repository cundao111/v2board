<?php

namespace App\Plugins\BatchResetUserSecret;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use InvalidArgumentException;
use Throwable;

class BatchResetUserSecretController extends Controller
{
    public function reset(Request $request, EmailListParser $parser, BatchResetUserSecretService $service)
    {
        $request->validate(['emails' => 'required|string|max:32000']);

        try {
            $parsed = $parser->parse($request->input('emails'));
        } catch (InvalidArgumentException $exception) {
            abort(422, $exception->getMessage());
        }

        try {
            $result = $service->reset($parsed['emails']);
        } catch (Throwable $exception) {
            report($exception);
            return response(['message' => '批量重置失败，所有修改均已回滚。'], 500);
        }

        $result['duplicate_emails'] = $parsed['duplicates'];
        $result['requested_count'] = count($parsed['emails']);
        $result['reset_count'] = count($result['reset_emails']);
        return response(['data' => $result]);
    }
}
