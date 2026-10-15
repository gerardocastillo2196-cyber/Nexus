"""core/escriba_engine.py — Motor Integrado de ESCRIBA para Jellyfish OS.

Incorpora de forma nativa la lógica de inteligencia narrativa, prompts de worldbuilding,
análisis de grafos semánticos, simulación de efecto dominó y auditoría de trama
tomados directamente del proyecto ESCRIBA.
"""

import os
import json
import logging
from typing import List, Dict, Any, Optional

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


def get_graph_extraction_system_prompt(context_items_str: str = "") -> str:
    return (
        "Eres un Arquitecto Narrativo experto. Tu objetivo es analizar textos literarios y "
        "extraer una estructura de grafo semántico optimizado."
        "\n\nINSTRUCCIONES:"
        "\n1. Identifica las ENTIDADES principales (Personajes, Lugares, Facciones, Eventos Clave)."
        "\n2. Para cada entidad, infiere ATRIBUTOS basándote en el texto."
        "\n3. RELACIONES semánticas (ej: FAMILY, FRIEND, ENEMY, LOCATED_IN)."
        "\n\nSALIDA JSON ESTRICTA:"
        "\n{"
        "\n  \"entities\": ["
        "\n    {"
        "\n       \"name\": \"Nombre\","
        "\n       \"type\": \"character|location|faction|event\","
        "\n       \"context\": \"breve descripción\","
        "\n       \"suggested_attributes\": {"
        "\n         \"related_analysis_ids\": [],"
        "\n         \"hierarchy\": 3"
        "\n       }"
        "\n    }"
        "\n  ],"
        "\n  \"relationships\": ["
        "\n    { \"source\": \"Name1\", \"target\": \"Name2\", \"label\": \"RELATION\" }"
        "\n  ]"
        "\n}"
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


# ── Funciones Principales de Ejecución del Motor ESCRIBA ───────

def execute_escriba_task(mode: str, text: str, state, extra_params: Dict[str, Any] = None) -> Dict[str, Any]:
    """Ejecuta una acción del motor ESCRIBA utilizando el motor LLM activo de Jellyfish."""
    from core.llm_engine import _call_llm_silent
    extra_params = extra_params or {}

    if mode == "extract_graph":
        system_prompt = get_graph_extraction_system_prompt(extra_params.get("context_str", ""))
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": text or "Analiza las entidades del texto."}
        ]
        raw_resp = _call_llm_silent(state, messages)
        try:
            cleaned = raw_resp.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:-3].strip()
            data = json.loads(cleaned)
            return {"status": "ok", "mode": mode, "data": data}
        except Exception:
            return {"status": "ok", "mode": mode, "raw_response": raw_resp}

    elif mode == "simulate_domino":
        target_label = extra_params.get("target_label", "Personaje/Facción")
        context_lines = extra_params.get("context_lines", [])
        event_text = extra_params.get("event_text", text)
        system_prompt = get_domino_simulation_prompt(target_label, context_lines, event_text)
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Simula el evento hipotético: '{event_text}' para '{target_label}'."}
        ]
        raw_resp = _call_llm_silent(state, messages)
        try:
            cleaned = raw_resp.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:-3].strip()
            data = json.loads(cleaned)
            return {"status": "ok", "mode": mode, "domino": data}
        except Exception:
            return {"status": "ok", "mode": mode, "report": raw_resp}

    elif mode == "historical_analysis":
        graph_context = extra_params.get("graph_context", text)
        selected_modules = extra_params.get("selected_modules", None)
        system_prompt = get_historical_analysis_prompt(graph_context, selected_modules)
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": "Genera el análisis histórico y geopolítico completo."}
        ]
        response = _call_llm_silent(state, messages)
        return {"status": "ok", "mode": mode, "analysis": response}

    elif mode == "suggest_voids":
        factions = extra_params.get("factions", [])
        isolated_chars = extra_params.get("isolated_chars", [])
        system_prompt = get_voids_suggestion_prompt(factions, isolated_chars)
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": text or "Busca vacíos narrativos."}
        ]
        response = _call_llm_silent(state, messages)
        return {"status": "ok", "mode": mode, "suggestions": response}

    elif mode == "plot_audit":
        system_prompt = get_plot_audit_prompt()
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": text or "Audita el manuscrito completo del proyecto."}
        ]
        response = _call_llm_silent(state, messages)
        return {"status": "ok", "mode": mode, "audit_report": response}

    else:
        system_prompt = f"Eres el motor ESCRIBA. Realiza un análisis narrativo especializado en {mode}."
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": text}
        ]
        response = _call_llm_silent(state, messages)
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


def load_escriba_graph(project_path: Optional[str] = None) -> Dict[str, Any]:
    """Carga los datos del grafo de entidades y relaciones de ESCRIBA."""
    file_path = get_escriba_storage_file(project_path)
    if os.path.isfile(file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict) and "nodes" in data and "links" in data:
                    return data
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
    """Extrae entidades y relaciones del manuscrito del proyecto usando el motor ESCRIBA y actualiza el grafo."""
    import time
    import re

    pid = project_id or get_active_project_id()
    chaps = load_escriba_chapters(pid)
    if not chaps:
        return {"status": "error", "message": "No hay capítulos en el Canva ni en el manuscrito para extraer el grafo."}

    manuscript_parts = []
    for c in chaps:
        t = c.get("title", "Capítulo")
        cnt = c.get("content", "").strip()
        if cnt:
            manuscript_parts.append(f"### {t}\n{cnt}")

    if not manuscript_parts:
        return {"status": "error", "message": "Los capítulos del manuscrito están vacíos. Escribe o importa texto primero."}

    full_text = "\n\n".join(manuscript_parts)

    task_res = execute_escriba_task("extract_graph", full_text, state)
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

    current_graph = load_escriba_graph(pid)
    nodes = current_graph.get("nodes", [])
    links = current_graph.get("links", [])

    existing_node_labels = {n.get("label", "").strip().lower(): n for n in nodes}
    existing_node_ids = {n.get("id"): n for n in nodes}

    name_to_id = {}
    for n in nodes:
        name_to_id[n.get("label", "").strip().lower()] = n.get("id")
        name_to_id[n.get("id")] = n.get("id")

    added_nodes = 0
    for ent in extracted_entities:
        name = ent.get("name", "").strip()
        if not name:
            continue
        norm_name = name.lower()
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

        if norm_name in existing_node_labels:
            existing = existing_node_labels[norm_name]
            existing["attributes"] = {**existing.get("attributes", {}), **attrs}
            if not existing.get("type"):
                existing["type"] = node_type
            name_to_id[norm_name] = existing["id"]
        else:
            clean_slug = re.sub(r'[^a-zA-Z0-9_]', '_', norm_name)
            new_id = f"node_{clean_slug}_{int(time.time()*1000) % 100000}"
            new_node = {
                "id": new_id,
                "label": name,
                "type": node_type,
                "attributes": attrs
            }
            nodes.append(new_node)
            existing_node_labels[norm_name] = new_node
            name_to_id[norm_name] = new_id
            added_nodes += 1

    added_links = 0
    existing_links_set = {(str(l.get("source")), str(l.get("target")), str(l.get("label"))) for l in links}

    for rel in extracted_relationships:
        src_name = str(rel.get("source", "")).strip().lower()
        tgt_name = str(rel.get("target", "")).strip().lower()
        rel_label = str(rel.get("label", "RELACIÓN")).upper().strip()

        src_id = name_to_id.get(src_name, src_name)
        tgt_id = name_to_id.get(tgt_name, tgt_name)

        if src_id and tgt_id and src_id != tgt_id:
            link_key = (src_id, tgt_id, rel_label)
            rev_key = (tgt_id, src_id, rel_label)
            if link_key not in existing_links_set and rev_key not in existing_links_set:
                new_link = {
                    "source": src_id,
                    "target": tgt_id,
                    "label": rel_label
                }
                links.append(new_link)
                existing_links_set.add(link_key)
                added_links += 1

    current_graph["nodes"] = nodes
    current_graph["links"] = links
    save_escriba_graph(current_graph, pid)

    return {
        "status": "ok",
        "message": f"Se extrajeron {len(extracted_entities)} entidades ({added_nodes} nuevas) y {added_links} relaciones desde el manuscrito.",
        "nodes_added": added_nodes,
        "links_added": added_links,
        "total_nodes": len(nodes),
        "total_links": len(links),
        "graph": current_graph
    }


def analyze_nexus_intersections(graph_data: Dict[str, Any], lens_ids: List[str]) -> List[Dict[str, Any]]:
    """Calcula instantáneamente las entidades en la intersección de múltiples Lentes Narrativos (Nexo)."""
    if not lens_ids:
        return []

    nodes = graph_data.get("nodes", [])
    links = graph_data.get("links", [])

    lens_node_map = {}
    for lid in lens_ids:
        connected = set()
        for link in links:
            if link.get("source") == lid:
                connected.add(link.get("target"))
            elif link.get("target") == lid:
                connected.add(link.get("source"))
        for node in nodes:
            rel_ids = node.get("attributes", {}).get("related_analysis_ids", [])
            if lid in rel_ids:
                connected.add(node["id"])
        lens_node_map[lid] = connected

    intersection_ids = None
    for lid, connected in lens_node_map.items():
        if intersection_ids is None:
            intersection_ids = set(connected)
        else:
            intersection_ids = intersection_ids.intersection(connected)

    if not intersection_ids:
        return []

    return [n for n in nodes if n["id"] in intersection_ids and n["id"] not in lens_ids]


# ── Gestión de Proyectos y Capítulos Narrativos ──────────────────

DEFAULT_PROJECTS = []
DEFAULT_CHAPTERS = []


def load_escriba_projects() -> List[Dict[str, Any]]:
    file_path = os.path.join(get_escriba_data_dir(), "projects.json")
    if os.path.isfile(file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    return data
        except Exception as e:
            logger.error(f"Error leyendo proyectos: {e}")
            return []
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
        return projects
    return []


def save_escriba_projects(projects: List[Dict[str, Any]]) -> None:
    file_path = os.path.join(get_escriba_data_dir(), "projects.json")
    try:
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(projects, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logger.error(f"Error guardando proyectos: {e}")


def load_escriba_chapters(project_id: Optional[str] = None) -> List[Dict[str, Any]]:
    pid = project_id if (project_id and project_id != "proj-1") else get_active_project_id()
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
    file_path = os.path.join(get_escriba_data_dir(), f"chapters_{pid}.json")
    try:
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(chapters, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logger.error(f"Error guardando capítulos de {pid}: {e}")


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

    # Si la obra generada supera el tamano maximo por fragmento, dividir en sub-fragmentos
    chunks = split_content_into_fragments(content, max_fragment_chars)
    if len(chunks) > 1:
        base_title = chap_data.get("title", "Capitulo")
        chap_data["content"] = chunks[0]
        chap_data["wordCount"] = len(chunks[0].split())
        base_id = chap_id if chap_id else f"chap_{int(time.time() * 1000)}"
        chap_data["id"] = base_id

        # Actualizar o insertar fragmento 1
        found = False
        for i, c in enumerate(chapters):
            if c.get("id") == base_id:
                chapters[i].update(chap_data)
                found = True
                break
        if not found:
            chapters.append(chap_data)

        # Insertar fragmentos subsiguientes (Parte 2, Parte 3, etc.)
        for idx, chunk in enumerate(chunks[1:], start=2):
            sub_id = f"{base_id}_frag_{idx}"
            sub_title = f"{base_title} (Parte {idx})"
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
                chapters[i].update(chap_data)
                found = True
                break
        if not found:
            chapters.append(chap_data)
    else:
        new_id = f"chap_{int(time.time() * 1000)}"
        chap_data["id"] = new_id
        chapters.append(chap_data)

    save_escriba_chapters(project_id, chapters)
    return chapters

    if chap_id:
        found = False
        for i, c in enumerate(chapters):
            if c.get("id") == chap_id:
                chapters[i].update(chap_data)
                found = True
                break
        if not found:
            chapters.append(chap_data)
    else:
        new_id = f"chap_{int(time.time() * 1000)}"
        chap_data["id"] = new_id
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
    for filename in [f"chapters_{project_id}.json", f"graph_{project_id}.json"]:
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
    """Guarda o actualiza un enlace en el grafo ESCRIBA."""
    graph = load_escriba_graph(project_path)
    links = graph.get("links", [])
    src = link.get("source")
    tgt = link.get("target")
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
    """Simula un debate entre dos personajes sobre un dilema."""
    from core.llm_engine import _call_llm_silent
    graph = load_escriba_graph(state.active_project)
    nodes = {n.get("id"): n for n in graph.get("nodes", [])}
    char_a = nodes.get(char_a_id, {"id": char_a_id, "label": char_a_id})
    char_b = nodes.get(char_b_id, {"id": char_b_id, "label": char_b_id})

    prompt = (
        f"Simula un debate intenso entre dos personajes sobre este dilema: '{dilemma}'.\n"
        f"Personaje A: {char_a.get('label', char_a_id)} ({char_a.get('description', '')})\n"
        f"Personaje B: {char_b.get('label', char_b_id)} ({char_b.get('description', '')})\n\n"
        "Genera un diálogo alternado de 4 intervenciones manteniendo la postura de cada personaje."
    )
    messages = [{"role": "user", "content": prompt}]
    response = _call_llm_silent(state, messages)
    return {
        "dilemma": dilemma,
        "char_a": char_a.get("label"),
        "char_b": char_b.get("label"),
        "debate_transcript": response
    }





