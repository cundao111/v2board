<?php

namespace Tests\Unit\Plugins\BatchResetUserSecret;

use App\Plugins\BatchResetUserSecret\EmailListParser;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

class EmailListParserTest extends TestCase
{
    public function test_it_parses_comma_separated_emails_and_removes_duplicates(): void
    {
        $result = (new EmailListParser())->parse('aaa@gmail.com, bbb@gmail.com,AAA@gmail.com');
        $this->assertSame(['aaa@gmail.com', 'bbb@gmail.com'], $result['emails']);
        $this->assertSame(['AAA@gmail.com'], $result['duplicates']);
    }

    public function test_it_rejects_chinese_comma(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('英文逗号');
        (new EmailListParser())->parse('aaa@gmail.com，bbb@gmail.com');
    }

    public function test_it_rejects_invalid_email_without_partially_parsing(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('bad-email');
        (new EmailListParser())->parse('aaa@gmail.com,bad-email');
    }
}
