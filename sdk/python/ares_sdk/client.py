import requests

from .models import ScoreResponse, AgentResponse, AccessResponse


class AresClient:
    def __init__(self, base_url: str, timeout: float = 10.0):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def get_score(self, address: str) -> ScoreResponse:
        r = requests.get(f"{self.base_url}/v1/score/{address}", timeout=self.timeout)
        r.raise_for_status()
        return ScoreResponse.model_validate(r.json())

    def get_agent(self, address: str) -> AgentResponse:
        r = requests.get(f"{self.base_url}/v1/agent/{address}", timeout=self.timeout)
        r.raise_for_status()
        return AgentResponse.model_validate(r.json())

    def get_access_status(self, account: str, token: str | None = None) -> AccessResponse:
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        r = requests.get(f"{self.base_url}/v1/access/{account}", timeout=self.timeout, headers=headers)
        r.raise_for_status()
        return AccessResponse.model_validate(r.json())
