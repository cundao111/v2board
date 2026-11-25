<?php

namespace App\Http\Controllers\V1\Guest;

use App\Http\Controllers\Controller;
use App\Utils\Dict;
use Illuminate\Support\Facades\Http;

class CommController extends Controller
{
    public function config()
    {
        return response([
            'data' => [
                'tos_url' => config('v2board.tos_url'),
                'is_email_verify' => (int)config('v2board.email_verify', 0) ? 1 : 0,
                'is_invite_force' => (int)config('v2board.invite_force', 0) ? 1 : 0,
                'email_whitelist_suffix' => (int)config('v2board.email_whitelist_enable', 0)
                    ? $this->getEmailSuffix()
                    : 0,
                // The bundled Umi reCAPTCHA modal is Google-only. Turnstile and CAP are
                // rendered by the theme extension below, so do not invoke that modal.
                'is_recaptcha' => 0,
                'recaptcha_site_key' => config('v2board.recaptcha_site_key'),
                'captcha_providers' => app(\App\Services\RegistrationCaptchaService::class)->enabledProviders(),
                'cap_endpoint' => config('v2board.cap_endpoint'),
                'cap_site_key' => config('v2board.cap_site_key'),
                'cap_widget_url' => config('v2board.cap_widget_url', 'https://cdn.jsdelivr.net/npm/cap-widget@latest'),
                'app_description' => config('v2board.app_description'),
                'app_url' => config('v2board.app_url'),
                'logo' => config('v2board.logo'),
            ]
        ]);
    }

    private function getEmailSuffix()
    {
        $suffix = config('v2board.email_whitelist_suffix', Dict::EMAIL_WHITELIST_SUFFIX_DEFAULT);
        if (!is_array($suffix)) {
            return preg_split('/,/', $suffix);
        }
        return $suffix;
    }
}
