<?php

namespace Tests\Feature;

use App\Services\RegistrationCaptchaService;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class RegistrationCaptchaServiceTest extends TestCase
{
    public function test_it_verifies_a_cloudflare_turnstile_token(): void
    {
        config([
            'v2board.recaptcha_enable' => 1,
            'v2board.recaptcha_key' => 'turnstile-secret',
            'v2board.recaptcha_site_key' => 'turnstile-site-key',
            'v2board.cap_enable' => 0,
        ]);
        Http::fake([
            'https://challenges.cloudflare.com/turnstile/v0/siteverify' => Http::response(['success' => true]),
        ]);

        $this->assertTrue((new RegistrationCaptchaService())->verify('turnstile', 'token', '127.0.0.1'));
        Http::assertSent(function ($request) {
            return $request->url() === 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
                && $request['secret'] === 'turnstile-secret'
                && $request['response'] === 'token'
                && $request['remoteip'] === '127.0.0.1';
        });
    }

    public function test_it_verifies_a_cap_token(): void
    {
        config([
            'v2board.recaptcha_enable' => 0,
            'v2board.cap_enable' => 1,
            'v2board.cap_endpoint' => 'https://cap.example.test/',
            'v2board.cap_site_key' => 'cap-site-key',
            'v2board.cap_secret' => 'cap-secret',
        ]);
        Http::fake([
            'https://cap.example.test/cap-site-key/siteverify' => Http::response(['success' => true]),
        ]);

        $this->assertTrue((new RegistrationCaptchaService())->verify('cap', 'token'));
        Http::assertSent(function ($request) {
            return $request->url() === 'https://cap.example.test/cap-site-key/siteverify'
                && $request['secret'] === 'cap-secret'
                && $request['response'] === 'token';
        });
    }

    public function test_it_rejects_a_token_for_a_disabled_provider(): void
    {
        config([
            'v2board.recaptcha_enable' => 0,
            'v2board.cap_enable' => 0,
        ]);
        Http::fake();

        $this->assertFalse((new RegistrationCaptchaService())->verify('turnstile', 'token'));
        Http::assertNothingSent();
    }
}
