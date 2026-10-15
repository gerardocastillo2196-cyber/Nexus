"""
core/jellyfish — Motor Ágil Multi-Agente & Scrum (Jellyfish Engine).
Proporciona la orquestación autónoma de tareas, sprint board, event bus y agentes ágiles.
"""

from core.project_orchestrator import ProjectOrchestrator
from core.agency_orchestrator import AgencyOrchestrator
from core.agents.registry import AgentRegistry

__all__ = [
    "ProjectOrchestrator",
    "AgencyOrchestrator",
    "AgentRegistry"
]
