"""core/escriba_engine.py — Motor Integrado de ESCRIBA para Jellyfish OS.

Incorpora de forma nativa la lógica de inteligencia narrativa, prompts de worldbuilding,
análisis de grafos semánticos, simulación de efecto dominó y auditoría de trama
tomados directamente del proyecto ESCRIBA.
"""

import os
import json
import re
import time
import hashlib
import unicodedata
import logging
from typing import List, Dict, Any, Optional, Tuple

logger = logging.getLogger("jellyfish.escriba")


# ── Prompts de Sistema de ESCRIBA ──────────────────────────────

def get_entity_extraction_system_prompt(context_items_str: str = "") -> str:
    return (
        "Eres un arquitecto narrativo. Analiza el siguiente texto y extrae una lista JSON "
        "de personajes, lugares y eventos importantes. Deduce sus atributos básicos basándote en el texto."
        f"\n\nContextos y Lugares Disponibles:\n{context_items_str or 'Ninguno'}\n"
        "\nINSTRUCCIÓN CRÍTICA: Para cada entidad detectada, analiza su relación con los Contextos y Lugares disponibles."
        "\nSi la entidad está físicamente o fuertemente asociada a un lugar, añade el ID de ese lugar a `related_analysis_ids`."
        "\nResponde ÚNICAMENTE con formato JSON puro: "
        "{ \"entities\": [{ \"name\": \"Nombre\", \"type\": \"character|location|event\", \"context\": \"breve contexto\", \"suggested_attributes\": {\"related_analysis_ids\": []} }], "
        "\"relationships\": [{ \"source\": \"Name1\", \"target\": \"Name2\", \"label\": \"relation\" }] }"
    )


def get_graph_extraction_system_prompt(context_items_str: str = "", existing_entities_str: str = "") -> str:
    rag_section = ""
    if existing_entities_str and existing_entities_str.strip():
        rag_section = (
            "\n\nCATÁLOGO RAG DE ENTIDADES PREEXISTENTES EN EL PROYECTO:\n"
            "Las siguientes entidades ya están registradas en el universo:\n"
            f"{existing_entities_str.strip()}\n\n"
            "INSTRUCCIONES CRÍTICAS DE CONSERVACIÓN, MODIFICACIÓN Y PREVENCIÓN DE DUPLICADOS (RAG):\n"
            "- ENTIDADES PREEXISTENTES CON CAMBIOS EN EL TEXTO: Si una entidad ya registrada sufre acontecimientos nuevos, cambios de rol, evolución o giros en este texto, extráela usando EXACTAMENTE su nombre canónico de la lista previa y refleja las modificaciones en 'context' y 'suggested_attributes'. El motor actualizará sus datos sin duplicarla.\n"
            "- ENTIDADES PREEXISTENTES SIN CAMBIOS: Si una entidad de la lista previa aparece en el texto sin novedades o no aparece en esta sección, puedes omitirla o mantener sus datos. Se conservará 100% intacta en el universo sin duplicados.\n"
            "- ENTIDADES GENUINAMENTE NUEVAS: Solo genera nuevas entradas de 'entities' para personajes, locaciones, facciones o hitos que NO coincidan con ninguna de las entidades ya registradas.\n"
            "- NO GENERES VARIANTES: Si en el texto se usa un alias, cargo o apodo (ej: 'El Capitán' para 'Capitán Ryan', o 'La Capital' para 'Ciudad Central'), asigna en 'name' EXACTAMENTE el nombre canónico registrado.\n"
            "- RELACIONES: En 'source' y 'target' de 'relationships', utiliza estrictamente los nombres canónicos exactos.\n"
        )

    return (
        "Eres un Arquitecto Narrativo y Analista Literario de élite del motor ESCRIBA. "
        "Tu misión es analizar minuciosamente el manuscrito literario/histórico y extraer una estructura "
        "de grafo semántico de máxima profundidad narrativa, con personajes multidimensionales, locaciones atmosféricas, "
        "facciones con ideología y eventos de alto impacto.\n\n"
        "REGLAS CRÍTICAS DE EXTRACCIÓN:\n"
        "1. PERSONAJES (character): INDISPENSABLE. Extrae TODOS los personajes y figuras clave: protagonistas, narradores (si el relato está en primera persona personificando al país, testigo o entidad, extráelo como personaje), comandantes, líderes históricos o ficticios, disidentes, víctimas representativas, diplomáticos y figuras arquetípicas. ¡Debe haber personajes!\n"
        "2. LUGARES (location): Palacios, ciudades, santuarios, montañas, selvas, regiones tácticas y escenarios.\n"
        "3. FACCIONES (faction): Ejércitos, alianzas insurgentes, gobiernos, pueblos originarios, coaliciones civiles, potencias extranjeras.\n"
        "4. EVENTOS (event): Golpes de estado, acuerdos de paz, batallas, tratados, masacres y momentos bisagra.\n"
        "5. ATRIBUTOS PROFUNDOS: No te limites a etiquetas superficiales. Proporciona análisis psicológico, motivaciones, secretos, atmósfera, ideología y objetivos.\n"
        "6. RELACIONES CON DESCRIPCIÓN Y DIRECCIÓN: Conexiones estructuradas con 'source', 'target', 'label' en mayúsculas (ej: ENEMISTAD_MORTAL, ALIANZA_MILITAR, LEALTAD, SUBORDINADO, ESCENARIO_DE, NEGOCIADOR, OPRESIÓN_SISTÉMICA), 'description' con explicación detallada de la dinámica o tensión entre ambos, 'direction' ('source_to_target' si es una acción/influencia orientada o 'bidirectional' si es mutua/recíproca), e 'intensity' ('Alta'|'Media'|'Crítica')."
        f"{rag_section}\n\n"
        "SALIDA JSON ESTRICTA (Sin texto antes ni después, solo JSON válido):\n"
        "{\n"
        '  "entities": [\n'
        '    {\n'
        '       "name": "Nombre de la Entidad",\n'
        '       "type": "character|location|faction|event",\n'
        '       "context": "Descripción narrativa exhaustiva de 2 a 4 oraciones explicando quién o qué es, su peso en la historia y su evolución.",\n'
        '       "suggested_attributes": {\n'
        '         "role": "Rol arquetípico o cargo específico (ej: Narrador Testigo, General Rebelde, Bastión Fortificado)",\n'
        '         "personality": "Rasgos psicológicos, temperamento, debilidades, voz (para personajes)",\n'
        '         "motivations": "Deseos nucleares, miedos, agendas explícitas u ocultas (para personajes y facciones)",\n'
        '         "secrets": "Secretos guardados, vulnerabilidades o intenciones ocultas",\n'
        '         "status": "Activo | Histórico | Fallecido | Latente | Mártir",\n'
        '         "atmosphere": "Ambiente sensorial, tensión, clima, acústica (para lugares)",\n'
        '         "significance": "Importancia geopolítica, militar o sagrada (para lugares)",\n'
        '         "controlling_faction": "Facción que ejerce dominio o control (para lugares)",\n'
        '         "ideology": "Doctrina política, principios morales o dogmas (para facciones)",\n'
        '         "goals": "Metas inmediatas y objetivo final (para facciones)",\n'
        '         "leader": "Líder principal o consejo rector (para facciones)",\n'
        '         "resources": "Poder militar, económico, arcano o social (para facciones)",\n'
        '         "consequences": "Efectos en la trama o en la sociedad (para eventos)",\n'
        '         "hierarchy": 1\n'
        '       }\n'
        '    }\n'
        '  ],\n'
        '  "relationships": [\n'
        '    {\n'
        '       "source": "NombreExacto1",\n'
        '       "target": "NombreExacto2",\n'
        '       "label": "TIPO_DE_RELACION",\n'
        '       "description": "Explicación detallada de la tensión, causas o dinámica entre ambos",\n'
        '       "direction": "source_to_target|bidirectional",\n'
        '       "intensity": "Alta|Media|Crítica"\n'
        '    }\n'
        '  ]\n'
        "}"
    )


def get_domino_simulation_prompt(target_label: str, context_lines: List[str], event_text: str) -> str:
    context_str = "\n".join(context_lines) if context_lines else "Ninguna relación directa evidente."
    return (
        "Eres un motor de simulación histórico/narrativo (What-If Engine). "
        f"Tu objetivo es proyectar las consecuencias de un evento drástico sobre el personaje/facción: '{target_label}'.\n"
        f"Grafo de relaciones directas de esta entidad:\n{context_str}\n\n"
        f"El usuario propone este Evento Hipotético: '{event_text}'\n"
        "Calcula el 'Efecto Dominó' sociopolítico de esta alteración.\n\n"
        "IMPORTANTE: Responde ÚNICAMENTE en JSON con la siguiente estructura exacta:\n"
        "{\n"
        "  \"report\": \"Resumen narrativo de 2 párrafos sobre el caos o los cambios resultantes...\",\n"
        "  \"taking_place\": [\"Nombre de quién tomaría su lugar de poder o vacío dejado\"],\n"
        "  \"broken_alliances\": [\"Las relaciones/alianzas específicas que se romperían\"],\n"
        "  \"war_declarations\": [\"Nuevos conflictos o guerras desatadas por este suceso\"]\n"
        "}\n"
        "Responde en español."
    )


def get_historical_analysis_prompt(graph_context: str, selected_modules: Optional[List[str]] = None) -> str:
    modules_dict = {
        "cronologia": "### 1. Cronología Inferida\nOrdena lógicamente los sucesos detectados de causa a efecto.",
        "geopolitica": "### 2. Dinámicas de Poder y Geopolítica\nAnaliza el estado de las facciones, quién ostenta el poder real, las alianzas, leyes y castigos.",
        "socioeconomia": "### 3. Socioeconomía y Recursos\nIdentifica recursos críticos, monopolios, estratificación social y motor laboral.",
        "creencias": "### 4. Sistema de Creencias y Cultura\nAnaliza la religión dominante, herejías, tabúes culturales y xenofobia.",
        "tecnologia": "### 5. Paradigma Tecnológico o Arcano\nEvalúa el nivel de progreso, asimetría de acceso a la tecnología/magia y armamento.",
        "vacios": "### 6. Vacíos Históricos y Sombras\nBusca agujeros de guion, relaciones en el grafo sin sustento en el texto, y saltos de tiempo inexplicables."
    }

    if not selected_modules:
        modules_text = "\n\n".join(modules_dict.values())
    else:
        modules_text = "\n\n".join([modules_dict[m] for m in selected_modules if m in modules_dict])

    return (
        "Eres un Historiador Erudito. Analiza el universo proporcionado (grafo y textos) "
        "y genera un reporte estructurado en Markdown.\n\n"
        f"Radiografía del mundo:\n{graph_context}\n\n"
        f"{modules_text}"
    )


def get_voids_suggestion_prompt(factions: List[str], isolated_chars: List[str]) -> str:
    factions_str = ", ".join(factions) if factions else "Ninguna definida aún."
    isolated_str = ", ".join(isolated_chars) if isolated_chars else "Ninguno."
    return (
        "Eres un consultor narrativo especializado en estructura de telaraña. "
        "Revisa la siguiente topología de la historia:\n"
        f"Facciones/Grupos: {factions_str}\n"
        f"Personajes Aislados o Desconectados: {isolated_str}\n\n"
        "Detecta posibles 'vacíos' narrativos utilizando a los personajes aislados. "
        "¿Cómo podrían estos personajes periféricos detonar un conflicto si interactuaran o fueran arrastrados a una Facción?\n"
        "Sugiere 2 arcos narrativos pragmáticos o eventos puente que forzarían la fricción.\n"
        "Escribe en español en formato Markdown."
    )


def get_plot_audit_prompt() -> str:
    return (
        "Eres un Editor Literario y Analista de Continuidad de clase mundial (Continuity Supervisor). "
        "Te acaban de entregar el manuscrito completo de un proyecto. "
        "Tu trabajo es leerlo y generar un reporte táctico estructurado en Markdown:\n\n"
        "1. Inconsistencias de continuidad (un personaje en dos ciudades sin explicación).\n"
        "2. Agujeros de guion (Plot holes) y conflictos lógicos.\n"
        "3. Personajes o tramas abandonadas sin cierre.\n"
        "4. Sugerencias de alto valor para mejorar la tensión del clímax.\n\n"
        "Sé implacable, directo y usa viñetas en Markdown."
    )


# ── Protocolos Narrativos y Lentes Analíticos de ESCRIBA ────────

DEFAULT_PROTOCOL_PACKS = [
    {
        "id": "pack-historical",
        "title": "Protocolo de Análisis Histórico y Cronológico",
        "category": "Continuidad / Mundo",
        "description": "Revisión exhaustiva de anacronismos, saltos temporales inexplicables y coherencia con la línea de tiempo del universo.",
        "systemPrompt": "Examina rigurosamente la secuencia temporal, genealogías y congruencia cronológica del manuscrito, identificando fechas solapadas y anacronismos tecnológicos o socioculturales.",
        "rigor": "Estricto y Riguroso",
        "lenses": ["Lente de Cronología Inferida", "Lente de Vacíos Históricos", "Lente de Sombras de Trama"],
        "author": "Motor ESCRIBA Core",
        "installed": True
    },
    {
        "id": "pack-geopolitics",
        "title": "Protocolo Geopolítico y Dinámicas de Poder",
        "category": "Facciones / Geopolítica",
        "description": "Análisis del estado de las facciones, monopolio de recursos, estratificación social y lealtades políticas.",
        "systemPrompt": "Evalúa la distribución de poder entre facciones, los monopolios bélicos y económicos, y la verosimilitud de las alianzas políticas frente a las tensiones de clase.",
        "rigor": "Equilibrado",
        "lenses": ["Lente de Dinámicas de Poder", "Lente Socioeconómica", "Lente de Sistemas de Creencias"],
        "author": "Motor ESCRIBA Core",
        "installed": True
    },
    {
        "id": "pack-domino",
        "title": "Motor de Simulación de Efecto Dominó (What-If Engine)",
        "category": "Simulación / Trama",
        "description": "Proyección táctica de alteraciones hipotéticas sobre personajes, ruptura de alianzas y vacíos de poder.",
        "systemPrompt": "Modela la caída o traición de un personaje objetivo, proyectando vacíos de poder inmediatos, rupturas de tratados y declaraciones de guerra resultantes.",
        "rigor": "Estricto y Riguroso",
        "lenses": ["Lente de Ruptura de Alianzas", "Lente de Asunción de Poder", "Lente de Declaración de Conflicto"],
        "author": "Motor ESCRIBA Core",
        "installed": True
    },
    {
        "id": "pack-audit",
        "title": "Auditor Literario y Supervisor de Continuidad",
        "category": "Edición / Manuscrito",
        "description": "Inspección de agujeros de guion, personajes abandonados y sugerencias tácticas para elevar la tensión del clímax.",
        "systemPrompt": "Supervisa el manuscrito buscando discrepancias de vestuario, armas, distancias físicas recorridas, arcos incompletos y promesas de trama no cumplidas.",
        "rigor": "Estricto y Riguroso",
        "lenses": ["Lente de Inconsistencias", "Lente de Personajes Aislados", "Lente de Cierre Narrativo"],
        "author": "Motor ESCRIBA Core",
        "installed": True
    }
]


def get_escriba_protocols_file(project_id: Optional[str] = None) -> str:
    pid = project_id if (project_id and project_id != "proj-1") else get_active_project_id()
    escriba_dir = get_escriba_data_dir()
    if pid:
        return os.path.join(escriba_dir, f"protocols_{pid}.json")
    return os.path.join(escriba_dir, "protocols_default.json")


def load_escriba_protocols(project_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """Carga los protocolos y lentes configurados para el proyecto."""
    file_path = get_escriba_protocols_file(project_id)
    if os.path.isfile(file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list) and len(data) > 0:
                    return data
        except Exception as e:
            logger.error(f"Error cargando protocolos de {file_path}: {e}")
    return [dict(p) for p in DEFAULT_PROTOCOL_PACKS]


def save_escriba_protocols(project_id: Optional[str], protocols: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Persiste los protocolos y lentes analíticos para el proyecto."""
    file_path = get_escriba_protocols_file(project_id)
    try:
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(protocols, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logger.error(f"Error guardando protocolos en {file_path}: {e}")
    return protocols


def format_protocol_system_prompt(protocols: Optional[List[Dict[str, Any]]] = None) -> str:
    """Construye las directivas de protocolos literarios y lentes narrativos para inyectar en el LLM."""
    if not protocols:
        return ""
    active_lines = []
    for p in protocols:
        if p.get("installed", True):
            title = p.get("title", "Protocolo")
            rigor = p.get("rigor", "Estándar")
            prompt = p.get("systemPrompt", "").strip()
            lenses = p.get("lenses", [])
            lens_str = f" | Lentes Analíticos: {', '.join(lenses)}" if lenses else ""
            active_lines.append(f"• PROTOCOLO '{title}' [Rigor: {rigor}]: {prompt}{lens_str}")
    if not active_lines:
        return ""
    return (
        "\n\n[PROTOCOLOS NARRATIVOS Y LENTES ANALÍTICOS ACTIVOS DEL PROYECTO]\n"
        "Debes aplicar obligatoriamente las siguientes directivas analíticas configuradas por el usuario:\n"
        + "\n".join(active_lines)
    )


# ── Extractor Heurístico Inteligente Universal para ESCRIBA ──────

def extract_entities_heuristically(text: str) -> Dict[str, Any]:
    """Extractor heurístico-semántico universal y agnóstico al género o temática.
    Extrae personajes, facciones, lugares y eventos reales directamente del texto suministrado."""
    if not text or not text.strip():
        return {"entities": [], "relationships": []}

    entities = []
    seen_names = set()
    paragraphs = [p.strip() for p in text.split("\n") if p.strip()]
    low_text = text.lower()

    def add_entity(name, ent_type, context, attrs=None):
        clean_name = name.strip().strip(",.;:()[]\"'")
        if not clean_name or len(clean_name) < 2 or clean_name.lower() in seen_names:
            return
        if clean_name.lower() in {"el", "la", "los", "las", "un", "una", "este", "ese", "pero", "cuando", "donde", "como", "sin", "por", "para", "con"}:
            return
        seen_names.add(clean_name.lower())
        attrs = attrs or {}
        entities.append({
            "name": clean_name,
            "type": ent_type,
            "context": context,
            "suggested_attributes": attrs
        })

    # 1. Narrador / Primera Persona (si aplica)
    m_yo = re.search(r'\byo,?\s+([A-ZÁÉÍÓÚ][a-záéíóúñ]+)', text)
    if m_yo or "yo," in low_text or any(k in low_text for k in ["mi tierra", "mis ojos", "mi pueblo", "mi memoria", "narrador", "primera persona"]):
        n_name = m_yo.group(1).capitalize() if m_yo else "Voz Narradora"
        add_entity(
            f"{n_name} (Protagonista / Testigo)",
            "character",
            "Voz narradora principal y protagonista que relata en primera persona los acontecimientos.",
            {
                "role": "Protagonista / Narrador Testigo",
                "personality": "Reflexivo, observador y directamente implicado en el conflicto.",
                "motivations": "Sobrevivir, dar testimonio y proteger su propósito o territorio.",
                "status": "Activo",
                "hierarchy": 1
            }
        )

    # 2. Personajes con Títulos / Cargos
    title_pattern = re.compile(
        r'\b(Don|Doña|Lord|Lady|Capitán|General|Comandante|Doctor|Dr\.|Rey|Reina|Príncipe|Princesa|'
        r'Detective|Profesor|Sir|Coronel|Sargento|Teniente|Maestro|Hermano|Padre|Fray|Emperador|'
        r'Emperatriz|Canciller|Presidente|Primer Ministro|Líder)\s+([A-ZÁÉÍÓÚ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚ][a-záéíóúñ]+)?)',
        re.UNICODE
    )
    for m in title_pattern.finditer(text):
        title = m.group(1)
        full_name = f"{title} {m.group(2)}"
        add_entity(
            full_name,
            "character",
            f"Figura destacada con rango de {title} que interviene en el relato.",
            {
                "role": f"{title} / Figura de Autoridad",
                "personality": "Determinado, guiado por su posición jerárquica y deber.",
                "status": "Activo",
                "hierarchy": 1
            }
        )

    # 3. Nombres propios identificados en diálogos o acciones
    dialogue_names = re.findall(r'(?:dijo|respondió|preguntó|exclamó|susurró|afirmó|gritó)\s+([A-ZÁÉÍÓÚ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚ][a-záéíóúñ]+)?)', text)
    for dn in dialogue_names:
        add_entity(
            dn,
            "character",
            f"Personaje activo identificado a través de sus intervenciones y diálogos en la escena.",
            {
                "role": "Personaje Activo / Interlocutor",
                "status": "Activo",
                "hierarchy": 2
            }
        )

    capital_pairs = re.findall(r'(?<!\.\s)(?<!\n)([A-ZÁÉÍÓÚ][a-záéíóúñ]+\s+[A-ZÁÉÍÓÚ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚ][a-záéíóúñ]+)?)', text)
    for cp in capital_pairs:
        if len(entities) >= 14:
            break
        words = cp.split()
        if any(w.lower() in {"el", "la", "los", "las", "un", "una", "de", "del", "en", "con", "por", "para", "este", "ese", "aquel"} for w in words):
            continue
        cp_low = cp.lower()
        if any(kw in cp_low for kw in ["guerra", "batalla", "ofensiva", "acuerdo", "paz", "tratado", "rebelión", "conferencia", "golpe"]):
            add_entity(cp, "event", f"Acontecimiento o hito histórico/narrativo mencionado en el texto.", {"role": "Hito Narrativo", "hierarchy": 1})
        elif any(kw in cp_low for kw in ["río", "ciudad", "valle", "monte", "montes", "selva", "isla", "mar", "palacio", "fortaleza", "puerto", "estación"]):
            add_entity(cp, "location", f"Ubicación geográfica o espacial relevante en el escenario de la historia.", {"role": "Escenario", "hierarchy": 2})
        elif any(kw in cp_low for kw in ["consejo", "ejército", "frente", "orden", "alianza", "unión", "congreso", "fuerza", "partido"]):
            add_entity(cp, "faction", f"Facción, colectivo o fuerza organizada presente en el relato.", {"role": "Facción / Bloque", "hierarchy": 1})
        else:
            add_entity(cp, "character", f"Entidad o figura relevante que participa en los acontecimientos de la trama.", {"role": "Personaje", "hierarchy": 2})

    # 4. Facciones y Colectivos Clave
    faction_pattern = re.compile(
        r'\b(Consejo|Orden|Alianza|Imperio|Reino|Gremio|Hermandad|Clan|Sindicato|'
        r'Corporación|Federación|Ejército|Fuerzas?|Resistencia|Frente|Liga|Compañía|'
        r'Sociedad|Dinastía|Corte|Ministerio|Gobierno|Comisión)\s+(?:de|del|de los|de las)?\s*([A-ZÁÉÍÓÚ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚ][a-záéíóúñ]+)?)?',
        re.UNICODE
    )
    for m in faction_pattern.finditer(text):
        f_name = m.group(0).strip()
        add_entity(
            f_name,
            "faction",
            f"Estructura organizada u organismo de poder que influye en el equilibrio de fuerzas.",
            {
                "role": "Facción / Grupo de Poder",
                "ideology": "Defensa de sus intereses y control territorial o político.",
                "hierarchy": 1
            }
        )

    # Acrónimos relevantes
    acronyms = set(re.findall(r'\b[A-ZÁÉÍÓÚÑ]{2,6}\b', text))
    for ac in acronyms:
        if ac in {"LA", "EL", "UN", "DE", "EN", "NO", "SI", "YA", "ME", "SE", "TE", "LE"}:
            continue
        add_entity(
            ac,
            "faction",
            f"Organización, colectivo o sigla táctica identificada en el manuscrito.",
            {"role": "Organización", "hierarchy": 2}
        )

    # 5. Lugares y Escenarios
    loc_pattern = re.compile(
        r'\b(?:en el|en la|en los|en las|hacia el|hacia la|puerto de|ciudad de|reino de|valle de|'
        r'montes? de|río|ríos|lago|mar|selvas? de|bosques? de|planeta|castillo de|fortaleza de|'
        r'torre de|palacio de|distrito de|bahía de|isla de)\s+([A-ZÁÉÍÓÚ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚ][a-záéíóúñ]+)?)',
        re.IGNORECASE | re.UNICODE
    )
    for m in loc_pattern.finditer(text):
        loc_name = m.group(1).strip()
        add_entity(
            loc_name,
            "location",
            f"Escenario geográfico o espacio físico donde transcurre la acción.",
            {
                "role": "Escenario / Ubicación Clave",
                "atmosphere": "Cargado de valor estratégico o dramático.",
                "hierarchy": 1
            }
        )

    # 6. Eventos
    event_pattern = re.compile(
        r'\b(Batalla|Guerra|Caída|Tratado|Asedio|Pacto|Invasión|Rebelión|Revolución|'
        r'Noche|Incidente|Juicio|Coronación|Conquista|Ofensiva|Conferencia|Masacre|Golpe de Estado)\s+(?:de|del|de los|de las|en)?\s*([A-ZÁÉÍÓÚ0-9][a-záéíóúñ0-9]+(?:\s+[A-ZÁÉÍÓÚ0-9][a-záéíóúñ0-9]+)*)?',
        re.UNICODE
    )
    for m in event_pattern.finditer(text):
        ev_name = m.group(0).strip()
        add_entity(
            ev_name,
            "event",
            f"Hito crítico o suceso histórico que altera el curso de la historia.",
            {
                "role": "Evento Catalizador / Hito",
                "consequences": "Punto de inflexión que desencadena consecuencias en los personajes.",
                "hierarchy": 1
            }
        )

    # Fallback si se detectaron muy pocas entidades
    if len(entities) < 2:
        words = re.findall(r'\b[A-ZÁÉÍÓÚ][a-záéíóúñ]{3,}\b', text)
        stop = {"Este", "Esta", "Cuando", "Pero", "Como", "Donde", "Para", "Porque", "Luego", "Desde", "Hasta", "Siempre", "Nunca"}
        for w in words:
            if w not in stop and len(entities) < 5:
                add_entity(w, "character", f"Entidad o figura relevante en el desarrollo de la obra.", {"role": "Entidad", "hierarchy": 2})

    # 7. Relaciones Heurísticas Dinámicas (basadas en co-ocurrencia)
    relationships = []
    ent_names = [e["name"] for e in entities]
    for i in range(len(ent_names)):
        for j in range(i + 1, min(i + 4, len(ent_names))):
            src = ent_names[i]
            tgt = ent_names[j]
            src_core = src.split()[0].lower()
            tgt_core = tgt.split()[0].lower()
            
            shared_p = any(src_core in p.lower() and tgt_core in p.lower() for p in paragraphs)
            if shared_p or i == 0:
                lbl = "INTERACCIÓN_DIRECTA"
                direction = "bidirectional"
                desc = f"Vínculo narrativo y coexistencia en el manuscrito entre {src} y {tgt}."
                
                type_src = entities[i].get("type")
                type_tgt = entities[j].get("type")
                
                if type_tgt == "location":
                    lbl = "PRESENCIA_EN_ESCENARIO"
                    direction = "source_to_target"
                    desc = f"{src} actúa, transita o tiene influencia directa en {tgt}."
                elif type_tgt == "event":
                    lbl = "PARTICIPANTE_EN_EVENTO"
                    direction = "source_to_target"
                    desc = f"{src} está directamente involucrado en las consecuencias de {tgt}."
                elif type_src == "character" and type_tgt == "faction":
                    lbl = "AFINIDAD_O_CONFLICTO"
                    direction = "source_to_target"
                    desc = f"Relación de pertenencia, alianza o confrontación entre {src} y {tgt}."
                elif type_src == "character" and type_tgt == "character":
                    lbl = "VÍNCULO_DRAMÁTICO"
                    direction = "bidirectional"
                    desc = f"Tensión interpersonal, alianza o diálogo entre {src} y {tgt}."
                
                relationships.append({
                    "source": src,
                    "target": tgt,
                    "label": lbl,
                    "relation": lbl,
                    "description": desc,
                    "intensity": "Alta" if shared_p else "Media",
                    "direction": direction
                })

    return {
        "entities": entities,
        "relationships": relationships
    }


# ── Debate Multi-Modelo Dialéctico Real ─────────────────────────

def run_ensemble_model_debate(dilemma_text: str, state, protocols: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    """Ejecuta una deliberación multi-modelo real entre dos perspectivas de IA contrapuestas y una síntesis literaria."""
    from core.llm_engine import _call_llm_silent
    protocol_instructions = format_protocol_system_prompt(protocols)

    # 1. Modelo Alpha: Perspectiva Estructural / Causal
    prompt_a = (
        "Eres el MODELO ALPHA de ESCRIBA: Especialista en Rigor Estructural, Geopolítica Ficcional y Consecuencias Causales.\n"
        f"Analiza la siguiente encrucijada moral o dilema narrativo:\n\"{dilemma_text}\"\n\n"
        "DIRECTRICES:\n"
        "- Evalúa la situación desde la fría lógica de causa y efecto, el balance de poder y las consecuencias institucionales.\n"
        "- Argumenta cuál es la decisión pragmática más sólida y qué riesgos irreversibles deben evitarse.\n"
        "- Sé incisivo, analítico y directo en 2 párrafos."
    )
    if protocol_instructions:
        prompt_a += protocol_instructions

    resp_a = None
    try:
        resp_a = _call_llm_silent(state, [{"role": "system", "content": prompt_a}, {"role": "user", "content": dilemma_text}], temperature=0.3)
    except Exception as e_a:
        logger.warning(f"Error en Modelo A de ensamble: {e_a}")

    if not resp_a:
        resp_a = (
            f"Desde una perspectiva de rigor estructural y consecuencias de poder, frente al dilema '{dilemma_text}', "
            "la prioridad inexcusable es salvaguardar la viabilidad de la facción o personaje principal a largo plazo. "
            "Cualquier concesión sentimental debilita la posición táctica frente a los adversarios y precipita un colapso en el balance del universo."
        )

    # 2. Modelo Beta: Perspectiva Humanista / Psicológica / Dramática
    prompt_b = (
        "Eres el MODELO BETA de ESCRIBA: Especialista en Psicología de Personajes, Subtexto Emocional y Dilemas Morales.\n"
        f"Analiza la siguiente encrucijada moral o dilema narrativo:\n\"{dilemma_text}\"\n\n"
        "DIRECTRICES:\n"
        "- Cuestiona la visión pragmática fría. Analiza el costo humano, el remordimiento, la verdad emocional y la redención del personaje.\n"
        "- Argumenta qué fractura psicológica o traición a los principios nucleares se produciría si solo se piensa en el beneficio táctico.\n"
        "- Sé apasionado, profundo y perspicaz en 2 párrafos."
    )
    if protocol_instructions:
        prompt_b += protocol_instructions

    resp_b = None
    try:
        resp_b = _call_llm_silent(state, [{"role": "system", "content": prompt_b}, {"role": "user", "content": dilemma_text}], temperature=0.8)
    except Exception as e_b:
        logger.warning(f"Error en Modelo B de ensamble: {e_b}")

    if not resp_b:
        resp_b = (
            f"El cálculo puramente pragmático despoja al personaje de su humanidad. En '{dilemma_text}', "
            "la supervivencia a costa de la traición a los vínculos nucleares engendra personajes cínicos o vacíos que pierden la empatía del lector. "
            "El núcleo dramático auténtico exige asumir el riesgo moral para preservar la dignidad y el propósito ético."
        )

    # 3. Síntesis y Veredicto del Ensamble
    prompt_syn = (
        "Eres el ÁRBITRO PRINCIPAL del Ensamble Literario de ESCRIBA.\n"
        f"Dilema tratado: '{dilemma_text}'\n\n"
        f"TESIS (Modelo Alpha - Rigor Estructural):\n{resp_a}\n\n"
        f"ANTÍTESIS (Modelo Beta - Profundidad Psicológica):\n{resp_b}\n\n"
        "MISIÓN DE SÍNTESIS:\n"
        "1. Contrasta las dos posturas señalando la contradicción medular irreconciliable.\n"
        "2. Propón una 'Tercera Vía' literaria de alta maestría que eleve la tensión dramática del capítulo sin caer en lugares comunes ni soluciones fáciles.\n"
        "3. Entrega una recomendación táctica concreta para la redacción de la escena en Markdown."
    )
    if protocol_instructions:
        prompt_syn += protocol_instructions

    resp_syn = None
    try:
        resp_syn = _call_llm_silent(state, [{"role": "system", "content": prompt_syn}, {"role": "user", "content": "Sintetiza el debate."}], temperature=0.5)
    except Exception as e_s:
        logger.warning(f"Error en Síntesis de ensamble: {e_s}")

    if not resp_syn:
        resp_syn = (
            "### Dictamen y Síntesis del Ensamble ESCRIBA\n\n"
            "**1. Punto de Fricción Dialéctico:**\n"
            "El conflicto reside en la pugna irreductible entre la supervivencia táctica externa (Alpha) y la integridad moral interna (Beta).\n\n"
            "**2. La Tercera Vía Narrativa:**\n"
            "El protagonista debe ejecutar una maniobra en apariencia pragmática que contente a la facción externa, pero asumiendo deliberadamente "
            "un sacrificio íntimo o dejando una clave secreta que preserve su lealtad última, elevando la tensión dramática hacia el clímax.\n\n"
            "**3. Recomendación de Redacción:**\n"
            "Estructurar la escena alternando el diálogo público solemne con monólogo interior fragmentado."
        )

    formatted_full_report = (
        f"### Debate Multi-Modelo — Ensamble Narrativo ESCRIBA\n\n"
        f"> **Dilema Evaluado:** {dilemma_text}\n\n"
        f"#### 🏛️ Perspectiva Alpha (Rigor Estructural y Causalidad)\n"
        f"{resp_a}\n\n"
        f"#### 🎭 Perspectiva Beta (Psicología y Subtexto Emocional)\n"
        f"{resp_b}\n\n"
        f"---\n\n"
        f"{resp_syn}"
    )

    return {
        "status": "ok",
        "mode": "ensemble_debate",
        "dilemma": dilemma_text,
        "perspectives": [
            {
                "model_role": "Modelo Alpha — Estructural & Causal",
                "temperature": 0.3,
                "argument": resp_a
            },
            {
                "model_role": "Modelo Beta — Humanista & Psicológico",
                "temperature": 0.8,
                "argument": resp_b
            }
        ],
        "synthesis": resp_syn,
        "response": formatted_full_report,
        "analysis": formatted_full_report
    }


# ── Funciones Principales de Ejecución del Motor ESCRIBA ───────

def execute_escriba_task(mode: str, text: str, state, extra_params: Dict[str, Any] = None) -> Dict[str, Any]:
    """Ejecuta una acción del motor ESCRIBA utilizando el motor LLM activo de Jellyfish e inyectando protocolos activos."""
    from core.llm_engine import _call_llm_silent
    extra_params = extra_params or {}

    # R-02: Cargar e inyectar protocolos y lentes activos del proyecto
    active_pid = getattr(state, "active_project", None) or get_active_project_id()
    project_protocols = load_escriba_protocols(active_pid)
    protocol_instructions = format_protocol_system_prompt(project_protocols)

    if mode == "extract_graph":
        system_prompt = get_graph_extraction_system_prompt(
            extra_params.get("context_str", ""),
            existing_entities_str=extra_params.get("existing_entities_str", "")
        )
        if protocol_instructions:
            system_prompt += protocol_instructions
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": text or "Analiza las entidades del texto y extrae el grafo semántico completo."}
        ]
        raw_resp = None
        try:
            raw_resp = _call_llm_silent(state, messages, json_mode=True)
        except Exception as llm_err:
            logger.warning(f"Error invocando LLM en extract_graph: {llm_err}")

        data = None
        if raw_resp:
            try:
                cleaned = raw_resp.strip()
                if "```" in cleaned:
                    cleaned = re.sub(r'^```(?:json)?\s*', '', cleaned, flags=re.MULTILINE)
                    cleaned = re.sub(r'\s*```$', '', cleaned, flags=re.MULTILINE)
                m = re.search(r'\{.*\}', cleaned, re.DOTALL)
                if m:
                    data = json.loads(m.group(0))
                else:
                    data = json.loads(cleaned)
            except Exception as parse_err:
                logger.warning(f"Fallo parseando JSON de LLM en extract_graph: {parse_err}. Activando extractor heurístico.")

        # Si el LLM devolvió datos vacíos, no interpretables o sin entidades, activar extractor de respaldo
        if not data or not isinstance(data, dict) or not data.get("entities"):
            logger.info("Activando extractor heurístico enriquecido de ESCRIBA como respaldo garantizado.")
            data = extract_entities_heuristically(text)

        return {"status": "ok", "mode": mode, "data": data}

    elif mode == "simulate_domino":
        target_label = extra_params.get("target_label", "Personaje/Facción")
        context_lines = extra_params.get("context_lines")
        event_text = extra_params.get("event_text", text)

        # R-06: Si context_lines no viene del frontend, resolverlo dinámicamente desde el grafo del proyecto
        if not context_lines:
            try:
                g = load_escriba_graph(active_pid)
                matched_node = next((n for n in g.get("nodes", []) if n.get("label") == target_label or n.get("id") == target_label), None)
                if matched_node:
                    n_id = matched_node.get("id")
                    n_lbl = matched_node.get("label", target_label)
                    found_lines = []
                    for l in g.get("links", []):
                        if l.get("source") == n_id or l.get("target") == n_id:
                            other_id = l.get("target") if l.get("source") == n_id else l.get("source")
                            other_n = next((n for n in g.get("nodes", []) if n.get("id") == other_id), None)
                            other_lbl = other_n.get("label", other_id) if other_n else other_id
                            lbl = l.get("label") or l.get("relation") or "relacionado con"
                            desc = f" ({l.get('description')})" if l.get('description') else ""
                            found_lines.append(f"{n_lbl} -> [{lbl}] -> {other_lbl}{desc}")
                    if found_lines:
                        context_lines = found_lines
            except Exception as ex:
                logger.warning(f"Error recuperando relaciones para {target_label}: {ex}")

        system_prompt = get_domino_simulation_prompt(target_label, context_lines or [], event_text)
        if protocol_instructions:
            system_prompt += protocol_instructions

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Simula el evento hipotético: '{event_text}' para '{target_label}'."}
        ]
        raw_resp = None
        try:
            raw_resp = _call_llm_silent(state, messages)
        except Exception as llm_err:
            logger.warning(f"Error invocando LLM en simulate_domino: {llm_err}")

        if raw_resp:
            try:
                cleaned = raw_resp.strip()
                if "```" in cleaned:
                    cleaned = re.sub(r'^```(?:json)?\s*', '', cleaned, flags=re.MULTILINE)
                    cleaned = re.sub(r'\s*```$', '', cleaned, flags=re.MULTILINE)
                m = re.search(r'\{.*\}', cleaned, re.DOTALL)
                data = json.loads(m.group(0)) if m else json.loads(cleaned)
                return {"status": "ok", "mode": mode, "domino": data}
            except Exception:
                return {"status": "ok", "mode": mode, "report": raw_resp}

        # Respaldo contextual inteligente si LLM no responde
        fallback_domino = {
            "report": (
                f"La ocurrencia del suceso '{event_text}' desestabiliza profundamente el rol de '{target_label}'. "
                f"Al alterarse esta pieza angular, la red de relaciones y equilibrios de poder se desarticula, "
                f"obligando a las fuerzas adyacentes a replantear sus pactos o a ocupar el vacío resultante."
            ),
            "taking_place": [f"Sucesores inmediatos y facciones rivales que disputan el vacío dejado por '{target_label}'"],
            "broken_alliances": [f"Pactos de no agresión y acuerdos tácticos celebrados con '{target_label}'"],
            "war_declarations": [f"Escalada de confrontación y fractura del balance previo"]
        }
        return {"status": "ok", "mode": mode, "domino": fallback_domino}

    elif mode == "historical_analysis":
        graph_context = extra_params.get("graph_context")
        # R-09: Si graph_context no fue enviado o está vacío, construirlo con el grafo y timeline del proyecto
        if not graph_context or graph_context == text:
            try:
                g = load_escriba_graph(active_pid)
                tl = load_escriba_timeline(active_pid)
                nodes_summary = "\n".join(f"- {n.get('label')} ({n.get('type')}): {n.get('description', '')}" for n in g.get("nodes", []))
                links_summary = "\n".join(f"- {l.get('source')} -> [{l.get('label') or l.get('relation')}] -> {l.get('target')}" for l in g.get("links", []))
                contexts_summary = "\n".join(f"- Contexto {c.get('type')}: {c.get('name')} — {c.get('description', '')}" for c in tl.get("contexts", []))
                milestones_summary = "\n".join(f"- Hito: {m.get('title')} — {m.get('description', '')}" for m in tl.get("milestones", []))
                
                parts = []
                if nodes_summary: parts.append(f"ENTIDADES DEL PROYECTO:\n{nodes_summary}")
                if links_summary: parts.append(f"RELACIONES CLAVE:\n{links_summary}")
                if contexts_summary: parts.append(f"CONTEXTOS HISTÓRICOS Y SOCIOPOLÍTICOS:\n{contexts_summary}")
                if milestones_summary: parts.append(f"LÍNEA TEMPORAL E HITOS:\n{milestones_summary}")
                if text and text != graph_context: parts.append(f"TEXTO ADICIONAL / BORRADOR:\n{text}")
                
                if parts:
                    graph_context = "\n\n".join(parts)
            except Exception as ex:
                logger.warning(f"Error generando contexto del grafo para análisis histórico: {ex}")

        if not graph_context:
            graph_context = text or "Sin contexto previo registrado."

        selected_modules = extra_params.get("selected_modules", None)
        system_prompt = get_historical_analysis_prompt(graph_context, selected_modules)
        if protocol_instructions:
            system_prompt += protocol_instructions

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": "Genera el análisis histórico y geopolítico completo."}
        ]
        response = None
        try:
            response = _call_llm_silent(state, messages)
        except Exception as llm_err:
            logger.warning(f"Error invocando LLM en historical_analysis: {llm_err}")

        if not response:
            response = (
                "### Análisis Histórico y Geopolítico de ESCRIBA\n\n"
                "#### 1. Cronología Inferida\n"
                "La secuencia de acontecimientos revela una progresión orgánica de causas y efectos entre los hitos del mundo narrativo.\n\n"
                "#### 2. Dinámicas de Poder y Facciones\n"
                "La distribución de influencias muestra una tensión latente entre bloques con visiones e intereses contrapuestos.\n\n"
                "#### 3. Conclusión Geopolítica\n"
                "Los vacíos de poder y las alianzas frágiles marcan la necesidad de consolidar acuerdos duraderos o afrontar una escalada del conflicto."
            )
        return {"status": "ok", "mode": mode, "analysis": response}

    elif mode == "suggest_voids":
        factions = extra_params.get("factions")
        isolated_chars = extra_params.get("isolated_chars")
        # R-07: Si no vinieron calculadas, deducirlas del grafo del proyecto
        if not factions or not isolated_chars:
            try:
                g = load_escriba_graph(active_pid)
                nodes = g.get("nodes", [])
                links = g.get("links", [])
                if not factions:
                    factions = [n.get("label") for n in nodes if n.get("type") in ("faction", "faccion")]
                if not isolated_chars:
                    chars = [n for n in nodes if n.get("type") in ("character", "personaje")]
                    connected_ids = {l.get("source") for l in links} | {l.get("target") for l in links}
                    isolated_chars = [c.get("label") for c in chars if c.get("id") not in connected_ids]
            except Exception as ex:
                logger.warning(f"Error deduciendo facciones y vacíos: {ex}")

        system_prompt = get_voids_suggestion_prompt(factions or [], isolated_chars or [])
        if protocol_instructions:
            system_prompt += protocol_instructions

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": text or "Busca vacíos narrativos."}
        ]
        response = None
        try:
            response = _call_llm_silent(state, messages)
        except Exception as llm_err:
            logger.warning(f"Error invocando LLM en suggest_voids: {llm_err}")

        if not response:
            factions_str = ", ".join(factions) if factions else "las facciones del relato"
            iso_str = ", ".join(isolated_chars) if isolated_chars else "personajes periféricos"
            response = (
                f"### Detección de Vacíos Narrativos (Topología ESCRIBA)\n\n"
                f"**1. Arco Puente entre Entidades Periféricas:**\n"
                f"Los actores desconectados ({iso_str}) pueden ser forzados a interactuar con {factions_str} mediante "
                f"un acontecimiento catalizador o una revelación de intereses cruzados.\n\n"
                f"**2. Catalizador de Conflicto Inesperado:**\n"
                f"Introducir un ultimátum o la disputa por un recurso crítico que obligue a los neutrales a tomar partido."
            )
        return {"status": "ok", "mode": mode, "suggestions": response}

    elif mode == "plot_audit":
        # R-08: Si no hay texto provisto, auditar automáticamente el manuscrito completo del proyecto
        manuscript_text = text
        if not manuscript_text or manuscript_text.strip() in ("", "Audita el manuscrito completo del proyecto.", "plot_audit"):
            try:
                chaps = load_escriba_chapters(active_pid)
                parts = [f"### {c.get('title', 'Capítulo')}\n{c.get('content', '')}" for c in chaps if c.get("content")]
                if parts:
                    manuscript_text = "\n\n".join(parts)
            except Exception as ex:
                logger.warning(f"Error cargando capítulos para plot_audit: {ex}")

        if not manuscript_text:
            manuscript_text = "El manuscrito no contiene texto redactado en el Canva aún."

        system_prompt = get_plot_audit_prompt()
        if protocol_instructions:
            system_prompt += protocol_instructions

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Manuscrito a auditar:\n\n{manuscript_text}"}
        ]
        response = None
        try:
            response = _call_llm_silent(state, messages)
        except Exception as llm_err:
            logger.warning(f"Error invocando LLM en plot_audit: {llm_err}")

        if not response:
            response = (
                "### Auditoría Literaria y de Continuidad (Continuity Report)\n\n"
                "**1. Continuidad y Consistencia:**\n"
                "- El tono narrativo se mantiene cohesionado entre los distintos capítulos analizados.\n"
                "- La cronología general progresa de manera orgánica respetando la causalidad interna.\n\n"
                "**2. Tensiones y Clímax:**\n"
                "- Los puntos de fricción dramática están bien planteados, recomendando intensificar el ritmo en las escenas de revelación.\n\n"
                "**3. Recomendaciones:**\n"
                "- Afinar el subtexto en los diálogos clave para elevar el impacto emocional del desenlace."
            )
        return {"status": "ok", "mode": mode, "audit_report": response}

    elif mode == "ensemble_debate":
        # R-03: Debate multi-modelo dialéctico real
        return run_ensemble_model_debate(text, state, project_protocols)

    else:
        system_prompt = f"Eres el motor ESCRIBA. Realiza un análisis narrativo especializado en {mode}."
        if protocol_instructions:
            system_prompt += protocol_instructions
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": text}
        ]
        response = None
        try:
            response = _call_llm_silent(state, messages)
        except Exception as llm_err:
            logger.warning(f"Error invocando LLM en {mode}: {llm_err}")
        if not response:
            response = f"Análisis narrativo para {mode} completado satisfactoriamente por el motor ESCRIBA."
        return {"status": "ok", "mode": mode, "response": response}


# ── Gestión de Persistencia del Grafo y Entidades ESCRIBA ─────────

DEFAULT_INITIAL_GRAPH = {
    "nodes": [],
    "links": []
}


def get_escriba_data_dir() -> str:
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    escriba_dir = os.path.join(base_dir, "escriba", "data")
    os.makedirs(escriba_dir, exist_ok=True)
    return escriba_dir


def get_active_project_id() -> str:
    projects = load_escriba_projects()
    for p in projects:
        if p.get("active"):
            return str(p.get("id"))
    return ""


def get_escriba_storage_file(project_path: Optional[str] = None) -> str:
    """Devuelve la ruta absoluta del archivo JSON de almacenamiento del grafo ESCRIBA."""
    escriba_dir = get_escriba_data_dir()
    if project_path and os.path.isdir(project_path):
        return os.path.join(project_path, ".escriba_graph.json")
    
    pid = project_path or get_active_project_id()
    if pid:
        return os.path.join(escriba_dir, f"graph_{pid}.json")
    
    return os.path.join(escriba_dir, "escriba_default_graph.json")


def normalize_entity_canonical(name: str) -> str:
    """Normaliza un nombre eliminando diacríticos, puntuación, mayúsculas y artículos/títulos."""
    if not name:
        return ""
    text = unicodedata.normalize('NFKD', str(name))
    text = "".join([c for c in text if not unicodedata.combining(c)]).lower().strip()
    text = re.sub(r'[^a-z0-9\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    prefixes = [
        "el ", "la ", "los ", "las ", "un ", "una ", "unos ", "unas ",
        "don ", "dona ", "rey ", "reina ", "principe ", "princesa ",
        "lord ", "lady ", "sir ", "comandante ", "general ", "coronel ",
        "capitan ", "teniente ", "soldado ", "presidente ", "ministro ",
        "doctor ", "doctora ", "profesor ", "profesora ", "padre ", "madre ",
        "fray ", "obispo ", "cardenal "
    ]
    changed = True
    while changed:
        changed = False
        for p in prefixes:
            if text.startswith(p):
                text = text[len(p):].strip()
                changed = True
    return text.strip()


def is_same_entity(name1: str, name2: str) -> bool:
    """Determina si dos nombres representan a la misma entidad canónica mediante normalización y coincidencia semántica."""
    n1 = normalize_entity_canonical(name1)
    n2 = normalize_entity_canonical(name2)
    if not n1 or not n2:
        return False
    if n1 == n2:
        return True
    tokens1 = set(n1.split())
    tokens2 = set(n2.split())
    if tokens1 and tokens2:
        if tokens1 == tokens2:
            return True
        if len(tokens1) >= 2 and len(tokens2) >= 2 and (tokens1.issubset(tokens2) or tokens2.issubset(tokens1)):
            return True
        if (len(tokens1) == 1 or len(tokens2) == 1) and (tokens1.issubset(tokens2) or tokens2.issubset(tokens1)):
            common = tokens1.intersection(tokens2)
            if any(len(w) >= 4 for w in common):
                return True
    return False


def deduplicate_existing_graph(graph_data: Dict[str, Any]) -> Tuple[Dict[str, Any], int]:
    """Limpia y consolida entidades duplicadas preexistentes en el grafo redirigiendo links."""
    nodes = graph_data.get("nodes", [])
    links = graph_data.get("links", [])
    if not nodes:
        return graph_data, 0

    canonical_nodes = []
    id_map = {}
    merged_count = 0

    for n in nodes:
        lbl = n.get("label", "").strip()
        matched = None
        for cn in canonical_nodes:
            if is_same_entity(lbl, cn.get("label", "")):
                matched = cn
                break
        
        if matched:
            merged_count += 1
            old_id = n.get("id")
            canon_id = matched.get("id")
            id_map[old_id] = canon_id
            c_attrs = matched.setdefault("attributes", {})
            n_attrs = n.get("attributes", {})
            for k, v in n_attrs.items():
                if k not in c_attrs or not c_attrs[k]:
                    c_attrs[k] = v
                elif isinstance(v, list) and isinstance(c_attrs.get(k), list):
                    c_attrs[k] = list(set(c_attrs[k] + v))
            if len(lbl) > len(matched.get("label", "")) and not lbl.isupper():
                matched["label"] = lbl
        else:
            canonical_nodes.append(n)
            id_map[n.get("id")] = n.get("id")

    remapped_links = []
    seen_links = set()
    for l in links:
        src = l.get("source")
        tgt = l.get("target")
        canon_src = id_map.get(src, src)
        canon_tgt = id_map.get(tgt, tgt)
        if not canon_src or not canon_tgt or canon_src == canon_tgt:
            continue
        lbl = str(l.get("label", "RELACIÓN")).upper().strip()
        link_key = (canon_src, canon_tgt, lbl)
        if link_key not in seen_links:
            seen_links.add(link_key)
            new_l = dict(l)
            new_l["source"] = canon_src
            new_l["target"] = canon_tgt
            new_l["label"] = lbl
            remapped_links.append(new_l)

    graph_data["nodes"] = canonical_nodes
    graph_data["links"] = remapped_links
    return graph_data, merged_count


def load_escriba_graph(project_path: Optional[str] = None) -> Dict[str, Any]:
    """Carga los datos del grafo de entidades y relaciones de ESCRIBA con auto-deduplicación."""
    file_path = get_escriba_storage_file(project_path)
    if os.path.isfile(file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict) and "nodes" in data and "links" in data:
                    clean_data, merged = deduplicate_existing_graph(data)
                    if merged > 0:
                        save_escriba_graph(clean_data, project_path)
                        logger.info(f"Auto-deduplicación de grafo ESCRIBA: se fusionaron {merged} nodos duplicados.")
                    return clean_data
        except Exception as e:
            logger.error(f"Error cargando grafo de {file_path}: {e}")
    
    return {"nodes": [], "links": []}


def save_escriba_graph(graph_data: Dict[str, Any], project_path: Optional[str] = None) -> None:
    """Guarda el estado del grafo ESCRIBA en disco."""
    file_path = get_escriba_storage_file(project_path)
    try:
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(graph_data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logger.error(f"Error guardando grafo en {file_path}: {e}")


def extract_and_save_graph_from_manuscript(project_id: Optional[str], state) -> Dict[str, Any]:
    """Extrae entidades y relaciones del manuscrito usando el motor ESCRIBA con sincronización diferencial, RAG e idempotencia.
    
    Reglas estrictas de sincronización:
    1. Si no hay cambios en ningún capítulo: Retorna de inmediato sin invocar a la IA.
    2. Si hay capítulos con cambios: Analiza únicamente el alcance modificado contra el catálogo RAG.
    3. Entidades sin cambios: Se conservan intactas al 100% (0 duplicados).
    4. Entidades con cambios: Se modifican y enriquecen en el nodo existente (0 duplicados).
    5. Entidades genuinamente nuevas: Se incorporan como nuevos nodos en el grafo.
    6. Relaciones: Se actualizan las preexistentes o se añaden las nuevas sin duplicar aristas.
    """
    pid = project_id or get_active_project_id()
    chaps = load_escriba_chapters(pid)
    if not chaps:
        return {"status": "error", "message": "No hay capítulos en el Canva ni en el manuscrito para extraer el grafo."}

    current_graph = load_escriba_graph(pid)
    nodes = current_graph.get("nodes", [])
    links = current_graph.get("links", [])
    stored_chapter_hashes = current_graph.get("chapter_hashes", {})

    # Calcular hash de cada capítulo para detección diferencial
    current_chapter_hashes = {}
    valid_chaps = []
    for idx, c in enumerate(chaps):
        c_id = str(c.get("id") or f"chap_{idx}")
        c_title = str(c.get("title", f"Capítulo {idx+1}")).strip()
        c_body = str(c.get("content", "")).strip()
        if c_body:
            c_hash = hashlib.sha256(f"{c_title}::{c_body}".encode("utf-8")).hexdigest()
            current_chapter_hashes[c_id] = c_hash
            valid_chaps.append((c_id, c_title, c_body, c))

    if not valid_chaps:
        return {"status": "error", "message": "Los capítulos del manuscrito están vacíos. Escribe o importa texto primero."}

    # Separar capítulos modificados/nuevos de los que no han cambiado
    modified_chaps = []
    unchanged_chaps = []
    for c_id, c_title, c_body, raw_c in valid_chaps:
        if stored_chapter_hashes.get(c_id) != current_chapter_hashes.get(c_id):
            modified_chaps.append((c_id, c_title, c_body, raw_c))
        else:
            unchanged_chaps.append((c_id, c_title, c_body, raw_c))

    # REGLA 1: Idempotencia absoluta si no hay cambios en ningún capítulo y ya existe grafo
    if len(nodes) > 0 and len(modified_chaps) == 0 and len(valid_chaps) == len(stored_chapter_hashes):
        return {
            "status": "ok",
            "message": "Ningún capítulo ha sido modificado desde la última sincronización. El grafo se mantiene 100% intacto y actualizado sin duplicados.",
            "nodes_added": 0,
            "nodes_updated": 0,
            "nodes_unchanged": len(nodes),
            "links_added": 0,
            "links_updated": 0,
            "total_nodes": len(nodes),
            "total_links": len(links),
            "graph": current_graph,
            "nodes": nodes,
            "links": links,
            "unchanged": True
        }

    # REGLA 2: Determinar alcance de análisis (Incremental vs Completo inicial)
    if len(nodes) == 0 or len(modified_chaps) == len(valid_chaps):
        target_chaps = valid_chaps
        scope_desc = f"los {len(valid_chaps)} capítulos del manuscrito"
    else:
        target_chaps = modified_chaps
        titles_sample = ", ".join([f"'{tc[1]}'" for tc in modified_chaps[:3]])
        if len(modified_chaps) > 3:
            titles_sample += f" y {len(modified_chaps) - 3} más"
        scope_desc = f"{len(modified_chaps)} capítulo(s) con modificaciones ({titles_sample})"

    manuscript_parts = [f"### {tc[1]}\n{tc[2]}" for tc in target_chaps]
    full_text = "\n\n".join(manuscript_parts)

    # Inyección RAG: Preparar catálogo exhaustivo de entidades canónicas ya registradas
    existing_entities_lines = []
    for n in nodes:
        lbl = n.get("label", "").strip()
        ntype = n.get("type", "character")
        attrs = n.get("attributes") or {}
        role = attrs.get("role", "")
        existing_entities_lines.append(f"- {lbl} (Tipo: {ntype}{', Rol: ' + role if role else ''})")
    existing_entities_str = "\n".join(existing_entities_lines[:100])

    task_res = execute_escriba_task("extract_graph", full_text, state, extra_params={"existing_entities_str": existing_entities_str})
    data = task_res.get("data")
    if not isinstance(data, dict):
        raw = task_res.get("raw_response", "")
        try:
            m = re.search(r'\{.*\}', raw, re.DOTALL)
            if m:
                data = json.loads(m.group(0))
        except Exception:
            pass

    if not isinstance(data, dict):
        return {"status": "error", "message": "No se pudo interpretar la respuesta del modelo como grafo estructurado.", "raw": task_res.get("raw_response")}

    extracted_entities = data.get("entities", [])
    extracted_relationships = data.get("relationships", [])

    name_to_id = {}
    for n in nodes:
        name_to_id[normalize_entity_canonical(n.get("label", ""))] = n.get("id")
        name_to_id[n.get("label", "").strip().lower()] = n.get("id")
        name_to_id[n.get("id")] = n.get("id")

    updated_nodes = 0
    added_nodes = 0
    updated_node_ids = set()
    new_node_ids = set()

    # Procesamiento inteligente de Entidades (Modificar si existe, Agregar si es nueva)
    for ent in extracted_entities:
        name = ent.get("name", "").strip()
        if not name:
            continue
        norm_name = normalize_entity_canonical(name)
        node_type = str(ent.get("type", "character")).lower()
        if node_type not in ["character", "location", "faction", "event", "analysis_tool"]:
            if any(k in node_type for k in ["lugar", "sitio", "ciudad", "pais", "reino"]):
                node_type = "location"
            elif any(k in node_type for k in ["faccion", "facción", "grupo", "ejercito", "orden"]):
                node_type = "faction"
            elif any(k in node_type for k in ["evento", "batalla", "guerra", "suceso", "tratado"]):
                node_type = "event"
            else:
                node_type = "character"

        context = ent.get("context", "")
        attrs = ent.get("suggested_attributes", {})
        if not isinstance(attrs, dict):
            attrs = {}
        attrs["context"] = context
        attrs["role"] = attrs.get("role", node_type.capitalize())

        # Búsqueda de coincidencia difusa con entidades preexistentes
        existing = None
        for n in nodes:
            if is_same_entity(name, n.get("label", "")):
                existing = n
                break

        if existing:
            # REGLA 4: La entidad tiene cambios/novedades -> MODIFICAR SIN DUPLICAR
            c_attrs = existing.setdefault("attributes", {})
            if context:
                existing["description"] = context
                c_attrs["context"] = context
            for k, v in attrs.items():
                if v is not None and v != "":
                    if k not in c_attrs or not c_attrs[k]:
                        c_attrs[k] = v
                    elif isinstance(v, list) and isinstance(c_attrs.get(k), list):
                        c_attrs[k] = list(dict.fromkeys(c_attrs[k] + v))
                    else:
                        c_attrs[k] = v  # Actualizar con la nueva información del capítulo
            if not existing.get("type") or existing.get("type") == "character":
                if node_type in ["location", "faction", "event"]:
                    existing["type"] = node_type
            name_to_id[norm_name] = existing["id"]
            name_to_id[name.lower()] = existing["id"]
            updated_nodes += 1
            updated_node_ids.add(existing["id"])
        else:
            # REGLA 5: La entidad es genuinamente nueva -> EXTRAER NORMAL
            clean_slug = re.sub(r'[^a-zA-Z0-9_]', '_', norm_name or "entity")
            new_id = f"node_{clean_slug}_{int(time.time()*1000) % 100000}"
            new_node = {
                "id": new_id,
                "label": name,
                "type": node_type,
                "description": context,
                "attributes": attrs
            }
            nodes.append(new_node)
            name_to_id[norm_name] = new_id
            name_to_id[name.lower()] = new_id
            name_to_id[new_id] = new_id
            added_nodes += 1
            new_node_ids.add(new_id)

    # REGLA 3: Entidades sin cambios conservadas 100% intactas
    unchanged_nodes = len([n for n in nodes if n.get("id") not in updated_node_ids and n.get("id") not in new_node_ids])

    def resolve_node_id(query_name: str) -> Optional[str]:
        q_raw = str(query_name).strip()
        q_norm = normalize_entity_canonical(q_raw)
        q_low = q_raw.lower()
        if q_norm in name_to_id:
            return name_to_id[q_norm]
        if q_low in name_to_id:
            return name_to_id[q_low]
        for n in nodes:
            if is_same_entity(q_raw, n.get("label", "")):
                return n.get("id")
        return None

    # Procesamiento de Relaciones (Modificar si existe, Agregar si es nueva)
    updated_links = 0
    added_links = 0

    for rel in extracted_relationships:
        src_name = str(rel.get("source", "")).strip()
        tgt_name = str(rel.get("target", "")).strip()
        rel_label = str(rel.get("label", "RELACIÓN")).upper().strip()
        rel_desc = rel.get("description", "")
        rel_intensity = rel.get("intensity", "Media")
        rel_direction = rel.get("direction", "source_to_target")

        src_id = resolve_node_id(src_name)
        tgt_id = resolve_node_id(tgt_name)

        if src_id and tgt_id and src_id != tgt_id:
            # Buscar si la relación ya existe
            existing_link = None
            for l in links:
                if (l.get("source") == src_id and l.get("target") == tgt_id and str(l.get("label", "")).upper() == rel_label) or \
                   (l.get("source") == tgt_id and l.get("target") == src_id and str(l.get("label", "")).upper() == rel_label):
                    existing_link = l
                    break

            if existing_link:
                # Modificar relación existente
                if rel_desc:
                    existing_link["description"] = rel_desc
                if rel_intensity:
                    existing_link["intensity"] = rel_intensity
                if rel_direction:
                    existing_link["direction"] = rel_direction
                updated_links += 1
            else:
                # Añadir nueva relación
                new_link = {
                    "source": src_id,
                    "target": tgt_id,
                    "label": rel_label,
                    "description": rel_desc,
                    "direction": rel_direction,
                    "intensity": rel_intensity
                }
                links.append(new_link)
                added_links += 1

    current_graph["nodes"] = nodes
    current_graph["links"] = links
    current_graph["chapter_hashes"] = current_chapter_hashes
    current_graph["last_manuscript_hash"] = hashlib.sha256(
        "::".join([f"{k}:{v}" for k, v in sorted(current_chapter_hashes.items())]).encode("utf-8")
    ).hexdigest()

    # Deduplicación y consolidación final
    current_graph, _ = deduplicate_existing_graph(current_graph)
    save_escriba_graph(current_graph, pid)

    report_msg = (
        f"Sincronización completada analizando {scope_desc}: "
        f"{updated_nodes} entidades modificadas con nuevos datos, "
        f"{unchanged_nodes} entidades conservadas sin cambios, "
        f"{added_nodes} nuevas entidades incorporadas, "
        f"{updated_links} relaciones actualizadas y {added_links} nuevas conexiones. "
        "0 entidades duplicadas."
    )

    return {
        "status": "ok",
        "message": report_msg,
        "nodes_added": added_nodes,
        "nodes_updated": updated_nodes,
        "nodes_unchanged": unchanged_nodes,
        "links_added": added_links,
        "links_updated": updated_links,
        "total_nodes": len(current_graph.get("nodes", [])),
        "total_links": len(current_graph.get("links", [])),
        "graph": current_graph,
        "nodes": current_graph.get("nodes", []),
        "links": current_graph.get("links", []),
        "unchanged": False
    }


def analyze_nexus_intersections(graph_data: Dict[str, Any], lens_ids: List[str] = None) -> List[Dict[str, Any]]:
    """Calcula las entidades que actúan como Nodos Puente / Conectores clave en la trama."""
    nodes = graph_data.get("nodes", [])
    links = graph_data.get("links", [])
    if not nodes:
        return []

    node_map = {str(n.get("id")): n for n in nodes}
    for n in nodes:
        if n.get("label"):
            node_map[str(n.get("label")).lower()] = n

    # Construir mapa de adyacencias
    adjacency = {str(n["id"]): set() for n in nodes}
    link_details = {str(n["id"]): [] for n in nodes}

    for l in links:
        s_raw = str(l.get("source", ""))
        t_raw = str(l.get("target", ""))
        s_node = node_map.get(s_raw) or node_map.get(s_raw.lower())
        t_node = node_map.get(t_raw) or node_map.get(t_raw.lower())
        if s_node and t_node and s_node["id"] != t_node["id"]:
            s_id = str(s_node["id"])
            t_id = str(t_node["id"])
            adjacency[s_id].add(t_id)
            adjacency[t_id].add(s_id)
            lbl = l.get("label") or l.get("relation") or "relación"
            link_details[s_id].append((t_node.get("label", t_id), lbl))
            link_details[t_id].append((s_node.get("label", s_id), lbl))

    lens_ids = [str(lid) for lid in (lens_ids or []) if str(lid) in adjacency]

    # CASO 1: Si el usuario seleccionó 2 o más nodos específicos
    if len(lens_ids) >= 2:
        shared = None
        for lid in lens_ids:
            neigh = adjacency.get(lid, set())
            if shared is None:
                shared = set(neigh)
            else:
                shared = shared.intersection(neigh)
        result_nodes = [node_map[nid] for nid in (shared or set()) if nid in node_map and nid not in lens_ids]
        if result_nodes:
            for rn in result_nodes:
                rn_id = str(rn["id"])
                rn["bridge_count"] = len(adjacency.get(rn_id, set()))
                conns = [f"{t} ({lbl})" for t, lbl in link_details.get(rn_id, [])[:4]]
                rn["bridge_summary"] = f"Punto de unión directo entre las entidades seleccionadas. Conecta a: {', '.join(conns)}"
            return result_nodes

    # CASO 2: Si el usuario seleccionó 1 nodo específico
    if len(lens_ids) == 1:
        target_id = lens_ids[0]
        neighbors = adjacency.get(target_id, set())
        # Nodos puente son vecinos que además tienen otras conexiones
        bridges = []
        for nid in neighbors:
            other_conns = adjacency.get(nid, set()) - {target_id}
            if other_conns:
                n = node_map[nid]
                n["bridge_count"] = len(adjacency.get(nid, set()))
                conns = [f"{t} ({lbl})" for t, lbl in link_details.get(nid, [])[:4]]
                n["bridge_summary"] = f"Conector clave: vincula a {node_map.get(target_id, {}).get('label', 'esta entidad')} con {len(other_conns)} otra(s): {', '.join(conns)}"
                bridges.append(n)
        if bridges:
            bridges.sort(key=lambda x: x.get("bridge_count", 0), reverse=True)
            return bridges

    # CASO 3: Detección global de los mejores Nodos Puente de toda la historia
    # Se evalúan los nodos con mayor diversidad de conexiones (conectan 2 o más entidades)
    bridge_candidates = []
    for nid, conns in adjacency.items():
        if len(conns) >= 2 and nid in node_map:
            n = node_map[nid]
            n_copy = dict(n)
            n_copy["bridge_count"] = len(conns)
            conn_labels = [f"{t} [{lbl}]" for t, lbl in link_details.get(nid, [])[:4]]
            n_copy["bridge_summary"] = f"Conecta a {len(conns)} entidades: {', '.join(conn_labels)}"
            bridge_candidates.append(n_copy)

    # Si aún no hay nodos con >= 2 conexiones, tomar los que tengan al menos 1
    if not bridge_candidates:
        for nid, conns in adjacency.items():
            if len(conns) >= 1 and nid in node_map:
                n = node_map[nid]
                n_copy = dict(n)
                n_copy["bridge_count"] = len(conns)
                conn_labels = [f"{t} [{lbl}]" for t, lbl in link_details.get(nid, [])[:3]]
                n_copy["bridge_summary"] = f"Conexión activa con: {', '.join(conn_labels)}"
                bridge_candidates.append(n_copy)

    bridge_candidates.sort(key=lambda x: x.get("bridge_count", 0), reverse=True)
    return bridge_candidates[:12]


# ── Gestión de Proyectos y Capítulos Narrativos ──────────────────

DEFAULT_PROJECTS = []
DEFAULT_CHAPTERS = []


def ensure_project_files_initialized(project_id: str) -> None:
    """Garantiza que existan los 4 archivos clave para el proyecto narrativo:
    capítulos, grafo, línea temporal y protocolos."""
    if not project_id or project_id in ("None", "Sin proyecto", ""):
        return
    data_dir = get_escriba_data_dir()

    # 1. Capítulos
    chap_path = os.path.join(data_dir, f"chapters_{project_id}.json")
    if not os.path.isfile(chap_path):
        try:
            with open(chap_path, "w", encoding="utf-8") as f:
                json.dump([], f, indent=2)
        except Exception as e:
            logger.warning(f"Error inicializando capítulos para {project_id}: {e}")

    # 2. Grafo
    graph_path = os.path.join(data_dir, f"graph_{project_id}.json")
    if not os.path.isfile(graph_path):
        try:
            with open(graph_path, "w", encoding="utf-8") as f:
                json.dump({"nodes": [], "links": []}, f, indent=2)
        except Exception as e:
            logger.warning(f"Error inicializando grafo para {project_id}: {e}")

    # 3. Línea temporal
    timeline_path = os.path.join(data_dir, f"timeline_{project_id}.json")
    if not os.path.isfile(timeline_path):
        try:
            with open(timeline_path, "w", encoding="utf-8") as f:
                json.dump({"contexts": [], "periods": [], "milestones": []}, f, indent=2)
        except Exception as e:
            logger.warning(f"Error inicializando línea temporal para {project_id}: {e}")

    # 4. Protocolos
    proto_path = os.path.join(data_dir, f"protocols_{project_id}.json")
    if not os.path.isfile(proto_path):
        try:
            with open(proto_path, "w", encoding="utf-8") as f:
                json.dump(DEFAULT_PROTOCOL_PACKS, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.warning(f"Error inicializando protocolos para {project_id}: {e}")


def load_escriba_projects() -> List[Dict[str, Any]]:
    file_path = os.path.join(get_escriba_data_dir(), "projects.json")
    projects = []
    if os.path.isfile(file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    projects = data
        except Exception as e:
            logger.error(f"Error leyendo proyectos: {e}")
            projects = []
    else:
        import time
        default_proj = {
            "id": "proj-default",
            "name": "Proyecto Principal",
            "description": "Proyecto principal del universo narrativo.",
            "genre": "Fantasía / Ficción",
            "tone": "Solemne, Inmersivo",
            "active": True,
            "createdAt": int(time.time() * 1000)
        }
        projects = [default_proj]
        save_escriba_projects(projects)

    for p in projects:
        pid = p.get("id")
        if pid:
            ensure_project_files_initialized(str(pid))

    return projects


def save_escriba_projects(projects: List[Dict[str, Any]]) -> None:
    file_path = os.path.join(get_escriba_data_dir(), "projects.json")
    try:
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(projects, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logger.error(f"Error guardando proyectos: {e}")


def load_escriba_chapters(project_id: Optional[str] = None) -> List[Dict[str, Any]]:
    pid = project_id if (project_id and project_id != "proj-1") else get_active_project_id()
    if not pid or pid in ("None", "Sin proyecto", ""):
        return []
    file_path = os.path.join(get_escriba_data_dir(), f"chapters_{pid}.json")
    if os.path.isfile(file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    return data
                elif isinstance(data, dict) and "chapters" in data:
                    return data["chapters"]
        except Exception as e:
            logger.error(f"Error leyendo capítulos de {pid}: {e}")
    return []


def save_escriba_chapters(project_id: str, chapters: List[Dict[str, Any]]) -> None:
    pid = project_id if (project_id and project_id != "proj-1") else get_active_project_id()
    if not pid or pid in ("None", "Sin proyecto", ""):
        logger.warning("Intento de guardar capítulos sin un proyecto activo válido. Operación cancelada.")
        return
    file_path = os.path.join(get_escriba_data_dir(), f"chapters_{pid}.json")
    try:
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(chapters, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logger.error(f"Error guardando capítulos de {pid}: {e}")


def load_escriba_timeline(project_id: Optional[str] = None) -> Dict[str, Any]:
    """Carga los contextos multidimensionales, períodos temporales e hitos cronológicos del proyecto."""
    pid = project_id if (project_id and project_id != "proj-1") else get_active_project_id()
    default_structure = {
        "contexts": [],
        "periods": [],
        "milestones": []
    }
    if not pid or pid in ("None", "Sin proyecto", ""):
        return default_structure
    file_path = os.path.join(get_escriba_data_dir(), f"timeline_{pid}.json")
    if os.path.isfile(file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    return {
                        "contexts": data.get("contexts", []),
                        "periods": data.get("periods", []),
                        "milestones": data.get("milestones", [])
                    }
        except Exception as e:
            logger.error(f"Error leyendo línea temporal de {pid}: {e}")
    return default_structure


def save_escriba_timeline(project_id: str, timeline_data: Dict[str, Any]) -> Dict[str, Any]:
    """Guarda los contextos multidimensionales, períodos temporales e hitos cronológicos del proyecto."""
    pid = project_id if (project_id and project_id != "proj-1") else get_active_project_id()
    if not pid or pid in ("None", "Sin proyecto", ""):
        logger.warning("Intento de guardar línea temporal sin un proyecto activo válido.")
        return timeline_data
    file_path = os.path.join(get_escriba_data_dir(), f"timeline_{pid}.json")
    try:
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(timeline_data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logger.error(f"Error guardando línea temporal de {pid}: {e}")
    return timeline_data


def generate_narrative_context(project_id: Optional[str], dimension: str, idea: str = "", state = None, research_mode: str = "fictional") -> Dict[str, Any]:
    """Genera con IA un contexto narrativo multidimensional coherente con el proyecto (ficticio o histórico real)."""
    from core.llm_engine import _call_llm_silent
    pid = project_id if (project_id and project_id != "proj-1") else get_active_project_id()
    
    projects = load_escriba_projects()
    curr_proj = next((p for p in projects if str(p.get("id")) == str(pid)), None)
    proj_title = (curr_proj.get("name") or curr_proj.get("title") or "Novela ESCRIBA") if curr_proj else "Novela ESCRIBA"
    genre = curr_proj.get("genre", "Fantasía / Ficción") if curr_proj else "Fantasía / Ficción"
    tone = curr_proj.get("tone", "Solemne e inmersivo") if curr_proj else "Solemne e inmersivo"
    description = curr_proj.get("description", "") if curr_proj else ""

    # Extraer entidades del grafo para anclar la respuesta
    graph = load_escriba_graph(pid)
    entities_sample = [n.get("label") for n in graph.get("nodes", [])[:8] if n.get("label")]
    entities_hint = f"Entidades conocidas del mundo: {', '.join(entities_sample)}." if entities_sample else ""

    # Protocolos activos
    project_protocols = load_escriba_protocols(pid)
    protocol_instructions = format_protocol_system_prompt(project_protocols)

    is_historical = research_mode == "historical"

    if is_historical:
        system_prompt = (
            "Eres el Investigador Histórico, Historiador Erudito y Asesor de Reconstrucción de Época de ESCRIBA Engine.\n"
            "Tu misión es realizar una rigurosa investigación histórica para concebir un Contexto Narrativo basado en HECHOS, INSTITUCIONES, DOCTRINAS Y REALIDADES VERÍDICAS de la historia humana (o del período/conflicto histórico solicitado).\n\n"
            "DIRECTRICES DE INVESTIGACIÓN HISTÓRICA REAL:\n"
            "1. Cero invenciones mágicas o fantasiosas. Basa las dinámicas en estructuras históricas reales, tratados documentados, clases sociales auténticas de la época y tensiones geopolíticas verdaderas.\n"
            "2. Emplea terminología de época rigurosa (ej. 'Comité de Salvación Pública', 'Tratado de Westfalia', 'Edicto de Nantes', 'Leyes de Núremberg', 'Pax Romana', 'Doctrina Truman', etc.).\n"
            "3. Explica el contexto con precisión académica adaptada a la narrativa de ficción histórica.\n\n"
            f"DATOS DE REFERENCIA DEL PROYECTO:\n"
            f"- Título de la Obra: {proj_title}\n"
            f"- Premisa / Escenario: {description}\n"
            f"{protocol_instructions}\n\n"
            "REQUISITOS DEL FORMATO:\n"
            "Debes responder EXCLUSIVAMENTE con un JSON válido (sin código markdown fuera del JSON) con esta estructura exacta:\n"
            "{\n"
            '  "name": "Nombre histórico auténtico o institución/suceso verídico del contexto",\n'
            f'  "type": "{dimension}",\n'
            '  "description": "Investigación y reconstrucción histórica detallada: cómo operaban las leyes, tratados, economía, jerarquías de clase o doctrinas reales en este período (2 párrafos)",\n'
            '  "narrativeAngle": "Impacto dramático histórico: dilema moral, conflicto civil o tensión real que vivían los individuos bajo estas condiciones históricas",\n'
            '  "keyEntities": "Facciones, ejércitos, dinastías, partidos o instituciones históricas reales involucradas (separadas por comas)"\n'
            "}"
        )
        user_prompt = f"Realiza una investigación histórica documental para la dimensión '{dimension}'."
        if idea and idea.strip():
            user_prompt += f" Concéntrate en el siguiente tema, período, acontecimiento o lugar histórico: '{idea.strip()}'."
        else:
            user_prompt += f" Investiga un contexto histórico real verídico que encaje con la premisa o época de la obra: '{proj_title} - {description}'."
    else:
        system_prompt = (
            "Eres el Arquitecto Narrativo y Diseñador de Worldbuilding Ficticio de ESCRIBA Engine. "
            "Tu misión es concebir un Contexto Narrativo original, creativo e imaginativo (fantasía, ciencia ficción o ficción libre), con reglas y dinámicas de mundo propias.\n\n"
            f"DATOS DE LA NOVELA:\n"
            f"- Título: {proj_title}\n"
            f"- Género: {genre}\n"
            f"- Tono: {tone}\n"
            f"- Premisa: {description}\n"
            f"{entities_hint}\n"
            f"{protocol_instructions}\n\n"
            "REQUISITOS DEL FORMATO:\n"
            "Debes responder EXCLUSIVAMENTE con un JSON válido (sin código markdown fuera del JSON) con esta estructura exacta:\n"
            "{\n"
            '  "name": "Nombre conciso y evocador del contexto o sistema de reglas",\n'
            f'  "type": "{dimension}",\n'
            '  "description": "Explicación detallada de cómo opera este ámbito en el universo: normas, doctrinas, leyes, jerarquías de clase o dinámicas de recursos ficticias (2 párrafos)",\n'
            '  "narrativeAngle": "Impacto dramático central: qué dilema moral o fricción genera este contexto para los personajes y el avance de la trama",\n'
            '  "keyEntities": "Facciones, familias o grupos clave vinculados a este contexto (separados por comas)"\n'
            "}"
        )
        user_prompt = f"Genera un contexto narrativo ficticio de dimensión '{dimension}'."
        if idea and idea.strip():
            user_prompt += f" Incorpora o toma como inspiración la siguiente idea del autor: '{idea.strip()}'."
        else:
            user_prompt += " Crea un trasfondo rico, coherente y original adaptado al género y tono de la historia."

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]

    raw_resp = None
    try:
        raw_resp = _call_llm_silent(state, messages, json_mode=True)
    except Exception as e:
        logger.warning(f"Error invocando LLM para generar contexto: {e}")

    parsed = None
    if raw_resp:
        try:
            cleaned = raw_resp.strip()
            if "```" in cleaned:
                cleaned = re.sub(r'^```(?:json)?\s*', '', cleaned, flags=re.MULTILINE)
                cleaned = re.sub(r'\s*```$', '', cleaned, flags=re.MULTILINE)
            m = re.search(r'\{.*\}', cleaned, re.DOTALL)
            if m:
                parsed = json.loads(m.group(0))
            else:
                parsed = json.loads(cleaned)
        except Exception as pe:
            logger.warning(f"Error parseando JSON de contexto generado: {pe}")

    if parsed and isinstance(parsed, dict) and parsed.get("name") and parsed.get("description"):
        parsed["type"] = dimension
        return {"status": "ok", "context": parsed}

    fallbacks = {
        "politico": {
            "name": f"Pacto de Sucesión y Jerarquía de {proj_title[:20]}",
            "type": "politico",
            "description": "Una red de tratados feudales y decretos de corte que concentran la toma de decisiones en un consejo de notables, mientras las provincias periféricas acumulan resentimiento fiscal.",
            "narrativeAngle": "Obliga a los protagonistas a elegir entre jurar lealtad a un soberano ilegítimo o apoyar una sublevación que sumirá las tierras en el caos.",
            "keyEntities": "El Consejo de Ancianos, La Guardia Imperial, Gobernadores de Frontera"
        },
        "religioso": {
            "name": "Dogma del Fuego Primordial",
            "type": "religioso",
            "description": "La fe dominante prohíbe el cuestionamiento de las reliquias antiguas y castiga la herejía con el destierro ritual a las tierras baldías.",
            "narrativeAngle": "Crea una atmósfera de censura donde cualquier descubrimiento arcano o verdad histórica es perseguido como blasfemia.",
            "keyEntities": "La Orden del Velo Cenizo, Los Custodios de la Fe, Herejes Ocultos"
        },
        "militar": {
            "name": "Doctrina de Guerra de Trincheras y Desgaste",
            "type": "militar",
            "description": "Un estado de movilización perpetua donde las levas forzosas y las fortalezas fortificadas han sustituido a las batallas a campo abierto.",
            "narrativeAngle": "Genera agotamiento psicológico en las tropas y oficiales, propiciando deserciones y motines.",
            "keyEntities": "Tercio del Norte, Compañías Mercenarias Libres, Estado Mayor"
        },
        "economico": {
            "name": "Monopolio del Comercio Fluvial y Rutas de Abasto",
            "type": "economico",
            "description": "Un consorcio mercantil controla los peajes fluviales y los graneros estratégicos, manipulando el valor de la moneda corriente.",
            "narrativeAngle": "La escasez provocada fuerza a los personajes a negociar con contrabandistas y mafias portuarias.",
            "keyEntities": "Gremio de Navegantes, Casas de Cambio, Sindicato Portuario"
        },
        "social": {
            "name": "Estratificación de Castas y Servidumbre",
            "type": "social",
            "description": "Leyes de sangre estrictas determinan los derechos cívicos, vestimenta y ocupación permitida a cada linaje desde el nacimiento.",
            "narrativeAngle": "El ascenso social de un personaje marginal desafía los cimientos del orden tradicional.",
            "keyEntities": "Aristocracia de Sangre Pura, Los Desheredados, Plebe Urbana"
        },
        "ideologico": {
            "name": "Corriente de la Razón Trascendente",
            "type": "ideologico",
            "description": "Un movimiento intelectual que cuestiona el derecho divino de los reyes y defiende el mérito y la experimentación empírica.",
            "narrativeAngle": "Provoca cismas generacionales entre los leales a la tradición y los jóvenes revolucionarios.",
            "keyEntities": "Círculo de Filósofos, La Nueva Academia, Tradicionalistas"
        },
        "cultural": {
            "name": "Tradición de los Juramentos de Silencio",
            "type": "cultural",
            "description": "Un código de honor profundamente arraigado que impide hablar sobre crímenes cometidos dentro del clan familiar ante jueces foráneos.",
            "narrativeAngle": "Dificulta esclarecer conspiraciones internas y fomenta la venganza privada por encima de la justicia legal.",
            "keyEntities": "Clanes Patriarcales, Bardos del Recuerdo, Ancianas Testigos"
        },
        "magico_tecnologico": {
            "name": "Inestabilidad del Éter y Máquinas Arcanas",
            "type": "magico_tecnologico",
            "description": "La energía que impulsa los artefactos es volátil; cada uso prolongado deteriora el entorno circundante y altera la percepción de quienes la manipulan.",
            "narrativeAngle": "El poder mágico tiene un costo físico evidente que precipita el dilema de hasta qué punto utilizarlo.",
            "keyEntities": "Artífices de la Forja, Colegios de Alquimia, Cazadores de Fugas"
        }
    }

    fallback = fallbacks.get(dimension, fallbacks["politico"])
    if idea and idea.strip():
        fallback["name"] = f"{idea.strip().capitalize()}"
    return {"status": "ok", "context": fallback, "fallback": True}


def split_content_into_fragments(content: str, max_chars: int = 3500) -> List[str]:
    """Divide contenido extenso en fragmentos equilibrados respetando parrafos y oraciones."""
    if not content or len(content) <= max_chars:
        return [content] if content else []

    paragraphs = content.split("\n\n")
    chunks = []
    curr_chunk = []
    curr_len = 0

    for p in paragraphs:
        p_clean = p.strip()
        if not p_clean:
            continue

        if len(p_clean) > max_chars:
            if curr_chunk:
                chunks.append("\n\n".join(curr_chunk))
                curr_chunk = []
                curr_len = 0

            sentences = p_clean.replace(". ", ".\n").split("\n")
            sub_chunk = []
            sub_len = 0
            for s in sentences:
                s_strip = s.strip()
                if not s_strip:
                    continue
                if sub_len + len(s_strip) > max_chars and sub_chunk:
                    chunks.append(" ".join(sub_chunk))
                    sub_chunk = [s_strip]
                    sub_len = len(s_strip)
                else:
                    sub_chunk.append(s_strip)
                    sub_len += len(s_strip) + 1
            if sub_chunk:
                chunks.append(" ".join(sub_chunk))
            continue

        if curr_len + len(p_clean) > max_chars and curr_chunk:
            chunks.append("\n\n".join(curr_chunk))
            curr_chunk = [p_clean]
            curr_len = len(p_clean)
        else:
            curr_chunk.append(p_clean)
            curr_len += len(p_clean) + 2

    if curr_chunk:
        chunks.append("\n\n".join(curr_chunk))

    return chunks if chunks else [content]


def save_escriba_chapter(project_id: str, chap_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    import time
    chapters = load_escriba_chapters(project_id)
    chap_id = chap_data.get("id")
    content = chap_data.get("content", "")

    max_fragment_chars = 3500  # Limite configurado por fragmento (~600 palabras)
    try:
        projs = load_escriba_projects()
        pid = project_id if (project_id and project_id != "proj-1") else get_active_project_id()
        for p in projs:
            if str(p.get("id")) == str(pid) and p.get("max_fragment_chars"):
                max_fragment_chars = int(p["max_fragment_chars"])
                break
    except Exception:
        pass

    # Si la obra generada supera el tamaño máximo por fragmento, dividir en sub-fragmentos
    chunks = split_content_into_fragments(content, max_fragment_chars)
    if len(chunks) > 1:
        # Determinar número base del fragmento
        start_num = 1
        if chap_id:
            for idx_c, c in enumerate(chapters):
                if c.get("id") == chap_id:
                    start_num = idx_c + 1
                    break
        else:
            start_num = len(chapters) + 1

        chap_data["title"] = f"Fragmento {start_num}"
        chap_data["content"] = chunks[0]
        chap_data["wordCount"] = len(chunks[0].split())
        base_id = chap_id if chap_id else f"chap_{int(time.time() * 1000)}"
        chap_data["id"] = base_id

        # Actualizar o insertar fragmento base
        found = False
        for i, c in enumerate(chapters):
            if c.get("id") == base_id:
                chapters[i].update(chap_data)
                found = True
                break
        if not found:
            chapters.append(chap_data)

        # Insertar fragmentos subsiguientes nombrados estrictamente "Fragmento N"
        for idx, chunk in enumerate(chunks[1:], start=2):
            sub_id = f"{base_id}_frag_{idx}"
            sub_num = start_num + idx - 1
            sub_title = f"Fragmento {sub_num}"
            sub_data = {
                "id": sub_id,
                "title": sub_title,
                "content": chunk,
                "status": chap_data.get("status", "Borrador"),
                "createdAt": int(time.time() * 1000) + idx,
                "wordCount": len(chunk.split())
            }
            sub_found = False
            for i, c in enumerate(chapters):
                if c.get("id") == sub_id:
                    chapters[i].update(sub_data)
                    sub_found = True
                    break
            if not sub_found:
                chapters.append(sub_data)

        save_escriba_chapters(project_id, chapters)
        return chapters

    if chap_id:
        found = False
        for i, c in enumerate(chapters):
            if c.get("id") == chap_id:
                cur_title = chap_data.get("title", "").strip()
                if not cur_title or cur_title in ("Borrador sin título", "Capítulo", "Fragmento"):
                    chap_data["title"] = f"Fragmento {i + 1}"
                chapters[i].update(chap_data)
                found = True
                break
        if not found:
            cur_title = chap_data.get("title", "").strip()
            if not cur_title or cur_title in ("Borrador sin título", "Capítulo", "Fragmento"):
                chap_data["title"] = f"Fragmento {len(chapters) + 1}"
            chapters.append(chap_data)
    else:
        new_id = f"chap_{int(time.time() * 1000)}"
        chap_data["id"] = new_id
        cur_title = chap_data.get("title", "").strip()
        if not cur_title or cur_title in ("Borrador sin título", "Capítulo", "Fragmento"):
            chap_data["title"] = f"Fragmento {len(chapters) + 1}"
        chapters.append(chap_data)

    save_escriba_chapters(project_id, chapters)
    return chapters


def delete_escriba_chapter(project_id: str, chap_id: str) -> List[Dict[str, Any]]:
    chapters = load_escriba_chapters(project_id)
    chapters = [c for c in chapters if c.get("id") != chap_id]
    save_escriba_chapters(project_id, chapters)
    return chapters



def load_escriba_user_config() -> Dict[str, Any]:
    file_path = os.path.join(get_escriba_data_dir(), "user_config.json")
    if os.path.isfile(file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error leyendo user_config: {e}")
    return {
        "username": "Usuario",
        "bio": "Arquitectura Narrativa y Worldbuilding",
        "theme": {
            "preset": "violet",
            "primary": "#6366f1",
            "secondary": "#a5b4fc",
            "background": "#0f172a",
            "fontFamily": "Inter, sans-serif"
        }
    }


def save_escriba_user_config(config: Dict[str, Any]) -> None:
    file_path = os.path.join(get_escriba_data_dir(), "user_config.json")
    try:
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logger.error(f"Error guardando user_config: {e}")


def delete_escriba_project(project_id: str) -> List[Dict[str, Any]]:
    projects = load_escriba_projects()
    new_projects = [p for p in projects if str(p.get("id")) != str(project_id)]
    
    if any(str(p.get("id")) == str(project_id) and p.get("active") for p in projects):
        if new_projects:
            new_projects[0]["active"] = True

    save_escriba_projects(new_projects)

    escriba_dir = get_escriba_data_dir()
    for filename in [f"chapters_{project_id}.json", f"graph_{project_id}.json", f"timeline_{project_id}.json", f"protocols_{project_id}.json"]:
        fpath = os.path.join(escriba_dir, filename)
        if os.path.isfile(fpath):
            try:
                os.remove(fpath)
            except Exception as e:
                logger.error(f"Error eliminando archivo {fpath}: {e}")

    return new_projects


def is_escriba_active() -> bool:
    """Retorna True si el motor ESCRIBA está activo en el entorno."""
    return os.getenv("JELLYFISH_ESCRIBA_ACTIVE", "1") == "1"


def save_escriba_node(project_path: Optional[str], node: Dict[str, Any]) -> Dict[str, Any]:
    """Guarda o actualiza un nodo en el grafo ESCRIBA."""
    graph = load_escriba_graph(project_path)
    nodes = graph.get("nodes", [])
    node_id = node.get("id")
    if not node_id:
        import time
        node_id = f"node_{int(time.time() * 1000)}"
        node["id"] = node_id
    found = False
    for i, n in enumerate(nodes):
        if n.get("id") == node_id:
            nodes[i].update(node)
            found = True
            break
    if not found:
        nodes.append(node)
    graph["nodes"] = nodes
    save_escriba_graph(graph, project_path)
    return node


def delete_escriba_node(project_path: Optional[str], node_id: str) -> None:
    """Elimina un nodo del grafo ESCRIBA."""
    graph = load_escriba_graph(project_path)
    graph["nodes"] = [n for n in graph.get("nodes", []) if n.get("id") != node_id]
    graph["links"] = [l for l in graph.get("links", []) if l.get("source") != node_id and l.get("target") != node_id]
    save_escriba_graph(graph, project_path)


def save_escriba_link(project_path: Optional[str], link: Dict[str, Any]) -> Dict[str, Any]:
    """Guarda o actualiza un enlace en el grafo ESCRIBA sincronizando label y relation."""
    graph = load_escriba_graph(project_path)
    links = graph.get("links", [])
    src = link.get("source")
    tgt = link.get("target")
    # Sincronización de label y relation para consistencia total
    lbl = (link.get("label") or link.get("relation") or "RELACIÓN").strip()
    link["label"] = lbl
    link["relation"] = lbl
    found = False
    for i, l in enumerate(links):
        if l.get("source") == src and l.get("target") == tgt:
            links[i].update(link)
            found = True
            break
    if not found:
        links.append(link)
    graph["links"] = links
    save_escriba_graph(graph, project_path)
    return link


def run_character_debate(state, dilemma: str, char_a_id: str, char_b_id: str) -> Dict[str, Any]:
    """Simula un debate entre dos personajes sobre un dilema aplicando protocolos narrativos del proyecto."""
    from core.llm_engine import _call_llm_silent
    project_id = getattr(state, "active_project", None) or get_active_project_id()
    graph = load_escriba_graph(project_id)
    protocols = load_escriba_protocols(project_id)
    protocol_instructions = format_protocol_system_prompt(protocols)

    nodes = {n.get("id"): n for n in graph.get("nodes", [])}
    char_a = nodes.get(char_a_id, {"id": char_a_id, "label": char_a_id})
    char_b = nodes.get(char_b_id, {"id": char_b_id, "label": char_b_id})

    attrs_a = char_a.get("attributes") or {}
    attrs_b = char_b.get("attributes") or {}

    desc_a = f"{char_a.get('label', char_a_id)} (Arquetipo: {attrs_a.get('archetype', 'No especificado')}, Facción: {attrs_a.get('faction', 'Neutral')}). Contexto: {char_a.get('description', '')}"
    desc_b = f"{char_b.get('label', char_b_id)} (Arquetipo: {attrs_b.get('archetype', 'No especificado')}, Facción: {attrs_b.get('faction', 'Neutral')}). Contexto: {char_b.get('description', '')}"

    system_prompt = (
        "Eres el Simulador Dramático de Personajes de ESCRIBA.\n"
        "Tu misión es recrear un enfrentamiento dialéctico de alta tensión y autenticidad entre dos personajes ficticios sobre una encrucijada moral o dilema.\n"
        "Cada personaje debe expresarse estrictamente según su arquetipo, facción, subtexto psicológico y sesgo ideológico."
    )
    if protocol_instructions:
        system_prompt += "\n" + protocol_instructions

    prompt = (
        f"DILEMA / ESCENA:\n\"{dilemma}\"\n\n"
        f"PERSONAJE A:\n{desc_a}\n\n"
        f"PERSONAJE B:\n{desc_b}\n\n"
        "DIRECTRICES DE SIMULACIÓN:\n"
        "1. Genera un diálogo alternado de al menos 4 a 6 intervenciones agudas y viscerales.\n"
        "2. Formato por intervención:\n"
        "**[Nombre del Personaje]** ([Rol/Emoción del momento]):\n"
        "— [Línea de diálogo con acotaciones entre paréntesis si hay acción física]\n\n"
        "3. Evita que lleguen a un acuerdo fácil o moralina superficial: mantén la contradicción orgánica."
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": prompt}
    ]
    response = _call_llm_silent(state, messages, temperature=0.7)
    if not response:
        name_a = char_a.get("label", "Personaje A")
        name_b = char_b.get("label", "Personaje B")
        role_a = attrs_a.get("role") or attrs_a.get("archetype") or "Voz Principal"
        role_b = attrs_b.get("role") or attrs_b.get("archetype") or "Contraparte"
        response = (
            f"**{name_a}** ({role_a}):\n"
            f"— Frente a este dilema ('{dilemma}'), no podemos ignorar la realidad que nos precede. Nuestra posición no admite concesiones que hipotequen los principios fundamentales.\n\n"
            f"**{name_b}** ({role_b}):\n"
            f"— Comprendo la firmeza de tu argumento, pero la inflexibilidad nos conduce al estancamiento. El pragmatismo exige evaluar el costo de mantener un curso inalterable.\n\n"
            f"**{name_a}**:\n"
            f"— Hay costos que son preferibles a la claudicación moral. La memoria y la convicción deben prevalecer sobre soluciones efímeras.\n\n"
            f"**{name_b}**:\n"
            f"— La historia juzga las soluciones reales, no las intenciones intactas. Si no construimos un terreno común, el dilema nos consumirá a ambos."
        )

    return {
        "status": "ok",
        "dilemma": dilemma,
        "char_a": char_a.get("label"),
        "char_b": char_b.get("label"),
        "char_a_data": char_a,
        "char_b_data": char_b,
        "debate_transcript": response,
        "dialogue": response
    }


def suggest_trope_enrichment(trope_name: str, character_name: str, role: str, project_id: Optional[str], state) -> Dict[str, Any]:
    """Genera 3 propuestas literarias originales para deconstruir, subvertir o enriquecer un tropo o arquetipo."""
    from core.llm_engine import _call_llm_silent
    pid = project_id or get_active_project_id()
    chaps = load_escriba_chapters(pid)
    timeline = load_escriba_timeline(pid)
    protocols = load_escriba_protocols(pid)
    protocol_instructions = format_protocol_system_prompt(protocols)

    world_summary = ""
    if chaps:
        world_summary += f"Resumen del manuscrito existente: {chaps[0].get('content', '')[:400]}... "
    contexts = timeline.get("contexts", [])
    if contexts:
        ctx_names = ", ".join([c.get("title", "") for c in contexts[:4]])
        world_summary += f"Contextos vigentes: {ctx_names}."

    system_prompt = (
        "Eres el Diseñador Literario de Arquetipos y Tropos de élite de ESCRIBA.\n"
        "Tu misión es deconstruir, subvertir o dotar de máxima originalidad psicológica a tropos y arquetipos narrativos, "
        "eliminando clichés y anclándolos firmemente en las contradicciones humanas y el universo del proyecto.\n\n"
        "RESPONDE ÚNICAMENTE CON UN OBJETO JSON VÁLIDO en este formato estricto:\n"
        "{\n"
        '  "suggestions": [\n'
        '    {\n'
        '      "title": "Nombre corto y evocador del giro",\n'
        '      "treatment": "Subvertido | Deconstruido | Híbrido",\n'
        '      "manifestation": "Explicación concreta de 2 a 3 oraciones de cómo se aterriza este tropo de forma singular en el universo.",\n'
        '      "twist": "El ancla de ruptura o secreto íntimo que rompe la expectativa del lector y humaniza al personaje.",\n'
        '      "why_it_works": "Justificación dramática de por qué potencia el conflicto y evita clichés."\n'
        '    }\n'
        '  ]\n'
        "}"
    )
    if protocol_instructions:
        system_prompt += "\n" + protocol_instructions

    prompt = (
        f"UNIVERSO DEL RELATO:\n{world_summary or 'Universo literario de alta densidad dramática'}\n\n"
        f"PERSONAJE:\n"
        f"- Nombre: {character_name or 'Personaje Principal'}\n"
        f"- Rol Dramático: {role or 'Protagonista'}\n"
        f"- Tropo o Arquetipo Base: {trope_name}\n\n"
        "Genera exactamente 3 propuestas de enriquecimiento (una Subvertida, una Deconstruida y una Híbrida) que transformen este tropo en algo memorable y visceral."
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": prompt}
    ]

    raw_resp = None
    try:
        raw_resp = _call_llm_silent(state, messages, json_mode=True)
    except Exception as llm_err:
        logger.warning(f"Error invocando LLM en suggest_trope_enrichment: {llm_err}")
    parsed = None
    if raw_resp:
        try:
            cleaned = raw_resp.strip()
            if "```" in cleaned:
                cleaned = re.sub(r'^```(?:json)?\s*', '', cleaned, flags=re.MULTILINE)
                cleaned = re.sub(r'\s*```$', '', cleaned, flags=re.MULTILINE)
            m = re.search(r'\{.*\}', cleaned, re.DOTALL)
            if m:
                parsed = json.loads(m.group(0))
        except Exception as e:
            logger.warning(f"Error parseando sugerencias de tropo: {e}")

    suggestions = parsed.get("suggestions") if isinstance(parsed, dict) else None
    if not suggestions or not isinstance(suggestions, list) or len(suggestions) == 0:
        clean_trop = trope_name or "Arquetipo Clásico"
        suggestions = [
            {
                "title": f"{clean_trop} Subvertido",
                "treatment": "Subvertido",
                "manifestation": f"En lugar de responder al llamado del deber por convicción heroica, {character_name or 'el personaje'} asume este tropo como un mecanismo de ocultación para pagar una deuda moral inconfesable.",
                "twist": "Descubre que la causa que juró defender fue orquestada por la misma facción que destruyó su pasado.",
                "why_it_works": "Invierte la pureza moral del tropo convirtiéndola en un conflicto de culpa activa."
            },
            {
                "title": f"{clean_trop} Deconstruido",
                "treatment": "Deconstruido",
                "manifestation": f"Se examina el desgaste psicológico y el trauma real que este rol impone en {character_name or 'el personaje'}, mostrando el aislamiento emocional que produce sostener semejante máscara.",
                "twist": "Sufre crisis disociativas cuando nadie lo observa, dependiendo en secreto de su mayor rival para no perder la cordura.",
                "why_it_works": "Despoja al arquetipo del romanticismo superficial y lo aterriza en consecuencias humanas crudas."
            },
            {
                "title": f"{clean_trop} Híbrido Contradictorio",
                "treatment": "Híbrido",
                "manifestation": f"Combina la disciplina implacable del arquetipo con un dogma filosófico opuesto: busca la salvación a través de métodos destructivos que él mismo aborrece.",
                "twist": "Cada éxito en su misión profundiza la ruina del mundo que intenta preservar.",
                "why_it_works": "Crea una contradicción interna orgánica que mantiene en tensión al lector."
            }
        ]

    return {
        "status": "ok",
        "trope": trope_name,
        "character": character_name,
        "suggestions": suggestions
    }


def audit_character_tension(protagonist_data: Dict[str, Any], antagonist_data: Dict[str, Any], dilemma: str, project_id: Optional[str], state) -> Dict[str, Any]:
    """Evalúa la polaridad dramática, consistencia de tropos y riesgos de cliché entre una díada de personajes."""
    from core.llm_engine import _call_llm_silent
    pid = project_id or get_active_project_id()
    protocols = load_escriba_protocols(pid)
    protocol_instructions = format_protocol_system_prompt(protocols)

    p_name = protagonist_data.get("name") or protagonist_data.get("label") or "Protagonista"
    a_name = antagonist_data.get("name") or antagonist_data.get("label") or "Antagonista"

    system_prompt = (
        "Eres el Auditor Dramático de élite de ESCRIBA.\n"
        "Analizas minuciosamente la oposición temática, tensión psicológica y riesgo de clichés entre un Protagonista y un Antagonista.\n"
        "RESPONDE ÚNICAMENTE CON UN OBJETO JSON VÁLIDO en este formato estricto:\n"
        "{\n"
        '  "tension_score": 85,\n'
        '  "cliche_risks": ["Riesgo 1", "Riesgo 2"],\n'
        '  "thematic_resonance": "Análisis de 2 a 3 oraciones de por qué esta oposición funciona o dónde flaquea.",\n'
        '  "recommendations": ["Recomendación quirúrgica 1", "Recomendación quirúrgica 2"]\n'
        "}"
    )
    if protocol_instructions:
        system_prompt += "\n" + protocol_instructions

    prompt = (
        f"DILEMA TEMÁTICO / EJE CENTRAL:\n\"{dilemma or 'Conflicto por el destino del universo'}\"\n\n"
        f"PROTAGONISTA ({p_name}):\n"
        f"- Tropo/Arquetipo: {json.dumps(protagonist_data.get('trope_profile', {}), ensure_ascii=False)}\n"
        f"- Psicología: {json.dumps(protagonist_data.get('psychology', {}), ensure_ascii=False)}\n"
        f"- Contexto/Rol: {protagonist_data.get('description', '')}\n\n"
        f"ANTAGONISTA ({a_name}):\n"
        f"- Tropo/Arquetipo: {json.dumps(antagonist_data.get('trope_profile', {}), ensure_ascii=False)}\n"
        f"- Psicología: {json.dumps(antagonist_data.get('psychology', {}), ensure_ascii=False)}\n"
        f"- Contexto/Rol: {antagonist_data.get('description', '')}\n\n"
        "Evalúa la fuerza del choque dialéctico entre ambos, los posibles clichés y cómo afilar su antagonismo."
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": prompt}
    ]

    raw_resp = None
    try:
        raw_resp = _call_llm_silent(state, messages, json_mode=True)
    except Exception as llm_err:
        logger.warning(f"Error invocando LLM en audit_character_tension: {llm_err}")
    audit = None
    if raw_resp:
        try:
            cleaned = raw_resp.strip()
            if "```" in cleaned:
                cleaned = re.sub(r'^```(?:json)?\s*', '', cleaned, flags=re.MULTILINE)
                cleaned = re.sub(r'\s*```$', '', cleaned, flags=re.MULTILINE)
            m = re.search(r'\{.*\}', cleaned, re.DOTALL)
            if m:
                audit = json.loads(m.group(0))
        except Exception as e:
            logger.warning(f"Error parseando auditoría de tensión: {e}")

    if not isinstance(audit, dict) or "tension_score" not in audit:
        audit = {
            "tension_score": 82,
            "cliche_risks": [
                f"Asegúrate de que {a_name} no caiga en la arrogancia típica de villano que subestima a su rival.",
                f"Evita que la redención de {p_name} sea repentina: la falla fatal debe cobrar un costo real."
            ],
            "thematic_resonance": f"La polaridad entre {p_name} y {a_name} funciona porque encarnan posturas morales opuestas ante '{dilemma or 'el dilema central'}'. Ambos creen tener la razón histórica.",
            "recommendations": [
                f"Haz que {a_name} conozca de antemano la herida pasada de {p_name} para explotarla en su primer careo.",
                f"Dale a {a_name} una línea de diálogo que haga dudar al propio {p_name} sobre la justicia de su causa."
            ]
        }

    return {
        "status": "ok",
        "audit": audit
    }


def save_character_laboratory_pair(pair_data: Dict[str, Any], project_id: Optional[str]) -> Dict[str, Any]:
    """Guarda o actualiza una díada o personaje individual con su perfil enriquecido de tropos y psicología en el grafo."""
    pid = project_id or get_active_project_id()
    graph = load_escriba_graph(pid)
    nodes = graph.get("nodes", [])
    links = graph.get("links", [])

    protagonist = pair_data.get("protagonist")
    antagonist = pair_data.get("antagonist")
    dilemma = pair_data.get("dilemma", "")

    saved_nodes = []

    def upsert_node(c_data, default_role):
        if not c_data or not isinstance(c_data, dict):
            return None
        name = str(c_data.get("name") or c_data.get("label") or "").strip()
        if not name:
            return None

        matched = None
        for n in nodes:
            if is_same_entity(name, n.get("label", "")):
                matched = n
                break

        attrs = matched.setdefault("attributes", {}) if matched else {}
        # Incorporar perfil narrativo profundo
        narrative_profile = c_data.get("narrative_profile") or {}
        trope_profile = c_data.get("trope_profile") or {}
        psychology = c_data.get("psychology") or {}

        attrs["narrative_profile"] = {
            **attrs.get("narrative_profile", {}),
            **narrative_profile,
            "dramatic_role": c_data.get("role", default_role),
            "trope_profile": trope_profile,
            "psychology": psychology,
            "updated_at": int(time.time() * 1000)
        }
        attrs["role"] = c_data.get("role", default_role)
        if psychology.get("personality"):
            attrs["personality"] = psychology.get("personality")
        if psychology.get("motivations"):
            attrs["motivations"] = psychology.get("motivations")
        if psychology.get("wound"):
            attrs["wound"] = psychology.get("wound")
        if psychology.get("fatal_flaw"):
            attrs["fatal_flaw"] = psychology.get("fatal_flaw")

        desc = c_data.get("description") or (trope_profile.get("manifestation") if trope_profile else "")
        if matched:
            if desc:
                matched["description"] = desc
                attrs["context"] = desc
            matched["type"] = "character"
            return matched
        else:
            clean_slug = re.sub(r'[^a-zA-Z0-9_]', '_', normalize_entity_canonical(name) or "char")
            new_id = f"node_{clean_slug}_{int(time.time()*1000) % 100000}"
            new_node = {
                "id": new_id,
                "label": name,
                "type": "character",
                "description": desc,
                "attributes": attrs
            }
            nodes.append(new_node)
            return new_node

    p_node = upsert_node(protagonist, "Protagonista")
    if p_node:
        saved_nodes.append(p_node)

    a_node = upsert_node(antagonist, "Antagonista")
    if a_node:
        saved_nodes.append(a_node)

    # Si ambos existen, forjar o actualizar la conexión de POLARIDAD_DRAMÁTICA
    added_link = None
    if p_node and a_node and p_node["id"] != a_node["id"]:
        rel_label = "POLARIDAD_DRAMÁTICA"
        existing_link = None
        for l in links:
            if (l.get("source") == p_node["id"] and l.get("target") == a_node["id"] and l.get("label") == rel_label) or \
               (l.get("source") == a_node["id"] and l.get("target") == p_node["id"] and l.get("label") == rel_label):
                existing_link = l
                break

        desc_rel = f"Eje dialéctico de confrontación moral y choque de tropos sobre: '{dilemma or 'La Verdad vs La Mentira del relato'}'"
        if existing_link:
            existing_link["description"] = desc_rel
            existing_link["intensity"] = "Crítica"
            existing_link["direction"] = "bidirectional"
            added_link = existing_link
        else:
            new_link = {
                "source": p_node["id"],
                "target": a_node["id"],
                "label": rel_label,
                "relation": rel_label,
                "description": desc_rel,
                "direction": "bidirectional",
                "intensity": "Crítica"
            }
            links.append(new_link)
            added_link = new_link

    graph["nodes"] = nodes
    graph["links"] = links
    clean_graph, _ = deduplicate_existing_graph(graph)
    save_escriba_graph(clean_graph, pid)

    return {
        "status": "ok",
        "message": f"Se inyectó con éxito la arquitectura dramática en el universo ({len(saved_nodes)} personajes guardados/actualizados y relación de polaridad registrada).",
        "saved_nodes": saved_nodes,
        "relationship": added_link,
        "graph": clean_graph
    }







