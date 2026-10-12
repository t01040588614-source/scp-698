from pydantic import BaseModel, Field


class ChatTurn(BaseModel):
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str = Field(..., min_length=1, max_length=8000)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    history: list[ChatTurn] = Field(default_factory=list, max_length=24)
    page_path: str | None = Field(default=None, max_length=256)
    symbol: str | None = Field(default=None, max_length=32)
    market: str | None = Field(default=None, max_length=16)


class ChatResponse(BaseModel):
    reply: str
    provider: str
    model: str
    context: dict | None = None


class ChatContextResponse(BaseModel):
    pagePath: str | None = None
    pageLabel: str | None = None
    symbol: str | None = None
    market: str | None = None
    quote: dict | None = None
    suggestedPrompts: list[str] = Field(default_factory=list)
