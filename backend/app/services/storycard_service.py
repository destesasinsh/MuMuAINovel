"""故事卡牌模式服务：序列化、工作区保存、经典项目导入。"""
from __future__ import annotations

import json
import re
import uuid
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.logger import get_logger
from app.models.chapter import Chapter
from app.models.character import Character
from app.models.foreshadow import Foreshadow
from app.models.outline import Outline
from app.models.project import Project
from app.models.relationship import CharacterRelationship, Organization, OrganizationMember
from app.models.storycard import StoryCard, StoryCardEdge, StoryChain, StoryChapter
from app.schemas.storycard import (
    CARD_TYPES,
    StoryCardIn,
    StoryChainIn,
    StoryChapterIn,
    StoryEdgeIn,
    StoryWorkspaceSave,
)

logger = get_logger(__name__)


class StoryCardRevisionConflict(Exception):
    """工作区版本号不一致（另一个窗口已保存）。"""


def _loads(raw: Any, default: Any) -> Any:
    if raw is None:
        return default
    if isinstance(raw, (dict, list)):
        return raw
    try:
        return json.loads(raw)
    except (TypeError, ValueError, json.JSONDecodeError):
        return default


def _text(value: Any, limit: Optional[int] = None) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    if limit is not None and len(text) > limit:
        return text[:limit]
    return text


def _first_line(value: Any, limit: int = 40) -> str:
    text = _text(value)
    if not text:
        return ""
    text = re.split(r"[\n\r。！？!?]", text)[0].strip()
    return text[:limit]


def _short_id(project_id: str) -> str:
    return (project_id or "project")[:8]


def card_to_dict(card: StoryCard) -> dict[str, Any]:
    return {
        "id": card.id,
        "type": card.card_type,
        "name": card.name,
        "aliases": _loads(card.aliases, []),
        "oneLiner": card.one_liner or "",
        "summary": card.summary or "",
        "body": card.body or "",
        "tags": _loads(card.tags, []),
        "importance": float(card.importance if card.importance is not None else 0.5),
        "status": card.status or "",
        "fields": _loads(card.fields, {}),
        "history": _loads(card.history, []),
        "meta": _loads(card.meta, {}),
        "order": card.order_index,
        "chapter": card.chapter_no,
        "chainIds": _loads(card.chain_ids, []),
        "createdAt": int(card.created_ms or 0),
        "updatedAt": int(card.updated_ms or 0),
    }


def edge_to_dict(edge: StoryCardEdge) -> dict[str, Any]:
    return {
        "id": edge.id,
        "from": edge.from_card_id,
        "to": edge.to_card_id,
        "type": edge.edge_type,
        "label": edge.label or "",
        "strength": int(edge.strength or 0),
        "notes": edge.notes or "",
        "meta": _loads(edge.meta, {}),
        "createdAt": int(edge.created_ms or 0),
        "updatedAt": int(edge.updated_ms or 0),
    }


def chain_to_dict(chain: StoryChain) -> dict[str, Any]:
    return {
        "id": chain.id,
        "name": chain.name,
        "kind": chain.kind or "",
        "goal": chain.goal or "",
        "color": chain.color or "#b3452f",
        "eventIds": _loads(chain.event_ids, []),
        "description": chain.description or "",
        "status": chain.status or "planning",
    }


def chapter_to_dict(chapter: StoryChapter) -> dict[str, Any]:
    return {
        "id": chapter.id,
        "number": chapter.chapter_number,
        "title": chapter.title,
        "summary": chapter.summary or "",
        "eventIds": _loads(chapter.event_ids, []),
        "locations": _loads(chapter.locations, {}),
        "status": chapter.status or "draft",
    }


async def _classic_summary(project: Project, db: AsyncSession) -> dict[str, Any]:
    async def count(model: Any) -> int:
        result = await db.execute(select(func.count(model.id)).where(model.project_id == project.id))
        return int(result.scalar_one() or 0)

    characters = await count(Character)
    outlines = await count(Outline)
    chapters = await count(Chapter)
    foreshadows = await count(Foreshadow)
    return {
        "characters": characters,
        "outlines": outlines,
        "chapters": chapters,
        "foreshadows": foreshadows,
        "hasContent": bool(characters or outlines or chapters or foreshadows),
    }


async def get_workspace(project: Project, db: AsyncSession) -> dict[str, Any]:
    cards = (
        await db.execute(
            select(StoryCard)
            .where(StoryCard.project_id == project.id)
            .order_by(StoryCard.order_index.asc().nulls_last(), StoryCard.created_ms.asc())
        )
    ).scalars().all()
    edges = (
        await db.execute(select(StoryCardEdge).where(StoryCardEdge.project_id == project.id))
    ).scalars().all()
    chains = (
        await db.execute(
            select(StoryChain)
            .where(StoryChain.project_id == project.id)
            .order_by(StoryChain.created_ms.asc())
        )
    ).scalars().all()
    chapters = (
        await db.execute(
            select(StoryChapter)
            .where(StoryChapter.project_id == project.id)
            .order_by(StoryChapter.chapter_number.asc())
        )
    ).scalars().all()
    return {
        "version": 1,
        "projectId": project.id,
        "title": project.title,
        "genre": project.genre or "",
        "theme": project.theme or "",
        "premise": project.description or "",
        "creationMode": project.creation_mode or "classic",
        "revision": int(project.storycard_revision or 0),
        "cards": [card_to_dict(c) for c in cards],
        "edges": [edge_to_dict(e) for e in edges],
        "chains": [chain_to_dict(c) for c in chains],
        "chapters": [chapter_to_dict(c) for c in chapters],
        "classic": await _classic_summary(project, db),
    }


def _clean_card(payload: StoryCardIn, user_id: str) -> StoryCard:
    data = payload.model_dump()
    now_ms = int(datetime.now().timestamp() * 1000)
    return StoryCard(
        id=data["id"],
        project_id="",  # filled by caller
        user_id=user_id,
        card_type=data["type"],
        name=_text(data["name"], 200) or "未命名",
        one_liner=data.get("oneLiner") or "",
        summary=data.get("summary") or "",
        body=data.get("body") or "",
        aliases=data.get("aliases") or [],
        tags=data.get("tags") or [],
        importance=max(0.0, min(1.0, float(data.get("importance") or 0.5))),
        status=data.get("status") or "",
        fields=data.get("fields") or {},
        history=data.get("history") or [],
        meta=data.get("meta") or {},
        order_index=data.get("order"),
        chapter_no=data.get("chapter"),
        chain_ids=data.get("chainIds") or [],
        created_ms=int(data.get("createdAt") or now_ms),
        updated_ms=int(data.get("updatedAt") or now_ms),
    )


def _clean_edge(payload: StoryEdgeIn, user_id: str) -> StoryCardEdge:
    data = payload.model_dump()
    now_ms = int(datetime.now().timestamp() * 1000)
    return StoryCardEdge(
        id=data["id"],
        project_id="",
        user_id=user_id,
        from_card_id=data["from_card"],
        to_card_id=data["to_card"],
        edge_type=data["type"],
        label=_text(data.get("label"), 200),
        strength=int(data.get("strength") or 0),
        notes=data.get("notes") or "",
        meta=data.get("meta") or {},
        created_ms=int(data.get("createdAt") or now_ms),
        updated_ms=int(data.get("updatedAt") or now_ms),
    )


def _clean_chain(payload: StoryChainIn, user_id: str) -> StoryChain:
    data = payload.model_dump()
    now_ms = int(datetime.now().timestamp() * 1000)
    return StoryChain(
        id=data["id"],
        project_id="",
        user_id=user_id,
        name=_text(data["name"], 200) or "未命名链",
        kind=data.get("kind") or "",
        goal=data.get("goal") or "",
        color=data.get("color") or "#b3452f",
        event_ids=data.get("eventIds") or [],
        description=data.get("description") or "",
        status=data.get("status") or "planning",
        created_ms=now_ms,
        updated_ms=now_ms,
    )


def _clean_chapter(payload: StoryChapterIn, user_id: str) -> StoryChapter:
    data = payload.model_dump()
    now_ms = int(datetime.now().timestamp() * 1000)
    return StoryChapter(
        id=data["id"],
        project_id="",
        user_id=user_id,
        chapter_number=int(data["number"]),
        title=_text(data["title"], 200) or f"第{data['number']}章",
        summary=data.get("summary") or "",
        event_ids=data.get("eventIds") or [],
        locations=data.get("locations") or {},
        status=data.get("status") or "draft",
        created_ms=now_ms,
        updated_ms=now_ms,
    )


async def replace_workspace(
    project: Project,
    payload: StoryWorkspaceSave,
    user_id: str,
    db: AsyncSession,
    *,
    check_revision: bool = True,
) -> dict[str, Any]:
    """整体替换一个项目的工作区（前端按文档方式同步）。"""
    current_revision = int(project.storycard_revision or 0)
    if check_revision and payload.revision != current_revision:
        raise StoryCardRevisionConflict(
            f"工作区已在别处更新（当前版本 {current_revision}，提交版本 {payload.revision}）"
        )

    card_ids = [c.id for c in payload.cards]
    if len(card_ids) != len(set(card_ids)):
        raise ValueError("卡牌 id 重复，请检查导入数据")
    card_id_set = set(card_ids)

    # 卡牌 id 是全局主键：防止把示例/导入数据覆盖到别的项目
    if card_ids:
        occupied = await db.execute(
            select(StoryCard.id).where(
                StoryCard.id.in_(card_ids),
                StoryCard.project_id != project.id,
            ).limit(1)
        )
        if occupied.scalar_one_or_none():
            raise ValueError("卡牌 id 已被其他项目占用，请先在设置里导出后重新生成 id")

    # 过滤掉指向不存在卡牌的边/引用，避免图数据出现悬挂节点
    valid_edges = [e for e in payload.edges if e.from_card in card_id_set and e.to_card in card_id_set]
    valid_chains = [
        c.model_copy(update={"eventIds": [eid for eid in c.eventIds if eid in card_id_set]})
        for c in payload.chains
    ]
    valid_chapters = [
        c.model_copy(
            update={
                "eventIds": [eid for eid in c.eventIds if eid in card_id_set],
                "locations": {
                    cid: lid for cid, lid in c.locations.items()
                    if cid in card_id_set and lid in card_id_set
                },
            }
        )
        for c in payload.chapters
    ]

    await db.execute(delete(StoryCard).where(StoryCard.project_id == project.id))
    await db.execute(delete(StoryCardEdge).where(StoryCardEdge.project_id == project.id))
    await db.execute(delete(StoryChain).where(StoryChain.project_id == project.id))
    await db.execute(delete(StoryChapter).where(StoryChapter.project_id == project.id))

    now_ms = int(datetime.now().timestamp() * 1000)
    for item in payload.cards:
        row = _clean_card(item, user_id)
        row.project_id = project.id
        row.updated_ms = now_ms
        db.add(row)
    for item in valid_edges:
        row = _clean_edge(item, user_id)
        row.project_id = project.id
        row.updated_ms = now_ms
        db.add(row)
    for item in valid_chains:
        row = _clean_chain(item, user_id)
        row.project_id = project.id
        row.updated_ms = now_ms
        db.add(row)
    for item in valid_chapters:
        row = _clean_chapter(item, user_id)
        row.project_id = project.id
        row.updated_ms = now_ms
        db.add(row)

    if payload.premise is not None:
        project.description = payload.premise
    if payload.genre is not None:
        project.genre = payload.genre
    if payload.theme is not None:
        project.theme = payload.theme
    project.creation_mode = "storycard"
    project.storycard_revision = current_revision + 1
    project.updated_at = datetime.now()

    await db.commit()
    await db.refresh(project)
    return await get_workspace(project, db)


def _world_card(project: Project) -> StoryCardIn:
    now = int(datetime.now().timestamp() * 1000)
    return StoryCardIn(
        id=f"world-{project.id}",
        type="world",
        name=_text(project.title, 200) or "未命名世界",
        oneLiner=_text(project.theme, 160),
        summary=_text(project.description, 2000),
        body=_text(project.world_rules, 8000),
        tags=["世界"],
        importance=1.0,
        status="stable",
        fields={
            "era": project.world_time_period or "",
            "power": project.world_rules or "",
            "taboo": "",
            "naming": "",
        },
        meta={},
        createdAt=now,
        updatedAt=now,
    )


def _starter_workspace(project: Project) -> tuple[StoryCardIn, StoryChainIn, list[StoryChapterIn]]:
    world = _world_card(project)
    chain_id = f"chain-{_short_id(project.id)}-main"
    chain = StoryChainIn(
        id=chain_id,
        name="主线",
        kind="主线",
        goal=_text(project.theme, 2000),
        color="#b3452f",
        eventIds=[],
        description="从卡牌模式开始的主线。",
        status="planning",
    )
    chapters = [
        StoryChapterIn(
            id=f"chapter-{_short_id(project.id)}-{n}",
            number=n,
            title=("开篇" if n == 1 else "承接" if n == 2 else "转折"),
            summary="",
            eventIds=[],
            locations={},
            status="draft",
        )
        for n in (1, 2, 3)
    ]
    return world, chain, chapters


async def initialize_storycard(project: Project, db: AsyncSession) -> None:
    """新项目初始化为一张世界卡 + 一条主线 + 3 个章节。"""
    existing = (
        await db.execute(select(func.count(StoryCard.id)).where(StoryCard.project_id == project.id))
    ).scalar_one()
    if existing:
        return
    world, chain, chapters = _starter_workspace(project)
    now = int(datetime.now().timestamp() * 1000)
    card = _clean_card(world, project.user_id)
    card.project_id = project.id
    card.created_ms = now
    card.updated_ms = now
    db.add(card)
    c = _clean_chain(chain, project.user_id)
    c.project_id = project.id
    c.created_ms = now
    c.updated_ms = now
    db.add(c)
    for item in chapters:
        row = _clean_chapter(item, project.user_id)
        row.project_id = project.id
        row.created_ms = now
        row.updated_ms = now
        db.add(row)
    project.storycard_revision = max(1, int(project.storycard_revision or 0))
    project.creation_mode = "storycard"


def _beat_for(index: int, total: int) -> str:
    if total <= 1:
        return "铺垫"
    ratio = index / max(1, total - 1)
    if ratio == 0:
        return "铺垫"
    if ratio < 0.2:
        return "激励事件"
    if ratio < 0.45:
        return "上升"
    if ratio < 0.6:
        return "中点"
    if ratio < 0.78:
        return "低谷"
    if ratio < 0.92:
        return "高潮"
    return "收束"


def _tension_for(index: int, total: int) -> str:
    if total <= 1:
        return "5"
    value = 3 + round(6 * index / max(1, total - 1))
    return str(max(1, min(10, value)))


def _extract_labeled(text: str, labels: list[str]) -> str:
    if not text:
        return ""
    for label in labels:
        match = re.search(rf"{label}\s*[:：]\s*([^\n。；;]+)", text)
        if match:
            return match.group(1).strip()
    return ""


def _role_field(role_type: Optional[str]) -> str:
    mapping = {
        "protagonist": "主角",
        "antagonist": "反派",
        "supporting": "配角",
        "mentor": "导师",
        "love_interest": "情感线",
        "hidden": "隐藏",
    }
    return mapping.get((role_type or "").strip(), "配角")


def _status_field(status: Optional[str]) -> str:
    return {
        "active": "present",
        "deceased": "dead",
        "missing": "missing",
        "retired": "away",
        "destroyed": "dead",
    }.get((status or "").strip(), "present")


def _foreshadow_status(status: Optional[str]) -> str:
    return "resolved" if (status or "") in {"resolved", "partially_resolved"} else "pending"


def _category_field(category: Optional[str]) -> str:
    return {
        "identity": "身份",
        "mystery": "秘密",
        "item": "物品",
        "relationship": "关系",
        "event": "事件",
    }.get((category or "").strip(), "秘密")


async def import_from_classic(
    project: Project,
    user_id: str,
    db: AsyncSession,
    *,
    overwrite: bool = False,
) -> dict[str, Any]:
    """把原模式的世界/角色/组织/关系/大纲/章节/伏笔转换为卡牌工作区。"""
    existing = (
        await db.execute(select(func.count(StoryCard.id)).where(StoryCard.project_id == project.id))
    ).scalar_one()
    if existing and not overwrite:
        raise ValueError("工作区已有卡牌，请确认覆盖后再导入")

    characters = (
        await db.execute(
            select(Character).where(Character.project_id == project.id).order_by(Character.created_at.asc())
        )
    ).scalars().all()
    relationships = (
        await db.execute(
            select(CharacterRelationship).where(CharacterRelationship.project_id == project.id)
        )
    ).scalars().all()
    organizations = (
        await db.execute(
            select(Organization).where(Organization.project_id == project.id)
        )
    ).scalars().all()
    outlines = (
        await db.execute(
            select(Outline).where(Outline.project_id == project.id).order_by(Outline.order_index.asc())
        )
    ).scalars().all()
    chapters = (
        await db.execute(
            select(Chapter).where(Chapter.project_id == project.id).order_by(Chapter.chapter_number.asc())
        )
    ).scalars().all()
    foreshadows = (
        await db.execute(
            select(Foreshadow).where(Foreshadow.project_id == project.id).order_by(Foreshadow.created_at.asc())
        )
    ).scalars().all()

    org_by_character = {org.character_id: org for org in organizations}
    org_members = []
    if organizations:
        org_members = (
            await db.execute(
                select(OrganizationMember).where(
                    OrganizationMember.organization_id.in_([o.id for o in organizations])
                )
            )
        ).scalars().all()

    now = int(datetime.now().timestamp() * 1000)
    project_short = _short_id(project.id)
    world_id = f"world-{project.id}"
    region_id = f"region-{project.id}"
    location_id = f"location-{project_short}-main"
    chain_id = f"chain-{project_short}-main"

    region_name = _first_line(project.world_location, 40) or "主舞台"
    world = StoryCardIn(
        id=world_id,
        type="world",
        name=_text(project.title, 200) or "未命名世界",
        oneLiner=_text(project.theme, 160),
        summary=_text(project.description, 2000),
        body=_text(project.world_rules, 8000),
        tags=["世界", "导入"],
        importance=1.0,
        status="stable",
        fields={
            "era": project.world_time_period or "",
            "power": project.world_rules or "",
            "taboo": "",
            "naming": "",
        },
        meta={},
        createdAt=now,
        updatedAt=now,
    )
    region = StoryCardIn(
        id=region_id,
        type="region",
        name=region_name,
        oneLiner=_text(project.world_atmosphere, 160),
        summary=_text(project.world_location, 2000),
        body="",
        tags=["区域", "导入"],
        importance=0.85,
        status="open",
        fields={
            "regionType": "城市",
            "sensory": _text(project.world_atmosphere, 1000),
            "travel": "",
            "control": "",
            "danger": "3",
            "stateNote": "",
        },
        meta={"x": 120, "y": 120},
        createdAt=now,
        updatedAt=now,
    )
    location = StoryCardIn(
        id=location_id,
        type="location",
        name="主场景",
        oneLiner="导入项目的主要舞台",
        summary="",
        body="",
        tags=["地点", "导入"],
        importance=0.7,
        status="normal",
        fields={"kind": "宗门", "sensory": _text(project.world_atmosphere, 1000), "atmosphere": ""},
        meta={"regionId": region_id, "x": 160, "y": 160},
        createdAt=now,
        updatedAt=now,
    )

    cards: list[StoryCardIn] = [world, region, location]
    edges: list[StoryEdgeIn] = [
        StoryEdgeIn(
            id=f"edge-{uuid.uuid4().hex[:16]}",
            **{"from": world_id, "to": region_id},
            type="belongs",
            label="包含",
            strength=60,
            notes="",
            createdAt=now,
            updatedAt=now,
        )
    ]

    def edge_id() -> str:
        return f"edge-{uuid.uuid4().hex[:16]}"

    # 人物与势力
    name_to_card: dict[str, str] = {}
    char_card_ids: list[str] = []
    for character in characters:
        if character.is_organization:
            card_id = f"faction-{character.id}"
            org = org_by_character.get(character.id)
            cards.append(
                StoryCardIn(
                    id=card_id,
                    type="faction",
                    name=_text(character.name, 200),
                    oneLiner=_text(character.organization_purpose, 160),
                    summary=_text(character.background, 2000),
                    body="\n".join(part for part in [_text(character.personality), _text(character.organization_members)] if part),
                    tags=["势力", "导入"] + ([] if not character.organization_type else [character.organization_type]),
                    importance=0.75,
                    status="rising" if (org and (org.power_level or 0) >= 50) else "damaged",
                    fields={
                        "goal": _text(character.organization_purpose, 4000),
                        "resources": _text(character.organization_members, 4000),
                        "stance": "",
                    },
                    meta={},
                    createdAt=now,
                    updatedAt=now,
                )
            )
            name_to_card[character.name] = card_id
            if org:
                cards[-1].fields["powerLevel"] = str(org.power_level or 50)
            continue

        card_id = f"char-{character.id}"
        char_card_ids.append(card_id)
        personality = _text(character.personality)
        background = _text(character.background)
        appearance = _text(character.appearance)
        cards.append(
            StoryCardIn(
                id=card_id,
                type="character",
                name=_text(character.name, 200),
                oneLiner=_extract_labeled(personality + "\n" + background, ["一句话", "定位", "身份"]) or "",
                summary=background or personality,
                body="\n".join(part for part in [appearance, personality, background] if part),
                tags=["人物", "导入"] + ([character.role_type] if character.role_type else []),
                importance=0.95 if character.role_type == "protagonist" else 0.8 if character.role_type == "antagonist" else 0.55,
                status=_status_field(character.status),
                fields={
                    "role": _role_field(character.role_type),
                    "desire": _extract_labeled(personality + "\n" + background, ["欲望", "目标", "想要"]),
                    "fear": _extract_labeled(personality + "\n" + background, ["恐惧", "害怕"]),
                    "flaw": _extract_labeled(personality + "\n" + background, ["缺陷", "弱点"]),
                    "lie": _extract_labeled(personality + "\n" + background, ["信条", "谎言", "信念"]),
                    "speech": _extract_labeled(personality, ["说话风格", "口癖", "语气"]),
                    "arc": "起",
                    "secret": _extract_labeled(background, ["秘密"]),
                },
                meta={},
                createdAt=now,
                updatedAt=now,
            )
        )
        name_to_card[character.name] = card_id

    # 角色关系
    for rel in relationships:
        from_id = name_to_card.get(next((c.name for c in characters if c.id == rel.character_from_id), ""))
        to_id = name_to_card.get(next((c.name for c in characters if c.id == rel.character_to_id), ""))
        if not from_id or not to_id or from_id == to_id:
            continue
        edges.append(
            StoryEdgeIn(
                id=edge_id(),
                **{"from": from_id, "to": to_id},
                type="relation",
                label=_text(rel.relationship_name, 100) or "关系",
                strength=int(rel.intimacy_level or 0),
                notes=_text(rel.description, 2000),
                createdAt=now,
                updatedAt=now,
            )
        )

    # 组织成员
    org_card_by_org_id = {
        org.id: f"faction-{org.character_id}"
        for org in organizations
        if f"faction-{org.character_id}" in name_to_card.values()
    }
    for member in org_members:
        org_card = org_card_by_org_id.get(member.organization_id)
        member_card = name_to_card.get(next((c.name for c in characters if c.id == member.character_id), ""))
        if not org_card or not member_card:
            continue
        edges.append(
            StoryEdgeIn(
                id=edge_id(),
                **{"from": member_card, "to": org_card},
                type="belongs",
                label=_text(member.position, 100) or "成员",
                strength=50,
                notes="",
                createdAt=now,
                updatedAt=now,
            )
        )

    # 大纲 → 事件卡
    chapters_by_outline: dict[str, int] = {}
    for chapter in chapters:
        if chapter.outline_id and chapter.chapter_number:
            current = chapters_by_outline.get(chapter.outline_id)
            if current is None or chapter.chapter_number < current:
                chapters_by_outline[chapter.outline_id] = chapter.chapter_number
    chapter_content = {c.chapter_number: _text(c.content) for c in chapters}
    event_ids: list[str] = []
    total_outlines = len(outlines)
    for index, outline in enumerate(outlines):
        structure = _loads(outline.structure, {})
        if not isinstance(structure, dict):
            structure = {}
        summary = _text(structure.get("summary")) or _text(outline.content)
        scenes = structure.get("scenes") or []
        if isinstance(scenes, str):
            scenes = [scenes]
        place = ""
        if scenes:
            first_scene = scenes[0]
            if isinstance(first_scene, dict):
                place = _text(first_scene.get("location") or first_scene.get("place") or first_scene.get("name"))
            else:
                place = _text(first_scene)
            place = _first_line(place, 60)
        participants_names = structure.get("characters") or []
        if isinstance(participants_names, str):
            participants_names = [participants_names]
        participant_ids = [
            name_to_card[name] for name in participants_names
            if isinstance(name, str) and name in name_to_card and name_to_card[name].startswith("char-")
        ]
        key_points = structure.get("key_points") or structure.get("keyPoints") or []
        if isinstance(key_points, str):
            key_points = [key_points]
        goal = _text(structure.get("goal") or structure.get("objective"))
        emotion = _text(structure.get("emotion") or structure.get("emotional_tone"))
        chapter_no = chapters_by_outline.get(outline.id)
        if chapter_no is None:
            chapter_no = min(index + 1, max(1, total_outlines))
        event_id = f"event-{outline.id}"
        event_ids.append(event_id)
        cards.append(
            StoryCardIn(
                id=event_id,
                type="event",
                name=_text(outline.title, 200) or f"事件 {index + 1}",
                oneLiner=_first_line(summary, 80),
                summary=summary,
                body=_text(outline.content),
                tags=["事件", "导入"] + ([emotion] if emotion else []),
                importance=0.7,
                status="written" if chapter_content.get(chapter_no) else "planned",
                order=index + 1,
                chapter=chapter_no,
                chainIds=[chain_id],
                fields={
                    "time": f"第{chapter_no}章",
                    "place": place or location.name,
                    "participants": participant_ids,
                    "goal": goal or summary,
                    "obstacle": "",
                    "turn": "",
                    "outcome": summary,
                    "delta": "",
                    "beat": _beat_for(index, total_outlines),
                    "tension": _tension_for(index, total_outlines),
                    "pov": _text(participants_names[0]) if participants_names else "",
                    "reveal": "；".join(str(x) for x in key_points if x),
                },
                meta={"regionId": region_id, "locationId": location_id},
                createdAt=now,
                updatedAt=now,
            )
        )
        if index > 0:
            edges.append(
                StoryEdgeIn(
                    id=edge_id(),
                    **{"from": f"event-{outlines[index - 1].id}", "to": event_id},
                    type="causes",
                    label="推进",
                    strength=50,
                    notes="",
                    createdAt=now,
                    updatedAt=now,
                )
            )
    for event_id in event_ids:
        edges.append(
            StoryEdgeIn(
                id=edge_id(),
                **{"from": event_id, "to": region_id},
                type="belongs",
                label="发生于",
                strength=30,
                notes="",
                createdAt=now,
                updatedAt=now,
            )
        )

    # 伏笔卡
    for foreshadow in foreshadows:
        fore_id = f"fore-{foreshadow.id}"
        cards.append(
            StoryCardIn(
                id=fore_id,
                type="foreshadow",
                name=_text(foreshadow.title, 200) or "未命名伏笔",
                oneLiner=_first_line(foreshadow.content, 80),
                summary=_text(foreshadow.content, 2000),
                body="\n".join(part for part in [
                    f"埋设：{foreshadow.hint_text}" if foreshadow.hint_text else "",
                    f"回收：{foreshadow.resolution_text}" if foreshadow.resolution_text else "",
                    _text(foreshadow.notes),
                ] if part),
                tags=["伏笔", "导入"] + list(foreshadow.tags or []),
                importance=float(foreshadow.importance or 0.5),
                status=_foreshadow_status(foreshadow.status),
                fields={
                    "hint": _text(foreshadow.hint_text) or _text(foreshadow.content),
                    "planted": f"第{foreshadow.plant_chapter_number}章" if foreshadow.plant_chapter_number else "",
                    "plan": f"第{foreshadow.target_resolve_chapter_number}章" if foreshadow.target_resolve_chapter_number else "",
                    "category": _category_field(foreshadow.category),
                },
                meta={"regionId": region_id},
                createdAt=now,
                updatedAt=now,
            )
        )
        for name in (foreshadow.related_characters or []):
            target = name_to_card.get(name)
            if target:
                edges.append(
                    StoryEdgeIn(
                        id=edge_id(),
                        **{"from": fore_id, "to": target},
                        type="secret",
                        label="牵涉",
                        strength=40,
                        notes="",
                        createdAt=now,
                        updatedAt=now,
                    )
                )

    # 章节与位置快照
    max_event_chapter = max([c.chapter or 1 for c in cards if c.type == "event"], default=1)
    story_chapters: list[StoryChapterIn] = []
    existing_numbers = sorted({c.chapter_number for c in chapters if c.chapter_number})
    max_chapter = max([max_event_chapter, *existing_numbers, 1])
    chapter_by_number = {c.chapter_number: c for c in chapters}
    default_titles = ["开篇", "承接", "转折", "冲突", "高潮", "收束"]
    for number in range(1, max_chapter + 1):
        source = chapter_by_number.get(number)
        source_title = _text(source.title, 200) if source else ""
        # 原模式常把标题直接写成“第N章”，转成更有信息量的默认标题
        if not source_title or re.fullmatch(rf"第\s*{number}\s*章", source_title.strip()):
            source_title = default_titles[number - 1] if number <= len(default_titles) else f"第{number}章"
        story_chapters.append(
            StoryChapterIn(
                id=f"chapter-{project_short}-{number}",
                number=number,
                title=source_title,
                summary=_text(source.summary, 4000) if source else "",
                eventIds=[e for e, card in zip(event_ids, [c for c in cards if c.type == "event"]) if card.chapter == number],
                locations={cid: location_id for cid in char_card_ids},
                status="draft" if source else "planned",
            )
        )

    chain = StoryChainIn(
        id=chain_id,
        name="主线",
        kind="主线",
        goal=_text(project.theme or project.description, 4000),
        color="#b3452f",
        eventIds=event_ids,
        description="由原模式大纲导入。",
        status="planning",
    )

    payload = StoryWorkspaceSave(
        revision=int(project.storycard_revision or 0),
        cards=cards,
        edges=edges,
        chains=[chain],
        chapters=story_chapters,
        premise=project.description or "",
        genre=project.genre or "",
        theme=project.theme or "",
    )
    project.creation_mode = "storycard"
    workspace = await replace_workspace(project, payload, user_id, db, check_revision=False)
    workspace["imported"] = {
        "characters": len([c for c in characters if not c.is_organization]),
        "organizations": len(organizations),
        "outlines": len(outlines),
        "chapters": len(chapters),
        "foreshadows": len(foreshadows),
        "cards": len(cards),
        "edges": len(edges),
    }
    logger.info("故事卡牌模式导入完成: project=%s cards=%s", project.id, len(cards))
    return workspace


def allowed_fields(card: StoryCardIn) -> set[str]:
    """返回一张卡允许被批量修改的字段（与前端 CARD_META 对齐）。"""
    base = {"name", "oneLiner", "summary", "body"}
    per_type = {
        "world": {"era", "power", "taboo", "naming"},
        "region": {"regionType", "sensory", "travel", "control", "danger", "stateNote"},
        "location": {"kind", "sensory", "atmosphere"},
        "character": {"role", "desire", "fear", "flaw", "lie", "speech", "arc", "secret"},
        "faction": {"goal", "resources", "stance"},
        "item": {"ability", "cost", "holder", "chekhov"},
        "event": {
            "time", "place", "participants", "goal", "obstacle", "turn", "outcome",
            "delta", "beat", "tension", "pov", "reveal",
        },
        "foreshadow": {"hint", "planted", "plan", "category"},
    }
    return base | per_type.get(card.type, set())


def card_plan_brief(card: StoryCard) -> dict[str, Any]:
    fields = _loads(card.fields, {})
    compact_fields = {
        key: (value[:240] if isinstance(value, str) else value)
        for key, value in fields.items()
        if value not in (None, "", [])
    }
    return {
        "id": card.id,
        "type": card.card_type,
        "name": card.name,
        "oneLiner": (card.one_liner or "")[:160],
        "summary": (card.summary or "")[:240],
        "status": card.status or "",
        "chapter": card.chapter_no,
        "fields": compact_fields,
    }
