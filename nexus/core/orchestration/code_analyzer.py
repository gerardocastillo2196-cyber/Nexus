"""core.orchestration.code_analyzer — Análisis programático de código sin LLM.

Extrae metadatos estructurados (clases, funciones, imports, endpoints)
de archivos de código usando ast (Python) y expresiones regulares
(JS, TS, Dart, Java, Go, HTML, CSS, etc.).

Beneficio: Genera resúmenes técnicos para DEVELOPMENT_LOG.md sin
consumir un solo token del LLM.

Referencia de acoplamiento:
    - core/orchestration/task_runner.py → llama analyze_file() tras cada tarea
    - DEVELOPMENT_LOG.md → recibe la estructura extraída como bitácora
"""

import ast
import os
import re
import logging
from typing import Optional

logger = logging.getLogger("jellyfish.orchestration.code_analyzer")


def analyze_file(filepath: str) -> dict:
    """Extrae metadatos estructurados de un archivo de código.

    Usa ast.parse() para Python y expresiones regulares para otros
    lenguajes. No consume tokens del LLM.

    Args:
        filepath: Ruta absoluta al archivo de código.

    Returns:
        Diccionario con claves:
        - language: str (python, javascript, typescript, dart, java, etc.)
        - classes: list[str] — nombres de clases definidas
        - functions: list[str] — nombres de funciones/métodos definidos
        - imports: list[str] — módulos importados
        - endpoints: list[str] — rutas de API detectadas
        - error: Optional[str] — mensaje de error si el análisis falla
    """
    result = {
        "language": "unknown",
        "classes": [],
        "functions": [],
        "imports": [],
        "endpoints": [],
        "error": None,
    }

    if not os.path.isfile(filepath):
        result["error"] = f"Archivo no encontrado: {filepath}"
        return result

    ext = os.path.splitext(filepath)[1].lower()

    try:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
    except (OSError, IOError) as e:
        result["error"] = str(e)
        return result

    if not content.strip():
        result["error"] = "Archivo vacío"
        return result

    if ext == ".py":
        return _analyze_python(content, result)
    elif ext in (".js", ".jsx", ".mjs"):
        return _analyze_javascript(content, result, "javascript")
    elif ext in (".ts", ".tsx"):
        return _analyze_javascript(content, result, "typescript")
    elif ext == ".dart":
        return _analyze_dart(content, result)
    elif ext in (".java", ".kt"):
        return _analyze_java_kotlin(content, result, "java" if ext == ".java" else "kotlin")
    elif ext == ".go":
        return _analyze_go(content, result)
    elif ext in (".html", ".htm"):
        return _analyze_html(content, result)
    elif ext == ".css":
        return _analyze_css(content, result)
    else:
        # Fallback genérico: intentar detectar definiciones
        return _analyze_generic(content, result, ext)


def _analyze_python(content: str, result: dict) -> dict:
    """Análisis de Python usando la biblioteca estándar ast."""
    result["language"] = "python"
    try:
        tree = ast.parse(content)
    except SyntaxError as e:
        result["error"] = f"SyntaxError: {e}"
        # Intentar extraer algo por regex incluso con errores de sintaxis
        result["classes"] = re.findall(r'^class\s+(\w+)', content, re.MULTILINE)
        result["functions"] = re.findall(r'^def\s+(\w+)', content, re.MULTILINE)
        return result

    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef):
            result["classes"].append(node.name)
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            # Solo funciones top-level y métodos de primer nivel
            result["functions"].append(node.name)
        elif isinstance(node, ast.Import):
            for alias in node.names:
                result["imports"].append(alias.name)
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                result["imports"].append(node.module)

    # Detectar endpoints Flask/FastAPI/Django
    endpoint_patterns = [
        r'@app\.\w+\(["\']([^"\']+)',        # Flask/FastAPI: @app.get("/path")
        r'@router\.\w+\(["\']([^"\']+)',      # FastAPI router
        r"path\(['\"]([^'\"]+)",              # Django: path("url/")
        r"url\(['\"]([^'\"]+)",              # Django legacy
    ]
    for pattern in endpoint_patterns:
        result["endpoints"].extend(re.findall(pattern, content))

    # Deduplicar
    result["imports"] = list(dict.fromkeys(result["imports"]))
    return result


def _analyze_javascript(content: str, result: dict, lang: str) -> dict:
    """Análisis de JavaScript/TypeScript con regex."""
    result["language"] = lang

    # Clases
    result["classes"] = re.findall(r'class\s+(\w+)', content)

    # Funciones (declaraciones, exports, arrow functions con nombre)
    func_patterns = [
        r'function\s+(\w+)',                          # function name()
        r'(?:export\s+)?(?:async\s+)?function\s+(\w+)',  # export function
        r'(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(',  # const name = (
        r'(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\w*\s*=>\s*',  # const name = () =>
    ]
    all_funcs = set()
    for pattern in func_patterns:
        all_funcs.update(re.findall(pattern, content))
    result["functions"] = list(all_funcs)

    # Imports
    import_patterns = [
        r'import\s+.*?from\s+["\']([^"\']+)',   # import X from 'module'
        r'require\(["\']([^"\']+)',               # require('module')
    ]
    all_imports = set()
    for pattern in import_patterns:
        all_imports.update(re.findall(pattern, content))
    result["imports"] = list(all_imports)

    # Endpoints (Express, Koa, Hono, etc.)
    endpoint_patterns = [
        r'(?:app|router)\.(get|post|put|patch|delete)\(["\']([^"\']+)',
    ]
    for pattern in endpoint_patterns:
        matches = re.findall(pattern, content)
        result["endpoints"].extend(f"{method.upper()} {path}" for method, path in matches)

    return result


def _analyze_dart(content: str, result: dict) -> dict:
    """Análisis de Dart con regex."""
    result["language"] = "dart"

    result["classes"] = re.findall(r'class\s+(\w+)', content)

    # Funciones y métodos Dart
    func_pattern = r'(?:(?:static|async|Future|void|String|int|double|bool|List|Map|dynamic)\s+)+(\w+)\s*\('
    result["functions"] = re.findall(func_pattern, content)

    # Imports
    result["imports"] = re.findall(r"import\s+['\"]([^'\"]+)", content)

    return result


def _analyze_java_kotlin(content: str, result: dict, lang: str) -> dict:
    """Análisis de Java/Kotlin con regex."""
    result["language"] = lang

    result["classes"] = re.findall(r'(?:class|interface|enum)\s+(\w+)', content)

    # Métodos
    method_pattern = r'(?:public|private|protected|internal|static|suspend|override|fun|void|String|int|boolean|long|double)\s+(?:\w+\s+)*(\w+)\s*\('
    result["functions"] = re.findall(method_pattern, content)

    # Imports
    result["imports"] = re.findall(r'import\s+([\w.]+)', content)

    # Endpoints Spring Boot
    endpoint_patterns = [
        r'@(?:Get|Post|Put|Delete|Patch)Mapping\(["\']([^"\']+)',
        r'@RequestMapping\(["\']([^"\']+)',
    ]
    for pattern in endpoint_patterns:
        result["endpoints"].extend(re.findall(pattern, content))

    return result


def _analyze_go(content: str, result: dict) -> dict:
    """Análisis de Go con regex."""
    result["language"] = "go"

    # Structs (equivalente a clases en Go)
    result["classes"] = re.findall(r'type\s+(\w+)\s+struct', content)

    # Funciones
    result["functions"] = re.findall(r'func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)\s*\(', content)

    # Imports
    result["imports"] = re.findall(r'"([\w/.-]+)"', content)

    # Endpoints (net/http, Gin, Echo, Fiber)
    endpoint_patterns = [
        r'\.(?:GET|POST|PUT|DELETE|PATCH)\(["\']([^"\']+)',
        r'HandleFunc\(["\']([^"\']+)',
        r'\.Handle\(["\']([^"\']+)',
    ]
    for pattern in endpoint_patterns:
        result["endpoints"].extend(re.findall(pattern, content))

    return result


def _analyze_html(content: str, result: dict) -> dict:
    """Análisis de HTML con regex."""
    result["language"] = "html"

    # Tags principales
    result["classes"] = re.findall(r'id=["\']([^"\']+)', content)
    # Clases CSS usadas
    css_classes = re.findall(r'class=["\']([^"\']+)', content)
    result["functions"] = list(set(
        cls for classes_str in css_classes
        for cls in classes_str.split()
    ))[:20]  # Limitar para no sobrecargar

    # Scripts y stylesheets importados
    result["imports"] = re.findall(r'(?:src|href)=["\']([^"\']+)', content)

    return result


def _analyze_css(content: str, result: dict) -> dict:
    """Análisis de CSS con regex."""
    result["language"] = "css"

    # Selectores de clase
    result["classes"] = list(set(re.findall(r'\.([a-zA-Z_][\w-]*)\s*\{', content)))[:30]

    # IDs
    result["functions"] = list(set(re.findall(r'#([a-zA-Z_][\w-]*)\s*\{', content)))[:20]

    # @imports
    result["imports"] = re.findall(r'@import\s+["\']([^"\']+)', content)

    return result


def _analyze_generic(content: str, result: dict, ext: str) -> dict:
    """Análisis genérico con heurísticas para archivos de tipo desconocido."""
    result["language"] = ext.lstrip(".")

    # Intentar encontrar definiciones tipo class/function/def
    result["classes"] = re.findall(r'(?:class|struct|interface|type)\s+(\w+)', content)
    result["functions"] = re.findall(r'(?:function|func|def|fn|sub|proc)\s+(\w+)', content)
    result["imports"] = re.findall(r'(?:import|require|include|use)\s+["\']?([^\s"\';\n]+)', content)

    return result


def format_analysis_for_log(
    task_id: str,
    agent_name: str,
    task_desc: str,
    created_files: list[str],
    project_path: str,
    semantic_summary: str = "",
) -> str:
    """Formatea los resultados del análisis de código para DEVELOPMENT_LOG.md.

    Analiza cada archivo creado/modificado y genera una entrada Markdown
    estructurada lista para agregar a la bitácora.

    Args:
        task_id: ID de la tarea (ej: "T-003").
        agent_name: Nombre del agente que ejecutó la tarea.
        task_desc: Descripción de la tarea.
        created_files: Lista de rutas relativas de archivos creados.
        project_path: Ruta absoluta del proyecto.
        semantic_summary: Resumen semántico opcional del LLM (1 oración).

    Returns:
        Bloque Markdown listo para append a DEVELOPMENT_LOG.md.
    """
    from datetime import datetime
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")

    parts = [
        f"### [{timestamp}] {task_id} — @{agent_name}",
        f"**Tarea:** {task_desc}",
    ]

    if created_files:
        files_str = ", ".join(f"`{f}`" for f in created_files[:10])
        parts.append(f"**Archivos:** {files_str}")

    # Analizar cada archivo
    all_classes = []
    all_functions = []
    all_imports = []
    all_endpoints = []

    for rel_path in created_files:
        abs_path = os.path.join(project_path, rel_path)
        analysis = analyze_file(abs_path)

        if analysis.get("error"):
            continue

        all_classes.extend(analysis.get("classes", []))
        all_functions.extend(analysis.get("functions", []))
        all_imports.extend(analysis.get("imports", []))
        all_endpoints.extend(analysis.get("endpoints", []))

    # Deduplicar
    all_classes = list(dict.fromkeys(all_classes))
    all_functions = list(dict.fromkeys(all_functions))
    all_imports = list(dict.fromkeys(all_imports))
    all_endpoints = list(dict.fromkeys(all_endpoints))

    if all_classes or all_functions or all_imports:
        parts.append("**Estructura detectada (análisis programático):**")
        if all_classes:
            parts.append(f"- Clases: {', '.join(f'`{c}`' for c in all_classes[:15])}")
        if all_functions:
            parts.append(f"- Funciones: {', '.join(f'`{f}`' for f in all_functions[:20])}")
        if all_imports:
            parts.append(f"- Imports: {', '.join(f'`{i}`' for i in all_imports[:15])}")
        if all_endpoints:
            parts.append(f"- Endpoints: {', '.join(f'`{e}`' for e in all_endpoints[:10])}")

    if semantic_summary:
        parts.append(f"**Resumen:** {semantic_summary}")

    parts.append("")  # línea vacía al final
    return "\n".join(parts)


def _validate_dockerfile_syntax(content: str) -> tuple[bool, str]:
    lines = [line.strip() for line in content.splitlines() if line.strip() and not line.strip().startswith("#")]
    if not lines:
        return False, "Dockerfile vacio"
    
    yaml_indicators = ["version:", "services:", "image:", "build:", "volumes:"]
    for idx, line in enumerate(content.splitlines()):
        line_strip = line.strip()
        for indicator in yaml_indicators:
            if line_strip.startswith(indicator):
                return False, f"Linea {idx+1}: Se detecto sintaxis de docker-compose ('{indicator}') dentro de un Dockerfile. Un Dockerfile debe usar instrucciones como FROM, RUN, COPY, WORKDIR, etc."
    
    valid_cmds = {"from", "run", "cmd", "label", "maintainer", "expose", "env", "add", "copy", "entrypoint", "volume", "user", "workdir", "arg", "onbuild", "stopsignal", "healthcheck", "shell"}
    
    first_line_parts = lines[0].split()
    if first_line_parts:
        cmd = first_line_parts[0].lower()
        if cmd not in valid_cmds:
            return False, f"Instruccion inicial invalida o desconocida en Dockerfile: '{cmd}'. La primera instruccion debe ser 'FROM' (o 'ARG')."
            
    for idx, line in enumerate(content.splitlines()):
        line_strip = line.strip()
        if not line_strip or line_strip.startswith("#"):
            continue
        parts = line_strip.split()
        if parts:
            cmd = parts[0].lower()
            if cmd.endswith(":"):
                return False, f"Linea {idx+1}: Se detecto una clave estilo YAML ('{cmd}'), lo cual es invalido en un Dockerfile."
            # No validar continuaciones de lineas
            if idx > 0 and content.splitlines()[idx-1].strip().endswith("\\"):
                continue
            if cmd not in valid_cmds and not cmd.startswith("/") and not cmd.startswith("."):
                if cmd.isalpha() and cmd.islower():
                    return False, f"Linea {idx+1}: Instruccion de Dockerfile desconocida: '{cmd}'"
                    
    # Check for placeholder git URLs or git clone of external repos for local projects
    content_lower = content.lower()
    if "git clone" in content_lower:
        if "yourusername" in content_lower or "yourproject" in content_lower or "example.git" in content_lower:
            return False, "Se detectaron URLs de marcador de posición (ej. 'yourusername/yourproject') en el comando git clone del Dockerfile. Debes usar código real o, preferiblemente, copiar los archivos locales del proyecto usando COPY en lugar de clonar un repositorio git externo."

    return True, "OK"


def _validate_yaml_syntax(content: str) -> tuple[bool, str]:
    dockerfile_cmds = {"from", "run", "cmd", "copy", "add", "workdir", "entrypoint"}

    try:
        import yaml
        try:
            data = yaml.safe_load(content)
            if not isinstance(data, (dict, list)):
                return False, "El archivo YAML no tiene una estructura de diccionario o lista valida."
            
            if isinstance(data, dict):
                for key in data.keys():
                    if str(key).lower() in dockerfile_cmds:
                        return False, f"Se detecto la instruccion de Dockerfile '{key}' en la raiz del archivo YAML de orquestacion. No debes mezclar sintaxis de Dockerfile en docker-compose.yml."
            return True, "OK"
        except yaml.YAMLError as exc:
            # Si fallo el parseo de YAML, verificar si tiene instrucciones de Dockerfile
            for idx, line in enumerate(content.splitlines()):
                line_strip = line.strip()
                if not line_strip or line_strip.startswith("#"):
                    continue
                parts = line_strip.split()
                if parts:
                    cmd = parts[0].lower()
                    if cmd in dockerfile_cmds:
                        return False, f"Linea {idx+1}: Se detecto la instruccion de Dockerfile '{parts[0]}' en el archivo. No debes mezclar sintaxis de Dockerfile en docker-compose.yml."
            return False, f"Error de sintaxis YAML: {exc}"
    except ImportError:
        for idx, line in enumerate(content.splitlines()):
            line_strip = line.strip()
            if not line_strip or line_strip.startswith("#"):
                continue
            parts = line_strip.split()
            if parts:
                cmd = parts[0].lower()
                if cmd in dockerfile_cmds:
                    return False, f"Linea {idx+1}: Se detecto la instruccion de Dockerfile '{parts[0]}' en el archivo. No debes mezclar sintaxis de Dockerfile en docker-compose.yml."
        if "services:" not in content and "version:" not in content:
            return False, "El archivo docker-compose.yml no contiene las claves requeridas ('services:' o 'version:')."
        return True, "OK"


def _validate_cmake_syntax(content: str) -> tuple[bool, str]:
    lines = content.splitlines()
    # Check for C++ signatures in CMakeLists.txt
    cpp_signatures = [
        r'#include\s+<',
        r'#include\s+"',
        r'using\s+namespace\s+\w+;',
        r'int\s+main\s*\(',
        r'std::cout',
        r'public\s*:',
        r'private\s*:',
        r'void\s+\w+\s*\(',
    ]
    for idx, line in enumerate(lines):
        line_strip = line.strip()
        if not line_strip or line_strip.startswith("#"):
            continue
        for sig in cpp_signatures:
            if re.search(sig, line):
                return False, f"Línea {idx+1}: Se detectó sintaxis de código C++ ('{line_strip}') dentro de CMakeLists.txt. Este archivo solo debe contener comandos de configuración de CMake."
                
    # Also verify some basic structure
    content_lower = content.lower()
    cmake_keywords = ["cmake_minimum_required", "project", "add_executable", "add_library", "find_package", "target_link_libraries"]
    has_any = any(kw in content_lower for kw in cmake_keywords)
    if not has_any:
        return False, "El archivo CMakeLists.txt no parece contener ningún comando estándar de CMake (como cmake_minimum_required, project, add_executable, etc.)."
        
    return True, "OK"


def _validate_qss_syntax(content: str) -> tuple[bool, str]:
    # Check for web CSS selectors inside QSS
    web_selectors = [
        r'\bbody\b',
        r'\bhtml\b',
        r'\bdiv\b',
        r'\bspan\b',
        r'\bp\b',
        r'\binput\[',
        r'\.modal\b',
    ]
    lines = content.splitlines()
    for idx, line in enumerate(lines):
        line_strip = line.strip()
        if not line_strip or line_strip.startswith("/*") or line_strip.startswith("*") or line_strip.startswith("#"):
            continue
        for sel in web_selectors:
            if re.search(sel, line_strip):
                return False, f"Línea {idx+1}: Se detectó un selector CSS web ('{line_strip}') en un archivo QSS. Recuerda que QSS usa selectores de widgets Qt (como QWidget, QPushButton, QLineEdit, QLabel) en lugar de etiquetas HTML/CSS web."
    return True, "OK"


def _validate_sql_syntax(content: str) -> tuple[bool, str]:
    """Validación sintáctica estática para archivos SQL (.sql)."""
    if not content or not content.strip():
        return False, "El archivo SQL está vacío."
        
    clean_content = re.sub(r'--.*', '', content)
    clean_content = re.sub(r'/\*.*?\*/', '', clean_content, flags=re.DOTALL)
    
    quote_count = clean_content.count("'")
    if quote_count % 2 != 0:
        return False, "Se detectó una comilla simple (') sin cerrar en el archivo SQL."
        
    paren_count = clean_content.count("(") - clean_content.count(")")
    if paren_count != 0:
        return False, "Desbalanceo de paréntesis () en la sentencia SQL."
        
    content_upper = clean_content.upper()
    valid_keywords = ["CREATE", "ALTER", "DROP", "SELECT", "INSERT", "UPDATE", "DELETE", "GRANT", "USE", "WITH"]
    has_keyword = any(kw in content_upper for kw in valid_keywords)
    if not has_keyword:
        return False, "El archivo SQL no parece contener ninguna sentencia SQL válida (CREATE, SELECT, INSERT, etc.)."
        
    return True, "OK"


def _validate_prisma_syntax(content: str) -> tuple[bool, str]:
    """Validación sintáctica estática para archivos de esquema Prisma (.prisma)."""
    if not content or not content.strip():
        return False, "El archivo schema.prisma está vacío."
        
    content_clean = re.sub(r'//.*', '', content)
    brace_count = content_clean.count("{") - content_clean.count("}")
    if brace_count != 0:
        return False, "Desbalanceo de llaves {} en el archivo schema.prisma."
        
    prisma_keywords = ["datasource", "generator", "model", "enum"]
    has_keyword = any(kw in content_clean for kw in prisma_keywords)
    if not has_keyword:
        return False, "El archivo no contiene bloques válidos de Prisma (datasource, generator, model, enum)."
        
    return True, "OK"


def _validate_go_syntax(content: str) -> tuple[bool, str]:
    """Validación sintáctica estática para archivos Go (.go)."""
    if not content or not content.strip():
        return False, "El archivo Go está vacío."
        
    lines = [line.strip() for line in content.splitlines() if line.strip() and not line.strip().startswith("//")]
    if not lines:
        return False, "El archivo Go no contiene código ejecutable."
        
    first_code = lines[0]
    if not first_code.startswith("package "):
        return False, "Todo archivo Go debe comenzar con la declaración 'package <nombre>'."
        
    clean_content = re.sub(r'//.*', '', content)
    clean_content = re.sub(r'/\*.*?\*/', '', clean_content, flags=re.DOTALL)
    
    brace_count = clean_content.count("{") - clean_content.count("}")
    if brace_count != 0:
        return False, "Desbalanceo de llaves {} en el archivo Go."
        
    return True, "OK"


def _validate_html_syntax(content: str) -> tuple[bool, str]:
    """Validación sintáctica estática para archivos HTML (.html, .htm)."""
    if not content or not content.strip():
        return False, "El archivo HTML está vacío."
        
    clean_content = re.sub(r'<!--.*?-->', '', content, flags=re.DOTALL)
    open_angles = clean_content.count("<")
    close_angles = clean_content.count(">")
    if open_angles != close_angles:
        return False, f"Desbalanceo de caracteres '<' ({open_angles}) y '>' ({close_angles}) en HTML."
        
    return True, "OK"


def _validate_css_syntax(content: str) -> tuple[bool, str]:
    """Validación sintáctica estática para CSS (.css)."""
    if not content or not content.strip():
        return True, "OK"
        
    clean_content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
    brace_count = clean_content.count("{") - clean_content.count("}")
    if brace_count != 0:
        return False, "Desbalanceo de llaves {} en el archivo CSS."
        
    return True, "OK"


def validate_syntax(filepath: str) -> tuple[bool, str]:
    """Valida la sintaxis del archivo de código de forma estática (FASE 4).
    
    Retorna (True, "OK") o (False, "Detalle del error de sintaxis").
    """
    basename = os.path.basename(filepath).lower()
    
    try:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
    except Exception as e:
        return False, f"No se pudo leer el archivo: {e}"
        
    if not basename.endswith(".md") and "```" in content:
        return False, "Se detectaron delimitadores de bloque de código Markdown (```) en el archivo. El archivo debe contener únicamente código fuente puro."
        
    if "dockerfile" in basename:
        return _validate_dockerfile_syntax(content)
        
    if basename.endswith((".yml", ".yaml")):
        return _validate_yaml_syntax(content)

    if basename == "cmakelists.txt":
        return _validate_cmake_syntax(content)

    if basename.endswith(".qss"):
        return _validate_qss_syntax(content)

    if basename.endswith(".sql"):
        return _validate_sql_syntax(content)

    if basename.endswith(".prisma"):
        return _validate_prisma_syntax(content)

    if basename.endswith(".go"):
        return _validate_go_syntax(content)

    if basename.endswith((".html", ".htm")):
        return _validate_html_syntax(content)

    if basename.endswith(".css"):
        return _validate_css_syntax(content)

    analysis = analyze_file(filepath)
    if analysis.get("error"):
        return False, analysis["error"]
    return True, "OK"


def check_orphaned_files(project_path: str, created_files: list[str]) -> list[str]:
    """Valida estáticamente si los archivos recién creados están importados/referenciados.
    
    Reemplaza la directiva anti-archivos huérfanos del prompt por código determinista.
    Retorna una lista con las rutas de los archivos que parecen estar huérfanos.
    """
    orphaned = []
    
    code_extensions = ('.py', '.js', '.jsx', '.ts', '.tsx', '.dart', '.java', '.kt', '.go')
    entry_points = {
        'main.py', 'app.py', 'manage.py', 'setup.py', 'server.js', 'index.js',
        'app.js', 'main.js', 'index.ts', 'app.ts', 'main.ts', 'app.tsx',
        'index.tsx', 'main.dart', 'build.gradle', 'dockerfile', 'urls.py'
    }
    
    all_project_files = []
    for root, dirs, files in os.walk(project_path):
        dirs[:] = [d for d in dirs if d not in ('.git', 'node_modules', 'venv', '.venv', '__pycache__', 'build', 'dist', '.dart_tool')]
        for f in files:
            all_project_files.append(os.path.join(root, f))
            
    for rel_path in created_files:
        ext = os.path.splitext(rel_path)[1].lower()
        basename = os.path.basename(rel_path).lower()
        
        if ext not in code_extensions or basename in entry_points or basename.startswith('.') or "config" in basename or "test" in basename:
            continue
            
        name_no_ext = os.path.splitext(os.path.basename(rel_path))[0]
        
        is_referenced = False
        for filepath in all_project_files:
            if os.path.abspath(filepath) == os.path.abspath(os.path.join(project_path, rel_path)):
                continue
                
            try:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    if name_no_ext in f.read():
                        is_referenced = True
                        break
            except Exception:
                pass
                
        if not is_referenced:
            orphaned.append(rel_path)
            
    return orphaned


def _validate_jsx_tsx_static(content: str) -> tuple[bool, str]:
    """Validación estática de sintaxis JSX/TSX (React) tolerante a JSX."""
    if not content or not content.strip():
        return True, "OK"
    clean_content = re.sub(r'//.*', '', content)
    clean_content = re.sub(r'/\*.*?\*/', '', clean_content, flags=re.DOTALL)
    
    brace_stack = []
    for idx, char in enumerate(clean_content):
        if char in '{(':
            brace_stack.append((char, idx))
        elif char in '})':
            if not brace_stack:
                return False, f"Se detectó un caracter de cierre insospechado '{char}' sin apertura correspondiente."
            last_open, _ = brace_stack.pop()
            if (last_open == '{' and char != '}') or (last_open == '(' and char != ')'):
                return False, f"Desbalanceo de delimitadores: '{last_open}' fue cerrado con '{char}'."
                
    if brace_stack:
        last_open, _ = brace_stack[-1]
        return False, f"El delimitador '{last_open}' no fue cerrado en el archivo."
        
    return True, "OK"


def extract_signatures_and_types(filepath: str) -> str:
    """Extrae únicamente firmas de funciones, clases e interfaces de un archivo (Context Slicing).
    
    Evita inyectar el cuerpo ejecutable completo del archivo, reduciendo la memoria del prompt.
    """
    if not os.path.isfile(filepath):
        return ""
    try:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
    except Exception:
        return ""
        
    ext = os.path.splitext(filepath)[1].lower()
    signatures = []
    lines = content.splitlines()
    
    if ext == ".py":
        try:
            tree = ast.parse(content)
            for node in ast.walk(tree):
                if isinstance(node, ast.ClassDef):
                    signatures.append(f"class {node.name}: ...")
                elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    args_str = ", ".join(arg.arg for arg in node.args.args)
                    signatures.append(f"def {node.name}({args_str}): ...")
        except SyntaxError:
            signatures = [line.strip() for line in lines if line.strip().startswith(("def ", "class "))]
    elif ext in (".js", ".jsx", ".ts", ".tsx"):
        for line in lines:
            line_strip = line.strip()
            if re.search(r'^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+\w+', line) or \
               re.search(r'^\s*(?:export\s+)?(?:interface|type|class)\s+\w+', line) or \
               re.search(r'^\s*(?:export\s+)?(?:const|let|var)\s+\w+\s*=\s*\(', line):
                signatures.append(line_strip)
    else:
        for line in lines:
            line_strip = line.strip()
            if line_strip.startswith(("def ", "class ", "pub fn ", "func ", "type ", "interface ", "export ")):
                signatures.append(line_strip)
                
    if not signatures:
        return "\n".join(lines[:20])
        
    return "\n".join(signatures[:30])

