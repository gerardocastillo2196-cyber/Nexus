# Metodología Jellyfish (Ágil) — Nexus OS v7.0

## Roles
- **Scrum Master (@scrum_master):** Facilita el proceso, elimina impedimentos, actualiza los documentos de seguimiento.
- **Product Owner (Usuario):** Define las prioridades del backlog y acepta o rechaza entregables.
- **Development Team (Agentes):** Ejecutan las tareas del sprint activo.

## Priorización Oficial (Metodología MoSCoW)
Todas las historias de usuario en el backlog se priorizan obligatoriamente bajo el esquema MoSCoW:
- **Must-have:** Requerimientos críticos e indispensables para la versión.
- **Should-have:** Requerimientos de alta importancia pero no bloqueantes inmediatamente.
- **Could-have:** Funcionalidades deseables si hay tiempo/recursos disponibles.
- **Won't-have:** Requerimientos explícitamente descartados o diferidos para futuros lanzamientos.

## Artefactos
| Artefacto | Archivo | Propósito |
|---|---|---|
| Product Backlog | `BACKLOG.md` | Lista priorizada de todas las historias de usuario / requerimientos con estándar MoSCoW. |
| Sprint Board | `SPRINT_BOARD.md` | Tablero Kanban con el estado de las tareas del sprint activo. |
| Daily Log | `DAILY.md` | Bitácora de standups y comunicación entre agentes. |

## Eventos
1. **Refinamiento del Backlog (Backlog Grooming):** Un evento recurrente donde el Product Owner y los agentes revisan, refinan y priorizan las historias de usuario en `BACKLOG.md`, asegurando que cumplan con la Definition of Ready para futuros sprints.
2. **Sprint Planning:** Al inicio de cada sprint, el Scrum Master mueve tareas del Backlog al Sprint Board (columna TODO).
3. **Daily Standup:** Cada sesión de trabajo registra en `DAILY.md`: qué se hizo, qué se hará, qué impedimentos hay.
4. **Sprint Review:** Al final del sprint, se revisan las tareas DONE y se documentan aprendizajes.
5. **Sprint Retrospective:** Se evalúa el proceso y se proponen mejoras.

## Estimación
- Se usa la escala T-shirt (`XS`, `S`, `M`, `L`, `XL`) o puntos de historia.
- Cada historia en `BACKLOG.md` debe incluir su estimación y su prioridad MoSCoW.

## Definition of Ready (DoR)
Una Historia de Usuario se considera **READY** para el sprint cuando:
1. Cuenta con descripción estructurada y criterios de aceptación claros en sintaxis Gherkin.
2. Contiene su correspondiente priorización MoSCoW (Must-have, Should-have, Could-have, Won't-have).
3. Posee una estimación de esfuerzo.
4. El @QA Agent valida el backlog. Si una historia no cumple los criterios, el @QA Agent registrará un mensaje en `DAILY.md` con el ID de la historia, las razones del rechazo y sugerencias para su refinamiento. Solo las historias que cumplan todos los criterios serán marcadas como "aprobadas" por el @QA Agent.

## Definition of Done (DoD)
Una tarea se considera **DONE** cuando:
1. El código ha sido generado y/o ejecutado sin errores.
2. Se han ejecutado y aprobado las pruebas unitarias y de integración relevantes.
3. Se ha realizado una revisión de código por un agente especializado (ej. @code_reviewer, si existe) o se ha validado la adherencia a estándares de calidad.
4. La documentación técnica relevante (si aplica) ha sido actualizada.
5. Se ha movido a la columna DONE del `SPRINT_BOARD.md`.
6. Se ha registrado una entrada en `DAILY.md` documentando la finalización y los resultados clave.

## Protocolo de Comunicación entre Agentes
- Los agentes se comunican principalmente a través de los artefactos Scrum del proyecto, garantizando trazabilidad y una fuente única de verdad.
- El `DAILY.md` es el canal principal de comunicación asíncrona.
- Para escenarios que requieran una coordinación más ágil o la resolución de dependencias críticas, los agentes pueden utilizar el `DAILY.md` para **solicitar atención prioritaria** de otro agente, indicando explícitamente la urgencia y el contexto para facilitar una respuesta rápida.
- Cada entrada debe incluir: `[FECHA] [AGENTE] — Mensaje`.
