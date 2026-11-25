<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class RegistrationCaptchaService
{
    public function enabledProviders(): array
    {
        $providers = [];
        if ((int)config('v2board.recaptcha_enable', 0)
            && config('v2board.recaptcha_key')
            && config('v2board.recaptcha_site_key')) {
            $providers[] = 'turnstile';
        }
        if ((int)config('v2board.cap_enable', 0)
            && config('v2board.cap_endpoint')
            && config('v2board.cap_site_key')
            && config('v2board.cap_secret')) {
            $providers[] = 'cap';
        }
        return $providers;
    }

    public function verify(string $provider, string $token, ?string $ip = null): bool
    {
        if (!in_array($provider, $this->enabledProviders(), true) || $token === '') {
            return false;
        }

        try {
            if ($provider === 'turnstile') {
                $response = Http::asForm()->timeout(10)->post(
                    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
                    [
                        'secret' => config('v2board.recaptcha_key'),
                        'response' => $token,
                        'remoteip' => $ip,
                    ]
                );
                return $response->successful() && $response->json('success') === true;
            }

            $endpoint = rtrim((string)config('v2board.cap_endpoint'), '/');
            $siteKey = (string)config('v2board.cap_site_key');
            $secret = (string)config('v2board.cap_secret');
            if ($endpoint === '' || $siteKey === '' || $secret === '') {
                return false;
            }
            $response = Http::asJson()->acceptJson()->timeout(10)->post(
                "{$endpoint}/{$siteKey}/siteverify",
                ['secret' => $secret, 'response' => $token]
            );
            return $response->successful() && $response->json('success') === true;
        } catch (\Throwable $exception) {
            return false;
        }
    }
}
