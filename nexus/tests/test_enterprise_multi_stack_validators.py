import unittest
import tempfile
import os
from core.orchestration.code_analyzer import (
    validate_syntax,
    _validate_jsx_tsx_static,
    _validate_sql_syntax,
    _validate_prisma_syntax,
    _validate_go_syntax,
    _validate_html_syntax,
    _validate_css_syntax,
    extract_signatures_and_types
)

class TestEnterpriseMultiStackValidators(unittest.TestCase):

    def test_jsx_tsx_static_valid(self):
        """Verifica que componentes React JSX/TSX válidos sean aprobados."""
        content = (
            "import React from 'react';\n"
            "export const Button = ({ onClick, children }) => (\n"
            "  <button onClick={onClick} className=\"btn\">\n"
            "    {children}\n"
            "  </button>\n"
            ");\n"
        )
        ok, msg = _validate_jsx_tsx_static(content)
        self.assertTrue(ok)
        self.assertEqual(msg, "OK")

    def test_jsx_tsx_static_invalid_unclosed_brace(self):
        """Verifica que un archivo React con llaves sin cerrar sea rechazado."""
        content = (
            "export const Card = () => {\n"
            "  return <div>Hello</div>;\n"
            "// Falta la llave de cierre\n"
        )
        ok, msg = _validate_jsx_tsx_static(content)
        self.assertFalse(ok)
        self.assertIn("no fue cerrado", msg)

    def test_sql_syntax_valid(self):
        """Verifica que sentencias SQL DDL/DML válidas sean aprobadas."""
        content = (
            "CREATE TABLE users (\n"
            "    id SERIAL PRIMARY KEY,\n"
            "    username VARCHAR(50) NOT NULL,\n"
            "    email VARCHAR(100) UNIQUE NOT NULL\n"
            ");\n"
        )
        ok, msg = _validate_sql_syntax(content)
        self.assertTrue(ok)
        self.assertEqual(msg, "OK")

    def test_sql_syntax_invalid_unclosed_quote(self):
        """Verifica que SQL con comilla sin cerrar sea rechazado."""
        content = "INSERT INTO users (username) VALUES ('unclosed_user);"
        ok, msg = _validate_sql_syntax(content)
        self.assertFalse(ok)
        self.assertIn("comilla simple", msg)

    def test_prisma_syntax_valid(self):
        """Verifica que esquemas de Prisma válidos sean aprobados."""
        content = (
            "datasource db {\n"
            "  provider = \"postgresql\"\n"
            "  url      = env(\"DATABASE_URL\")\n"
            "}\n\n"
            "model User {\n"
            "  id    Int     @id @default(autoincrement())\n"
            "  email String  @unique\n"
            "}\n"
        )
        ok, msg = _validate_prisma_syntax(content)
        self.assertTrue(ok)
        self.assertEqual(msg, "OK")

    def test_prisma_syntax_invalid_braces(self):
        """Verifica que esquemas de Prisma con llaves desbalanceadas sean rechazados."""
        content = "model User {\n id Int @id"
        ok, msg = _validate_prisma_syntax(content)
        self.assertFalse(ok)
        self.assertIn("Desbalanceo de llaves", msg)

    def test_go_syntax_valid(self):
        """Verifica que código Go válido con paquete sea aprobado."""
        content = (
            "package main\n\n"
            "import \"fmt\"\n\n"
            "func main() {\n"
            "    fmt.Println(\"Hello Go\")\n"
            "}\n"
        )
        ok, msg = _validate_go_syntax(content)
        self.assertTrue(ok)
        self.assertEqual(msg, "OK")

    def test_go_syntax_invalid_no_package(self):
        """Verifica que código Go sin paquete sea rechazado."""
        content = "func main() { fmt.Println(\"No package\") }"
        ok, msg = _validate_go_syntax(content)
        self.assertFalse(ok)
        self.assertIn("package", msg)

    def test_html_syntax_valid(self):
        """Verifica que estructura HTML sea aprobada."""
        content = "<!DOCTYPE html><html><head><title>Test</title></head><body><h1>Hello</h1></body></html>"
        ok, msg = _validate_html_syntax(content)
        self.assertTrue(ok)

    def test_html_syntax_invalid_angle(self):
        """Verifica que HTML con desbalanceo de '<' sea rechazado."""
        content = "<html><body><h1>Title</h1><p Unclosed angle</body></html>"
        ok, msg = _validate_html_syntax(content)
        self.assertFalse(ok)

    def test_css_syntax_valid(self):
        """Verifica que CSS con llaves balanceadas sea aprobado."""
        content = "body { margin: 0; padding: 0; } .card { color: red; }"
        ok, msg = _validate_css_syntax(content)
        self.assertTrue(ok)

    def test_extract_signatures_and_types(self):
        """Verifica que extract_signatures_and_types extraiga solo la firma de interfaz de los archivos."""
        with tempfile.TemporaryDirectory() as tmpdir:
            py_file = os.path.join(tmpdir, "service.py")
            with open(py_file, "w", encoding="utf-8") as f:
                f.write("class UserService:\n    def get_user(self, user_id):\n        return {'id': user_id}\n")
                
            sigs = extract_signatures_and_types(py_file)
            self.assertIn("class UserService", sigs)
            self.assertIn("def get_user", sigs)

    def test_validate_syntax_file_routing(self):
        """Verifica el ruteo completo de validate_syntax para las nuevas extensiones en disco."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # SQL
            sql_p = os.path.join(tmpdir, "schema.sql")
            with open(sql_p, "w", encoding="utf-8") as f:
                f.write("CREATE TABLE items (id INT);")
            self.assertTrue(validate_syntax(sql_p)[0])

            # Prisma
            prisma_p = os.path.join(tmpdir, "schema.prisma")
            with open(prisma_p, "w", encoding="utf-8") as f:
                f.write("model Item { id Int @id }")
            self.assertTrue(validate_syntax(prisma_p)[0])

            # Go
            go_p = os.path.join(tmpdir, "main.go")
            with open(go_p, "w", encoding="utf-8") as f:
                f.write("package main\nfunc main() {}")
            self.assertTrue(validate_syntax(go_p)[0])

if __name__ == "__main__":
    unittest.main()
