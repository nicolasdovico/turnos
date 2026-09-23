<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'mercadopago' => [
        'access_token' => env('MERCADOPAGO_ACCESS_TOKEN'),
        'webhook_secret' => env('MERCADOPAGO_WEBHOOK_SECRET', 'mp_test_webhook_secret_key_12345'),
    ],

    'stripe' => [
        'secret_key' => env('STRIPE_SECRET_KEY'),
        'webhook_secret' => env('STRIPE_WEBHOOK_SECRET', 'whsec_test_stripe_secret_key_12345'),
    ],

    'fcm' => [
        'server_key' => env('FCM_SERVER_KEY', 'mock_fcm_key_123'),
        'url' => env('FCM_URL', 'https://fcm.googleapis.com/fcm/send'),
    ],

    'evolution_api' => [
        'url' => env('EVOLUTION_API_URL', 'http://evolution_api:8080'),
        'api_key' => env('EVOLUTION_API_KEY', 'evolution_secret_token_saas'),
        'instance' => env('EVOLUTION_API_INSTANCE', 'turnos'),
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID', 'test_google_client_id'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET', 'test_google_client_secret'),
        'redirect' => env('GOOGLE_REDIRECT_URI', 'http://localhost:8080/api/auth/google/callback'),
    ],

    'frontend' => [
        'url' => env('FRONTEND_URL', 'http://localhost:8080'),
        'internal_url' => env('FRONTEND_INTERNAL_URL', 'http://frontend:3000'),
        'revalidate_secret' => env('REVALIDATE_SECRET_TOKEN', 'turnos-secret-revalidate-token'),
    ],

];
