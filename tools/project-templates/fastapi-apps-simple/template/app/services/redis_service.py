"""
Redis service for caching and session management.
Implements singleton pattern with async Redis client.
"""

from typing import Any, List, Optional
import json

from redis import asyncio as aioredis

from app.config import settings


class RedisService:
    """
    Singleton Redis service for async operations.
    """

    _instance: Optional["RedisService"] = None
    _client: Optional[aioredis.Redis] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    async def get_client(self) -> aioredis.Redis:
        """
        Get or create Redis client.

        Returns:
            Async Redis client instance
        """
        if self._client is None:
            self._client = await aioredis.from_url(
                settings.redis_url,
                max_connections=settings.REDIS_MAX_CONNECTIONS,
                socket_timeout=settings.REDIS_SOCKET_TIMEOUT,
                decode_responses=True,  # Auto-decode bytes to strings
            )
        return self._client

    async def close(self):
        """Close Redis connection"""
        if self._client:
            await self._client.close()
            self._client = None

    # Session Memory Operations (TTL-based)
    async def set_session_memory(
        self, key: str, value: Any, ttl: int = 3600
    ) -> bool:
        """
        Set session memory with TTL.

        Args:
            key: Memory key
            value: Value to store (will be JSON serialized)
            ttl: Time to live in seconds (default: 3600 = 1 hour)

        Returns:
            True if successful
        """
        client = await self.get_client()
        serialized = json.dumps(value)
        return await client.setex(key, ttl, serialized)

    async def get_session_memory(self, key: str) -> Optional[Any]:
        """
        Get session memory.

        Args:
            key: Memory key

        Returns:
            Deserialized value or None if not found/expired
        """
        client = await self.get_client()
        value = await client.get(key)
        if value:
            return json.loads(value)
        return None

    # Persistent Memory Operations (No TTL)
    async def set_persistent_memory(self, key: str, value: Any) -> bool:
        """
        Set persistent memory (no TTL).

        Args:
            key: Memory key
            value: Value to store (will be JSON serialized)

        Returns:
            True if successful
        """
        client = await self.get_client()
        serialized = json.dumps(value)
        return await client.set(key, serialized)

    async def get_persistent_memory(self, key: str) -> Optional[Any]:
        """
        Get persistent memory.

        Args:
            key: Memory key

        Returns:
            Deserialized value or None if not found
        """
        client = await self.get_client()
        value = await client.get(key)
        if value:
            return json.loads(value)
        return None

    # List Operations
    async def append_to_memory(self, key: str, value: Any) -> int:
        """
        Append value to a list in memory.

        Args:
            key: List key
            value: Value to append (will be JSON serialized)

        Returns:
            Length of list after append
        """
        client = await self.get_client()
        serialized = json.dumps(value)
        return await client.rpush(key, serialized)

    async def get_memory_list(
        self, key: str, start: int = 0, end: int = -1
    ) -> List[Any]:
        """
        Get list from memory.

        Args:
            key: List key
            start: Start index (default: 0)
            end: End index (default: -1 = all)

        Returns:
            List of deserialized values
        """
        client = await self.get_client()
        values = await client.lrange(key, start, end)
        return [json.loads(v) for v in values]

    # Generic Cache Operations
    async def get(self, key: str) -> Optional[str]:
        """
        Get value from cache.

        Args:
            key: Cache key

        Returns:
            Value or None if not found
        """
        client = await self.get_client()
        return await client.get(key)

    async def set(self, key: str, value: str) -> bool:
        """
        Set value in cache.

        Args:
            key: Cache key
            value: Value to store

        Returns:
            True if successful
        """
        client = await self.get_client()
        return await client.set(key, value)

    async def setex(self, key: str, seconds: int, value: str) -> bool:
        """
        Set value with expiration.

        Args:
            key: Cache key
            seconds: TTL in seconds
            value: Value to store

        Returns:
            True if successful
        """
        client = await self.get_client()
        return await client.setex(key, seconds, value)

    async def delete(self, key: str) -> int:
        """
        Delete key from cache.

        Args:
            key: Cache key

        Returns:
            Number of keys deleted
        """
        client = await self.get_client()
        return await client.delete(key)

    async def exists(self, key: str) -> bool:
        """
        Check if key exists.

        Args:
            key: Cache key

        Returns:
            True if key exists
        """
        client = await self.get_client()
        return await client.exists(key) > 0


# Export singleton instance
redis_service = RedisService()
