<?php

namespace App\Http\Routes\V1;

use Illuminate\Contracts\Routing\Registrar;

class BatchResetUserSecretRoute
{
    public function map(Registrar $router)
    {
        $router->group([
            'prefix' => 'batch-reset-user-secret',
            'middleware' => ['admin', 'log'],
        ], function ($router) {
            $router->post('/reset', '\\App\\Plugins\\BatchResetUserSecret\\BatchResetUserSecretController@reset');
        });
    }
}
