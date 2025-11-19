"""Users API SDK for Jira."""

from typing import List, Optional

from jira_api.client import JiraHttpClient
from jira_api.users.models import User


class UsersAPI:
    """
    Users API for Jira operations.

    Provides methods for user management and search operations.
    """

    def __init__(self, client: JiraHttpClient):
        """
        Initialize Users API.

        Args:
            client: Configured Jira HTTP client
        """
        self.client = client

    async def get(self, account_id: str) -> User:
        """
        Get user by account ID.

        Args:
            account_id: Account ID of the user

        Returns:
            User object

        Example:
            >>> user = await jira.users.get("5b10a2844c20165700ede21g")
        """
        response = await self.client.get(f"user?accountId={account_id}")
        return User(**response)

    async def search(
        self,
        query: str,
        max_results: int = 50,
        start_at: int = 0,
    ) -> List[User]:
        """
        Search for users.

        Args:
            query: Query string to search for users
            max_results: Maximum number of results to return
            start_at: Index of the first result to return

        Returns:
            List of User objects

        Example:
            >>> users = await jira.users.search("john")
            >>> for user in users:
            >>>     print(user.display_name)
        """
        params = {
            "query": query,
            "maxResults": max_results,
            "startAt": start_at,
        }
        response = await self.client.get("user/search", params=params)

        # Response is a list of users
        if isinstance(response, list):
            return [User(**user) for user in response]
        return []

    async def get_assignable(
        self,
        project: str,
        query: Optional[str] = None,
        max_results: int = 50,
    ) -> List[User]:
        """
        Get users assignable to issues in a project.

        Args:
            project: Project key or ID
            query: Query string to filter users (optional)
            max_results: Maximum number of results

        Returns:
            List of assignable User objects

        Example:
            >>> users = await jira.users.get_assignable("PROJ")
            >>> for user in users:
            >>>     print(f"{user.display_name} ({user.account_id})")
        """
        params = {
            "project": project,
            "maxResults": max_results,
        }

        if query:
            params["query"] = query

        response = await self.client.get("user/assignable/search", params=params)

        # Response is a list of users
        if isinstance(response, list):
            return [User(**user) for user in response]
        return []

    async def find_by_email(self, email: str) -> Optional[User]:
        """
        Find user by email address.

        Args:
            email: Email address to search for

        Returns:
            User object if found, None otherwise

        Example:
            >>> user = await jira.users.find_by_email("user@company.com")
            >>> if user:
            >>>     print(f"Found: {user.display_name}")
        """
        # Search by email using query parameter
        users = await self.search(email, max_results=1)
        if users:
            return users[0]
        return None
