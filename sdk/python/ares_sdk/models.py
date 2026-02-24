from pydantic import BaseModel
from typing import Optional, Any


class ScoreResponse(BaseModel):
    agentId: str
    agentIdHex: str
    ari: int
    tier: str
    actions: int
    since: Optional[str]


class AgentResponse(BaseModel):
    found: bool
    address: Optional[str] = None
    agentId: Optional[str] = None
    agentIdHex: Optional[str] = None
    operator: Optional[str] = None
    registeredAt: Optional[str] = None
    ari: Optional[int] = None
    tier: Optional[str] = None
    since: Optional[str] = None
    actionsCount: Optional[int] = None
    actions: Optional[list[Any]] = None


class AccessResponse(BaseModel):
    account: str
    hasAccess: bool
    expiresAt: Optional[int]
