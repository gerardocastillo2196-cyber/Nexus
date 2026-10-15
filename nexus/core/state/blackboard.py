"""core/state/blackboard.py — Registro centralizado inmutable (Blackboard) para comunicación entre agentes."""

import asyncio
import inspect
import logging
import threading

logger = logging.getLogger("jellyfish.state.blackboard")


class Blackboard:
    """Registro centralizado inmutable con cerrojos duales para concurrencia segura."""
    def __init__(self):
        self._variables = {}
        self._subscribers = {}
        self._lock = threading.Lock()
        self._async_lock = None

    def _get_async_lock(self):
        if self._async_lock is None:
            self._async_lock = asyncio.Lock()
        return self._async_lock

    def get(self, key: str, default=None):
        """Retorna el último valor registrado para una variable en modo síncrono."""
        with self._lock:
            values = self._variables.get(key)
            if values:
                return values[-1]
            return default

    async def aget(self, key: str, default=None):
        """Retorna el último valor registrado para una variable en modo corutina asíncrona."""
        async with self._get_async_lock():
            with self._lock:
                values = self._variables.get(key)
                if values:
                    return values[-1]
                return default

    def get_history(self, key: str) -> list:
        """Retorna el historial completo de cambios de una variable."""
        with self._lock:
            return list(self._variables.get(key, []))

    async def aget_history(self, key: str) -> list:
        """Retorna el historial completo asincrónicamente."""
        async with self._get_async_lock():
            with self._lock:
                return list(self._variables.get(key, []))

    def set(self, key: str, value) -> None:
        """Registra un nuevo valor para una variable (historial inmutable thread-safe)."""
        with self._lock:
            if key not in self._variables:
                self._variables[key] = []
            self._variables[key].append(value)
            subscribers = list(self._subscribers.get(key, []))
        
        for callback in subscribers:
            try:
                if inspect.iscoroutinefunction(callback):
                    try:
                        loop = asyncio.get_running_loop()
                        loop.create_task(callback(key, value))
                    except RuntimeError:
                        asyncio.run(callback(key, value))
                else:
                    callback(key, value)
            except Exception as e:
                logger.error("Error al notificar al suscriptor de la variable %s: %s", key, e)

    async def aset(self, key: str, value) -> None:
        """Registra un nuevo valor asincrónicamente e invoca callbacks."""
        async with self._get_async_lock():
            with self._lock:
                if key not in self._variables:
                    self._variables[key] = []
                self._variables[key].append(value)
                subscribers = list(self._subscribers.get(key, []))
                
        for callback in subscribers:
            try:
                if inspect.iscoroutinefunction(callback):
                    await callback(key, value)
                else:
                    callback(key, value)
            except Exception as e:
                logger.error("Error asíncrono en suscriptor de variable %s: %s", key, e)

    def subscribe(self, key: str, callback) -> None:
        """Registra una función callback para reaccionar a cambios."""
        with self._lock:
            if key not in self._subscribers:
                self._subscribers[key] = []
            self._subscribers[key].append(callback)
