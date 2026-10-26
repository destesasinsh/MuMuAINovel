"""故事卡牌模式 API：工作区、经典项目导入、字段级 AI 与指令规划。"""
from __future__ import annotations

import json
import uuid
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.settings import get_user_ai_service_from_db, resolve_runtime_ai_config
from app.config import settings as app_settings
from app.database import get_db
from app.logger import get_logger
from app.models.project import Project
from app.models.settings import Settings
from app.models.storycard import StoryCard, StoryCardEdge
from app.schemas.storycard import (
    StoryCompleteRequest,
    StoryFieldAssistRequest,
    StoryImportRequest,
    StoryPlanRequest,
    StoryRelationRequest,
    StoryWorkspaceSave,
)
from app.services.ai_service import AIService
from app.services.json_helper import parse_json
from app.services.storycard_service import (
    StoryCardRevisionConflict,
    allowed_fields,
    card_plan_brief,
    get_workspace,
    import_from_classic,
    replace_workspace,
)

router = APIRouter(prefix="/storycard", tags=["故事卡牌模式"])
logger = get_logger(__name__)

FIELD_LABELS = {
    "name": "名称",
    "oneLiner": "一句话",
    "summary": "摘要",
    "body": "详述",
    "era": "时代背景",
    "power": "力量体系",
    "taboo": "世界禁忌",
    "naming": "命名风格",
    "regionType": "区域类型",
    "sensory": "感官细节",
    "travel": "通行方式",
    "control": "当前控制势力",
    "danger": "危险等级",
    "stateNote": "动态状态",
    "kind": "场所类型",
    "atmosphere": "氛围关键词",
    "role": "功能定位",
    "desire": "欲望",
    "fear": "恐惧",
    "flaw": "缺陷",
    "lie": "谎言（信条）",
    "speech": "说话风格",
    "arc": "弧光阶段",
    "secret": "秘密",
    "goal": "目标",
    "resources": "资源",
    "stance": "态度",
    "ability": "能力",
    "cost": "代价",
    "holder": "当前持有者",
    "chekhov": "道具权重",
    "time": "故事时间",
    "place": "地点",
    "participants": "参与者",
    "obstacle": "障碍",
    "turn": "转折",
    "outcome": "结果",
    "delta": "状态变化",
    "beat": "节拍",
    "tension": "紧张度",
    "pov": "视角",
    "reveal": "释放的信息",
    "hint": "埋设方式",
    "planted": "埋于",
    "plan": "计划回收",
    "category": "伏笔类型",
}


def _user_id(request: Request) -> str:
    user_id = getattr(request.state, "user_id", None)
    if not user_id:
        raise HTTPException(status_code=401, detail="未登录")
    return user_id


async def _get_project(project_id: str, user_id: str, db: AsyncSession) -> Project:
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == user_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    return project


async def _ai_status(user_id: str, db: AsyncSession) -> dict[str, Any]:
    result = await db.execute(select(Settings).where(Settings.user_id == user_id))
    user_settings = result.scalar_one_or_none()
    provider = (user_settings.api_provider if user_settings else "openai") or "openai"
    model = (user_settings.llm_model if user_settings else "") or app_settings.default_model or ""
    resolved = resolve_runtime_ai_config(
        provider,
        user_settings.api_key if user_settings else None,
        user_settings.api_base_url if user_settings else None,
    )
    available = bool(resolved.get("api_key"))
    return {
        "available": available,
        "provider": resolved.get("raw_provider") or provider,
        "model": model,
        "message": "已配置 AI 模型，字段级 AI 会调用项目设置中的模型" if available
        else "尚未配置 AI Key，将使用本地 Mock 生成",
    }


async def _get_ai(user_id: str, db: AsyncSession) -> AIService:
    status = await _ai_status(user_id, db)
    if not status["available"]:
        raise HTTPException(status_code=400, detail="尚未配置 AI 模型，请先在「设置 → API 设置」中填写 Key")
    return await get_user_ai_service_from_db(user_id, db)


def _snippet(value: Any, limit: int = 600) -> str:
    text = "" if value is None else str(value)
    return text[:limit]


@router.get("/ai/status", summary="卡牌模式 AI 是否可用")
async def ai_status(request: Request, db: AsyncSession = Depends(get_db)):
    return await _ai_status(_user_id(request), db)


@router.get("/projects/{project_id}", summary="获取故事卡牌工作区")
async def get_storycard_workspace(
    project_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    user_id = _user_id(request)
    project = await _get_project(project_id, user_id, db)
    return await get_workspace(project, db)


@router.put("/projects/{project_id}", summary="保存故事卡牌工作区")
async def save_storycard_workspace(
    project_id: str,
    payload: StoryWorkspaceSave,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    user_id = _user_id(request)
    project = await _get_project(project_id, user_id, db)
    try:
        return await replace_workspace(project, payload, user_id, db)
    except StoryCardRevisionConflict as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/projects/{project_id}/import", summary="从原模式项目导入卡牌")
async def import_storycard_project(
    project_id: str,
    payload: StoryImportRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    user_id = _user_id(request)
    project = await _get_project(project_id, user_id, db)
    try:
        return await import_from_classic(project, user_id, db, overwrite=payload.overwrite)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.post("/projects/{project_id}/ai/assist", summary="字段级 AI 辅助")
async def assist_field(
    project_id: str,
    payload: StoryFieldAssistRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    user_id = _user_id(request)
    await _get_project(project_id, user_id, db)
    ai = await _get_ai(user_id, db)
    card = payload.card
    current = card.name if payload.field in {"name", "oneLiner", "summary", "body"} and payload.field == "name" else card.fields.get(payload.field, "")
    if payload.field in {"oneLiner", "summary", "body"}:
        current = getattr(card, payload.field, "")
    context = {
        "项目前提": _snippet(payload.premise, 1200),
        "卡牌类型": card.type,
        "卡牌名称": card.name,
        "一句话": _snippet(card.oneLiner, 400),
        "摘要": _snippet(card.summary, 800),
        "目标字段": payload.field_label or FIELD_LABELS.get(payload.field, payload.field),
        "当前值": _snippet(current, 2000),
        "动作": payload.action or "改写",
        "相关卡牌": payload.related[:20],
    }
    system = (
        "你是一位中文小说策划。根据给定卡牌上下文，为目标字段写一段可直接填入的内容。"
        "只输出字段正文，不要解释、不要加引号或前缀；控制在 120 字以内，保持与已有设定一致。"
    )
    try:
        response = await ai.generate_text(
            prompt=json.dumps(context, ensure_ascii=False, indent=2),
            system_prompt=system,
            temperature=0.85,
            max_tokens=600,
            auto_mcp=False,
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("卡牌字段 AI 失败: %s", exc)
        raise HTTPException(status_code=502, detail="AI 生成失败，请检查模型配置") from exc
    value = (response.get("content") or "").strip().strip('"').strip("“”")
    if not value:
        raise HTTPException(status_code=502, detail="AI 返回为空")
    return {"value": value, "source": "ai"}


@router.post("/projects/{project_id}/ai/complete", summary="AI 补全卡牌缺失字段")
async def complete_fields(
    project_id: str,
    payload: StoryCompleteRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    user_id = _user_id(request)
    await _get_project(project_id, user_id, db)
    ai = await _get_ai(user_id, db)
    card = payload.card
    fields = payload.fields or []
    if not fields:
        fields = [
            {"key": key, "label": FIELD_LABELS.get(key, key), "placeholder": ""}
            for key in allowed_fields(card)
            if key not in {"name"} and not card.fields.get(key)
        ][:6]
    context = {
        "项目前提": _snippet(payload.premise, 1200),
        "卡牌": {
            "type": card.type,
            "name": card.name,
            "oneLiner": _snippet(card.oneLiner, 300),
            "summary": _snippet(card.summary, 600),
            "fields": {k: _snippet(v, 300) for k, v in card.fields.items()},
        },
        "待补字段": [{"key": f.key, "label": f.label or FIELD_LABELS.get(f.key, f.key), "placeholder": f.placeholder} for f in fields],
    }
    system = (
        "你是一位中文小说策划。为给定卡牌补全缺失字段，保持与已有设定一致。"
        "只输出 JSON 数组，元素形如 {\"field\": \"字段 key\", \"value\": \"内容\"}；不要输出其他文字。"
    )
    try:
        result = await ai.call_with_json_retry(
            prompt=json.dumps(context, ensure_ascii=False, indent=2),
            system_prompt=system,
            expected_type="array",
            max_retries=2,
            temperature=0.8,
            max_tokens=1200,
            auto_mcp=False,
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("卡牌补全 AI 失败: %s", exc)
        raise HTTPException(status_code=502, detail="AI 生成失败，请检查模型配置") from exc
    if isinstance(result, dict):
        result = result.get("items") or result.get("fields") or []
    if not isinstance(result, list):
        result = []
    allowed = allowed_fields(card)
    items = []
    for item in result:
        if not isinstance(item, dict):
            continue
        key = str(item.get("field") or "").strip()
        value = str(item.get("value") or "").strip()
        if key in allowed and value:
            items.append({"field": key, "label": FIELD_LABELS.get(key, key), "value": value})
    if not items:
        raise HTTPException(status_code=502, detail="AI 没有返回可用的字段")
    return {"items": items[:8], "source": "ai"}


@router.post("/projects/{project_id}/ai/relations", summary="AI 联想卡牌关联")
async def suggest_relations(
    project_id: str,
    payload: StoryRelationRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    user_id = _user_id(request)
    await _get_project(project_id, user_id, db)
    ai = await _get_ai(user_id, db)
    card = payload.card
    candidates = [
        {"id": c.id, "type": c.type, "name": c.name, "oneLiner": _snippet(c.oneLiner, 120)}
        for c in payload.candidates
        if c.id != card.id
    ][:60]
    if not candidates:
        return {"items": [], "source": "ai"}
    context = {
        "项目前提": _snippet(payload.premise, 800),
        "当前卡牌": {"id": card.id, "type": card.type, "name": card.name, "summary": _snippet(card.summary, 400)},
        "已有直接关联": payload.existing_ids[:200],
        "候选卡牌": candidates,
        "允许的边类型": ["relation", "causes", "belongs", "controls", "owns", "path", "secret"],
    }
    system = (
        "你是一位小说结构编辑。为当前卡牌挑选最多 3 个最值得补充关联的候选卡，"
        "只输出 JSON 数组，元素形如 {\"toId\": \"候选 id\", \"type\": \"边类型\", \"label\": \"关系短语\", \"reason\": \"为什么\"}。"
        "只选候选列表里的 id，不要输出其他文字。"
    )
    try:
        result = await ai.call_with_json_retry(
            prompt=json.dumps(context, ensure_ascii=False, indent=2),
            system_prompt=system,
            expected_type="array",
            max_retries=2,
            temperature=0.75,
            max_tokens=900,
            auto_mcp=False,
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("卡牌关联 AI 失败: %s", exc)
        raise HTTPException(status_code=502, detail="AI 生成失败，请检查模型配置") from exc
    if isinstance(result, dict):
        result = result.get("items") or result.get("relations") or []
    if not isinstance(result, list):
        result = []
    candidate_map = {c["id"]: c for c in candidates}
    allowed_types = {"relation", "causes", "belongs", "controls", "owns", "path", "secret"}
    items = []
    for item in result:
        if not isinstance(item, dict):
            continue
        to_id = str(item.get("toId") or item.get("to") or "").strip()
        edge_type = str(item.get("type") or "relation").strip()
        if to_id not in candidate_map or edge_type not in allowed_types:
            continue
        items.append({
            "toId": to_id,
            "toName": candidate_map[to_id]["name"],
            "type": edge_type,
            "label": _snippet(item.get("label"), 60) or "关联",
            "reason": _snippet(item.get("reason"), 300),
        })
    return {"items": items[:3], "source": "ai"}


def _scope_cards(cards: list[StoryCard], chapters: list[Any], scope: str, chapter: int, selected_id: Optional[str]) -> list[StoryCard]:
    by_id = {c.id: c for c in cards}
    if scope == "selection":
        if not selected_id or selected_id not in by_id:
            return cards
        return [by_id[selected_id]]
    if scope == "chapter":
        story_chapter = next((c for c in chapters if c.chapter_number == chapter), None)
        if not story_chapter:
            return cards
        event_ids = set(story_chapter.event_ids or [])
        location_ids = set((story_chapter.locations or {}).values())
        character_ids = set((story_chapter.locations or {}).keys())
        involved = set(event_ids) | set(location_ids) | set(character_ids)
        for event_id in event_ids:
            event = by_id.get(event_id)
            if event:
                participants = (event.fields or {}).get("participants") if isinstance(event.fields, dict) else []
                if isinstance(participants, list):
                    involved.update(str(x) for x in participants)
        return [c for c in cards if c.id in involved]
    return cards


@router.post("/projects/{project_id}/ai/plan", summary="AI 指令规划（计划-预览-执行）")
async def plan_command(
    project_id: str,
    payload: StoryPlanRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    user_id = _user_id(request)
    await _get_project(project_id, user_id, db)
    ai = await _get_ai(user_id, db)
    cards = (
        await db.execute(select(StoryCard).where(StoryCard.project_id == project_id))
    ).scalars().all()
    if not cards:
        raise HTTPException(status_code=400, detail="工作区还没有卡牌")
    edges = (
        await db.execute(select(StoryCardEdge).where(StoryCardEdge.project_id == project_id))
    ).scalars().all()
    from app.models.storycard import StoryChapter
    chapters = (
        await db.execute(select(StoryChapter).where(StoryChapter.project_id == project_id))
    ).scalars().all()

    scoped = _scope_cards(cards, chapters, payload.scope, payload.chapter, payload.selected_id)
    if payload.scope == "selection" and payload.selected_id:
        selected = next((c for c in cards if c.id == payload.selected_id), None)
        if selected:
            neighbors = {
                e.to_card_id if e.from_card_id == selected.id else e.from_card_id
                for e in edges
                if selected.id in (e.from_card_id, e.to_card_id)
            }
            scoped = [selected] + [c for c in cards if c.id in neighbors]
    # 控制上下文规模：优先重要卡，同时保留全部人物/事件
    scoped = sorted(scoped, key=lambda c: (c.importance or 0), reverse=True)
    if len(scoped) > 120:
        scoped = scoped[:120]
    briefs = []
    for card in scoped:
        brief = card_plan_brief(card)
        # 名称走确定性改名规则，不让 AI 在计划里随意改
        brief["allowed_fields"] = sorted(field for field in allowed_fields(card) if field != "name")
        briefs.append(brief)

    scope_label = {"all": "全项目", "chapter": f"第 {payload.chapter} 章相关", "selection": "当前选中卡"}[payload.scope]
    system = (
        "你是一位中文小说结构编辑。把作者的一句话指令解析成可执行的结构化修改计划。"
        "只输出一个 JSON 对象，不要 markdown 代码块或解释。"
        "对象字段：title(计划标题), summary(一句话说明), mode(edit 或 report),"
        "ops(数组，每项 {card_id, field, field_label, before, after, risk}，risk 为 low/medium/high),"
        "report(可选数组，每项 {label, value}), impact(可选数组，每项 {label, value})。"
        "规则：只能使用给定卡牌的 id 和 allowed_fields 中的字段；before 必须来自当前值；"
        "创意类修改逐卡给出 after，最多 40 条；查询/巡检类指令 mode=report 且 ops 为空。"
        "改名、统一替换、时间整体平移这类确定性操作不要编造，交给程序规则处理。"
    )
    prompt = json.dumps(
        {
            "作者指令": payload.command,
            "作用范围": scope_label,
            "当前章节": payload.chapter,
            "卡牌": briefs,
        },
        ensure_ascii=False,
        indent=2,
    )
    try:
        result = await ai.call_with_json_retry(
            prompt=prompt,
            system_prompt=system,
            expected_type="object",
            max_retries=2,
            temperature=0.35,
            max_tokens=2600,
            auto_mcp=False,
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("卡牌指令规划 AI 失败: %s", exc)
        raise HTTPException(status_code=502, detail="AI 规划失败，请检查模型配置") from exc

    if isinstance(result, str):
        try:
            result = parse_json(result)
        except Exception:  # noqa: BLE001
            result = {}
    if not isinstance(result, dict):
        result = {}

    scoped_map = {c.id: c for c in scoped}
    ops = []
    raw_ops = result.get("ops") or []
    if not isinstance(raw_ops, list):
        raw_ops = []
    for raw in raw_ops[:40]:
        if not isinstance(raw, dict):
            continue
        card_id = str(raw.get("card_id") or raw.get("cardId") or "").strip()
        card = scoped_map.get(card_id)
        if not card:
            continue
        field = str(raw.get("field") or "").strip()
        if field.startswith("name:"):
            field = field[5:]
        if field == "name" or field not in allowed_fields(card):
            continue
        before = card.name if field == "name" else card.one_liner if field == "oneLiner" else card.summary if field == "summary" else card.body if field == "body" else (card.fields or {}).get(field, "")
        after = raw.get("after")
        if after is None or str(after).strip() == "":
            continue
        risk = str(raw.get("risk") or "medium").lower()
        if risk not in {"low", "medium", "high"}:
            risk = "medium"
        ops.append({
            "id": f"op-{uuid.uuid4().hex[:12]}",
            "cardId": card.id,
            "field": field,
            "fieldLabel": str(raw.get("field_label") or FIELD_LABELS.get(field, field))[:60],
            "before": _snippet(before, 2000),
            "after": _snippet(after, 4000),
            "risk": risk,
            "checked": True,
        })

    def _pairs(value: Any) -> list[dict[str, str]]:
        if not isinstance(value, list):
            return []
        out = []
        for item in value[:8]:
            if isinstance(item, dict):
                out.append({"label": _snippet(item.get("label"), 60), "value": _snippet(item.get("value"), 600)})
            elif isinstance(item, str):
                out.append({"label": "提示", "value": item[:600]})
        return out

    mode = "edit" if ops else "report"
    return {
        "title": _snippet(result.get("title"), 80) or "AI 修改计划",
        "summary": _snippet(result.get("summary"), 600) or (
            f"将修改 {len(ops)} 张卡牌" if ops else "没有生成可执行的修改"
        ),
        "mode": mode,
        "ops": ops,
        "report": _pairs(result.get("report")) if mode == "report" else [],
        "impact": _pairs(result.get("impact")) or [{"label": "作用范围", "value": scope_label}],
        "scopeLabel": scope_label,
        "source": "ai",
    }