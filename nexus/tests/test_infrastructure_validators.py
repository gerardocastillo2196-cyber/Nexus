import unittest
import tempfile
import os
from core.orchestration.code_analyzer import (
    validate_syntax,
    _validate_cmake_syntax,
    _validate_qss_syntax,
    _validate_dockerfile_syntax
)

class TestInfrastructureValidators(unittest.TestCase):

    def test_cmake_syntax_valid(self):
        """Verifica que un CMakeLists.txt válido sea aprobado."""
        content = (
            "cmake_minimum_required(VERSION 3.16)\n"
            "project(CalculatorProject LANGUAGES CXX)\n"
            "set(CMAKE_CXX_STANDARD 17)\n"
            "find_package(Qt6 REQUIRED COMPONENTS Widgets)\n"
            "add_executable(calculator main.cpp)\n"
        )
        ok, msg = _validate_cmake_syntax(content)
        self.assertTrue(ok)
        self.assertEqual(msg, "OK")

    def test_cmake_syntax_invalid_cpp(self):
        """Verifica que un CMakeLists.txt que contiene código C++ sea rechazado."""
        content = (
            "#include <iostream>\n"
            "int main() {\n"
            "    std::cout << \"Hello World\" << std::endl;\n"
            "    return 0;\n"
            "}\n"
        )
        ok, msg = _validate_cmake_syntax(content)
        self.assertFalse(ok)
        self.assertIn("Se detectó sintaxis de código C++", msg)

    def test_cmake_syntax_missing_keywords(self):
        """Verifica que un CMakeLists.txt sin comandos estándar sea rechazado."""
        content = (
            "some_unknown_command(foo bar)\n"
            "another_random_thing()\n"
        )
        ok, msg = _validate_cmake_syntax(content)
        self.assertFalse(ok)
        self.assertIn("no parece contener ningún comando estándar de CMake", msg)

    def test_qss_syntax_valid(self):
        """Verifica que un archivo QSS válido sea aprobado."""
        content = (
            "QWidget {\n"
            "    background-color: #c0c0c0;\n"
            "}\n"
            "QPushButton {\n"
            "    border: 2px solid;\n"
            "}\n"
        )
        ok, msg = _validate_qss_syntax(content)
        self.assertTrue(ok)
        self.assertEqual(msg, "OK")

    def test_qss_syntax_invalid_web(self):
        """Verifica que un archivo QSS con selectores CSS web sea rechazado."""
        content = (
            "body {\n"
            "    background-color: #ffffff;\n"
            "}\n"
            "div.modal {\n"
            "    display: block;\n"
            "}\n"
        )
        ok, msg = _validate_qss_syntax(content)
        self.assertFalse(ok)
        self.assertIn("Se detectó un selector CSS web", msg)

    def test_dockerfile_syntax_valid(self):
        """Verifica que un Dockerfile válido sea aprobado."""
        content = (
            "FROM alpine:latest\n"
            "COPY . /app\n"
            "RUN make /app\n"
            "CMD [\"/app/calculator\"]\n"
        )
        ok, msg = _validate_dockerfile_syntax(content)
        self.assertTrue(ok)
        self.assertEqual(msg, "OK")

    def test_dockerfile_syntax_invalid_placeholder_git(self):
        """Verifica que un Dockerfile con placeholders de git clone sea rechazado."""
        content = (
            "FROM alpine:latest\n"
            "RUN git clone https://github.com/yourusername/yourproject.git\n"
            "CMD [\"./yourproject/calculator\"]\n"
        )
        ok, msg = _validate_dockerfile_syntax(content)
        self.assertFalse(ok)
        self.assertIn("Se detectaron URLs de marcador de posición", msg)

    def test_validate_syntax_file_integration(self):
        """Verifica la integración de validate_syntax escribiendo archivos a disco."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # 1. CMakeLists.txt inválido
            cmake_path = os.path.join(tmpdir, "CMakeLists.txt")
            with open(cmake_path, "w", encoding="utf-8") as f:
                f.write("#include <iostream>\nint main() {}")
            ok, msg = validate_syntax(cmake_path)
            self.assertFalse(ok)
            self.assertIn("Se detectó sintaxis de código C++", msg)

            # 2. QSS inválido
            qss_path = os.path.join(tmpdir, "win97_style.qss")
            with open(qss_path, "w", encoding="utf-8") as f:
                f.write("body { background: black; }")
            ok, msg = validate_syntax(qss_path)
            self.assertFalse(ok)
            self.assertIn("Se detectó un selector CSS web", msg)

if __name__ == "__main__":
    unittest.main()
