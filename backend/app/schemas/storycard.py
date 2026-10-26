"""故事卡牌模式 Pydantic 模型（与 storycard-demo 的 JSON 契约一致）"""
from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

CARD_TYPES = (
    "world",
    "region",
    "location",
    "character",
    "faction",
    "item",
    "event",
    "foreshadow",
)
EDGE_TYPES = ("relation", "causes", "belongs", "controls", "owns", "path", "secret")


class StoryCardIn(BaseModel):
    id: str = Field(..., min_length=1, max_length=64)
    type: Literal[
        "world", "region", "location", "character",
        "faction", "item", "event", "foreshadow",
    ]
    name: str = Field(..., min_length=1, max_length=200)
    aliases: list[str] = Field(default_factory=list)
    oneLiner: str = ""
    summary: str = ""
    body: str = ""
    tags: list[str] = Field(default_factory=list)
    importance: float = 0.5
    status: str = ""
    fields: dict[str, Any] = Field(default_factory=dict)
    history: list[dict[str, Any]] = Field(default_factory=list)
    meta: dict[str, Any] = Field(default_factory=dict)
    order: Optional[int] = None
    chapter: Optional[int] = None
    chainIds: list[str] = Field(default_factory=list)
    createdAt: int = 0
    updatedAt: int = 0


class StoryEdgeIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(..., min_length=1, max_length=64)
    from_card: str = Field(..., alias="from", min_length=1, max_length=64)
    to_card: str = Field(..., alias="to", min_length=1, max_length=64)
    type: Literal["relation", "causes", "belongs", "controls", "owns", "path", "secret"]
    label: str = ""
    strength: int = 0
    notes: str = ""
    meta: dict[str, Any] = Field(default_factory=dict)
    createdAt: int = 0
    updatedAt: int = 0


class StoryChainIn(BaseModel):
    id: str = Field(..., min_length=1, max_length=64)
    name: str = Field(..., min_length=1, max_length=200)
    kind: str = ""
    goal: str = ""
    color: str = "#b3452f"
    eventIds: list[str] = Field(default_factory=list)
    description: str = ""
    status: str = "planning"


class StoryChapterIn(BaseModel):
    id: str = Field(..., min_length=1, max_length=64)
    number: int = Field(..., ge=1, le=9999)
    title: str = Field(..., min_length=1, max_length=200)
    summary: str = ""
    eventIds: list[str] = Field(default_factory=list)
    locations: dict[str, str] = Field(default_factory=dict)
    status: str = "draft"


class StoryWorkspaceSave(BaseModel):
    revision: int = Field(default=0, ge=0)
    cards: list[StoryCardIn] = Field(default_factory=list, max_length=3000)
    edges: list[StoryEdgeIn] = Field(default_factory=list, max_length=8000)
    chains: list[StoryChainIn] = Field(default_factory=list, max_length=500)
    chapters: list[StoryChapterIn] = Field(default_factory=list, max_length=2000)
    premise: Optional[str] = None
    genre: Optional[str] = None
    theme: Optional[str] = None


class StoryFieldAssistRequest(BaseModel):
    card: StoryCardIn
    field: str = Field(..., min_length=1, max_length=100)
    field_label: str = ""
    action: str = "改写"
    premise: str = ""
    related: list[str] = Field(default_factory=list)


class StoryFieldDef(BaseModel):
    key: str
    label: str = ""
    placeholder: str = ""


class StoryCompleteRequest(BaseModel):
    card: StoryCardIn
    fields: list[StoryFieldDef] = Field(default_factory=list, max_length=12)
    premise: str = ""


class StoryRelationRequest(BaseModel):
    card: StoryCardIn
    candidates: list[StoryCardIn] = Field(default_factory=list, max_length=80)
    existing_ids: list[str] = Field(default_factory=list, max_length=300)
    premise: str = ""


class StoryPlanRequest(BaseModel):
    command: str = Field(..., min_length=1, max_length=1000)
    scope: Literal["all", "chapter", "selection"] = "all"
    chapter: int = 1
    selected_id: Optional[str] = None


class StoryImportRequest(BaseModel):
    overwrite: bool = False
