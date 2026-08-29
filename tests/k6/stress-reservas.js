import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// =========================================================================
// MÉTRICAS DE INTEGRIDAD DE CONCURRENCIA & PERFORMANCE (k6)
// =========================================================================
export const locksAcquired = new Counter('locks_acquired');
export const locksConflicted = new Counter('locks_conflicted');
export const bookingsConfirmed = new Counter('bookings_confirmed');
export const bookingsConflicted = new Counter('bookings_conflicted');
export const serverErrorRate = new Rate('server_error_rate');
export const lockLatency = new Trend('lock_latency', true);
export const confirmLatency = new Trend('confirm_latency', true);

export const options = {
  scenarios: {
    // 100 VUs concurrentes compitiendo en ráfaga por los mismos turnos
    concurrency_race: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '3s', target: 50 },
        { duration: '5s', target: 100 },
        { duration: '3s', target: 50 },
        { duration: '2s', target: 0 },
      ],
      gracefulRampDown: '2s',
    },
  },
  thresholds: {
    // Requisito: Latencia p95 < 200ms
    http_req_duration: ['p(95)<200'],
    // Cero errores de servidor (5xx)
    server_error_rate: ['rate==0'],
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:8080/api';
const TENANT_HOST = __ENV.TENANT_HOST || 'padelpro.localhost';
const CANCHA_ID = 1;
const TEST_FECHA = __ENV.TEST_FECHA || '2026-12-30';

const HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Host': TENANT_HOST,
  'X-Tenant-ID': '11111111-1111-1111-1111-111111111111',
};

export default function () {
  const vuId = __VU;
  const iter = __ITER;

  // Selección de slot compartido de alta contención
  const targetSlots = ['18:00', '19:00', '20:00', '21:00'];
  const slot = targetSlots[vuId % targetSlots.length];

  if (iter % 2 === 0) {
    // =========================================================================
    // 1. BLOQUEO ATÓMICO CONCURRENTE (Redis Redlock Pattern)
    // =========================================================================
    const lockPayload = JSON.stringify({
      cancha_id: CANCHA_ID,
      fecha: TEST_FECHA,
      hora_inicio: slot,
      user_id: `vu_${vuId}_iter_${iter}`,
    });

    const start = Date.now();
    const lockRes = http.post(`${BASE_URL}/turnos/bloquear-temporal`, lockPayload, {
      headers: HEADERS,
    });
    lockLatency.add(Date.now() - start);

    if (lockRes.status === 200) {
      locksAcquired.add(1);
      serverErrorRate.add(0);
      check(lockRes, {
        '[Lock] Bloqueo exitoso (status 200)': (r) => r.status === 200,
        '[Lock] Token de reserva emitido': (r) => JSON.parse(r.body).token_reserva !== undefined,
      });
    } else if (lockRes.status === 409) {
      locksConflicted.add(1);
      serverErrorRate.add(0);
      check(lockRes, {
        '[Lock] Conflicto 409 controlado (Anti Doble Reserva)': (r) => r.status === 409,
      });
    } else {
      serverErrorRate.add(1);
    }
  } else {
    // =========================================================================
    // 2. CONFIRMACIÓN TRANSACCIONAL CONCURRENTE (ACID Lock PostgreSQL)
    // =========================================================================
    const confirmPayload = JSON.stringify({
      cancha_id: CANCHA_ID,
      fecha: TEST_FECHA,
      hora_inicio: slot,
      precio: 8000,
    });

    const start = Date.now();
    const confirmRes = http.post(`${BASE_URL}/turnos/confirmar`, confirmPayload, {
      headers: HEADERS,
    });
    confirmLatency.add(Date.now() - start);

    if (confirmRes.status === 200) {
      bookingsConfirmed.add(1);
      serverErrorRate.add(0);
      check(confirmRes, {
        '[Confirm] Turno confirmado con éxito (status 200)': (r) => r.status === 200,
      });
    } else if (confirmRes.status === 409) {
      bookingsConflicted.add(1);
      serverErrorRate.add(0);
      check(confirmRes, {
        '[Confirm] Conflicto 409 controlado (Slot ya ocupado)': (r) => r.status === 409,
      });
    } else {
      serverErrorRate.add(1);
    }
  }

  sleep(0.5);
}
