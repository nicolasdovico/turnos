<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Acceder con Google (Simulador Dev) - Turnos SaaS</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Roboto', sans-serif; }
    </style>
</head>
<body class="bg-slate-100 min-h-screen flex items-center justify-center p-4">
    <div class="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        <!-- Top Google Branding Banner -->
        <div class="p-8 pb-4 text-center">
            <div class="inline-flex items-center justify-center mb-4">
                <svg class="w-10 h-10" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
            </div>
            <h1 class="text-xl font-bold text-slate-800">Acceder con Google</h1>
            <p class="text-xs text-slate-500 mt-1">para continuar a <strong class="text-slate-700">Turnos SaaS</strong></p>
            
            <div class="mt-3 inline-block px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-[11px] font-medium text-amber-800">
                🛠️ Modo Simulación de Desarrollo Local
            </div>
        </div>

        <!-- Form for Simulated Google Authentication -->
        <form action="/api/auth/google/dev-callback" method="POST" class="p-8 pt-2 space-y-4">
            <input type="hidden" name="state" value="{{ $state }}">

            <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Nombre Completo en Google</label>
                <input type="text" name="name" required value="{{ $defaultName }}" class="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>

            <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Correo Electrónico de Google</label>
                <input type="email" name="email" required value="{{ $defaultEmail }}" class="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>

            <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Google ID Simulado</label>
                <input type="text" name="google_id" required value="google_dev_user_102030" class="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs bg-slate-50 text-slate-600">
            </div>

            <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">URL de Avatar</label>
                <input type="url" name="avatar" value="https://lh3.googleusercontent.com/a/ACg8ocK7-demo-avatar=s96-c" class="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-600">
            </div>

            <div class="pt-2 flex flex-col gap-2">
                <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl text-sm transition shadow-sm flex items-center justify-center gap-2">
                    <span>Continuar y Autorizar</span>
                    <span>→</span>
                </button>

                <a href="/api/auth/google/callback?error=access_denied&state={{ urlencode($state) }}" class="w-full text-center py-2.5 text-xs text-slate-500 hover:text-slate-800 font-medium">
                    Cancelar (Simular rechazo)
                </a>
            </div>
        </form>

        <!-- Instructions for Real Google Credentials -->
        <div class="p-6 bg-slate-50 border-t border-slate-100 text-xs text-slate-600 space-y-2">
            <div class="font-bold text-slate-800 flex items-center gap-1">
                <span>⚙️</span> ¿Cómo configurar credenciales reales de Google?
            </div>
            <ol class="list-decimal pl-4 space-y-1 text-[11px] text-slate-600 leading-relaxed">
                <li>Ingresa a <a href="https://console.cloud.google.com/apis/credentials" target="_blank" class="text-blue-600 hover:underline">Google Cloud Console</a>.</li>
                <li>Crea un <strong>ID de cliente de OAuth 2.0</strong> (tipo <em>Aplicación Web</em>).</li>
                <li>En <em>URIs de redireccionamiento autorizados</em>, agrega: <code class="bg-slate-200 px-1 py-0.5 rounded text-slate-800">http://localhost:8080/api/auth/google/callback</code></li>
                <li>Agrega tus credenciales en el archivo <code class="bg-slate-200 px-1 py-0.5 rounded text-slate-800">docker-compose.yml</code>:
                    <pre class="bg-slate-800 text-slate-200 p-2 rounded mt-1 font-mono text-[10px] overflow-x-auto">GOOGLE_CLIENT_ID: tu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET: tu-client-secret</pre>
                </li>
                <li>Al configurarlas, este simulador se desactivará y se abrirá el popup real de Google.</li>
            </ol>
        </div>
    </div>
</body>
</html>
