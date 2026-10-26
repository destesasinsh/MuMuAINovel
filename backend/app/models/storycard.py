"""故事卡牌模式数据模型

对应 storycard-demo 的 cards / edges / chains / chapters 数据结构。
- 公共字段列化，类型特有字段放 fields JSON
- 边、链、章节均按 project 隔离
- 前端仍以 camelCase 读写，API 层做序列化
"""
from sqlalchemy import (
    BigInteger,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.sql import func

from app.database import Base


class StoryCard(Base):
    """统一卡牌表：世界/区域/地点/人物/势力/物品/事件/伏笔"""

    __tablename__ = "story_cards"

    id = Column(String(64), primary_key=True)
    project_id = Column(
        String(36),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(String(100), nullable=False, index=True)
    card_type = Column(String(20), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    one_liner = Column(Text, comment="一句话，AI 检索用")
    summary = Column(Text, comment="摘要")
    body = Column(Text, comment="完整设定/长文本")
    aliases = Column(JSON, comment="别名/尊称/化名")
    tags = Column(JSON, comment="标签")
    importance = Column(Float, default=0.5, comment="重要度 0-1")
    status = Column(String(30), comment="按卡类型的状态机")
    fields = Column(JSON, comment="按卡类型的结构化字段")
    history = Column(JSON, comment="字段级版本历史")
    meta = Column(JSON, comment="画布坐标、区域归属等")
    order_index = Column(Integer, comment="事件的故事内顺序")
    chapter_no = Column(Integer, comment="事件落到的章节号")
    chain_ids = Column(JSON, comment="事件所属链")
    created_ms = Column(BigInteger, comment="创建时间（毫秒时间戳）")
    updated_ms = Column(BigInteger, comment="更新时间（毫秒时间戳）")
    created_at = Column(DateTime, server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), comment="更新时间")

    __table_args__ = (
        Index("ix_story_cards_project_type", "project_id", "card_type"),
    )


class StoryCardEdge(Base):
    """类型化卡牌关联（任意卡到任意卡）"""

    __tablename__ = "story_card_edges"

    id = Column(String(64), primary_key=True)
    project_id = Column(
        String(36),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(String(100), nullable=False, index=True)
    from_card_id = Column(String(64), nullable=False, index=True)
    to_card_id = Column(String(64), nullable=False, index=True)
    edge_type = Column(String(30), nullable=False, index=True)
    label = Column(String(200))
    strength = Column(Integer, default=0, comment="-100..100")
    notes = Column(Text)
    meta = Column(JSON)
    created_ms = Column(BigInteger)
    updated_ms = Column(BigInteger)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class StoryChain(Base):
    """故事链：主线/支线/感情线等"""

    __tablename__ = "story_chains"

    id = Column(String(64), primary_key=True)
    project_id = Column(
        String(36),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(String(100), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    kind = Column(String(50))
    goal = Column(Text)
    color = Column(String(30))
    event_ids = Column(JSON, comment="有序事件卡 id")
    description = Column(Text)
    status = Column(String(30), default="planning")
    created_ms = Column(BigInteger)
    updated_ms = Column(BigInteger)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class StoryChapter(Base):
    """卡牌模式的章节施工图与人物位置快照"""

    __tablename__ = "story_chapters"

    id = Column(String(64), primary_key=True)
    project_id = Column(
        String(36),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(String(100), nullable=False, index=True)
    chapter_number = Column(Integer, nullable=False, index=True)
    title = Column(String(200), nullable=False)
    summary = Column(Text)
    event_ids = Column(JSON, comment="本章承载的事件卡 id")
    locations = Column(JSON, comment="characterId -> locationId 的位置快照")
    status = Column(String(30), default="draft")
    chapter_id = Column(
        String(36),
        ForeignKey("chapters.id", ondelete="SET NULL"),
        nullable=True,
        comment="可选：关联原模式 chapters 表，供后续正文写作闭环",
    )
    created_ms = Column(BigInteger)
    updated_ms = Column(BigInteger)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("ix_story_chapters_project_number", "project_id", "chapter_number"),
    )
