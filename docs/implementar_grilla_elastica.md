# Tarea Pendiente: Implementar Grilla Elástica

**Fecha de registro:** 2026-11-07  
**Estado:** Planificado para desarrollo próximo.

---

## 1. Problema a Resolver
Actualmente, las canchas con turnos de 90 minutos se generan en bloques fijos calculados desde la hora de apertura (ej: `15:30-17:00`, `17:00-18:30`, `18:30-20:00`, `20:00-21:30`).
- Si son las 18:45 y nadie reservó el bloque de las 18:30, la grilla oculta las 18:30 (por ser pasado) y obliga a los clientes a esperar hasta las 20:00.
- Si hay jugadores listos para ingresar a las 19:00, la cancha queda vacía e improductiva durante 1 hora y 15 minutos, perdiendo facturación.

---

## 2. Objetivo
Permitir que el sistema ofrezca turnos en horarios intermedios (ej: 19:00 a 20:30) siempre y cuando:
1. No se superponga con ningún turno ya reservado en la base de datos o bloqueado en Redis.
2. Cumpla con el algoritmo **Anti-Baches (Gap Prevention)** para no dejar baches muertos e inutilizables de menos de 60 minutos entre turnos o contra el cierre del club.

---

## 3. Puntos de Implementación Técnicos
1. **Paso granular en `DisponibilidadService`:**
   - Evaluar la generación de slots con granularidad de 30 minutos (`$stepMinutos = 30`).
   - Aplicar la validación anti-baches existente para proteger la rentabilidad de la cancha.
2. **Configuración en el Panel de Administración:**
   - Selector en la edición de cancha: *"Permitir horarios elásticos / dinámicos (paso de 30 min)"*.
3. **Turno Espontáneo en Mostrador:**
   - Botón *"Nuevo Turno Ahora / Personalizado"* en la grilla del panel para que el administrador pueda cargar un turno con horario de inicio a demanda si la cancha está vacía.
