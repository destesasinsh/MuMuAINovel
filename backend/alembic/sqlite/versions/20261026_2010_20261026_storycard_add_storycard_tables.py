"""add storycard mode tables

Revision ID: 20261026_storycard
Revises: 20260914_knowledge
Create Date: 2026-10-26 20:10:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '20261026_storycard'
down_revision: Union[str, None] = '20260914_knowledge'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'projects',
        sa.Column('creation_mode', sa.String(length=20), server_default='classic', nullable=False),
    )
    op.add_column(
        'projects',
        sa.Column('storycard_revision', sa.Integer(), server_default='0', nullable=False),
    )

    op.create_table(
        'story_cards',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('project_id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=100), nullable=False),
        sa.Column('card_type', sa.String(length=20), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('one_liner', sa.Text(), nullable=True),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('body', sa.Text(), nullable=True),
        sa.Column('aliases', sa.JSON(), nullable=True),
        sa.Column('tags', sa.JSON(), nullable=True),
        sa.Column('importance', sa.Float(), nullable=True),
        sa.Column('status', sa.String(length=30), nullable=True),
        sa.Column('fields', sa.JSON(), nullable=True),
        sa.Column('history', sa.JSON(), nullable=True),
        sa.Column('meta', sa.JSON(), nullable=True),
        sa.Column('order_index', sa.Integer(), nullable=True),
        sa.Column('chapter_no', sa.Integer(), nullable=True),
        sa.Column('chain_ids', sa.JSON(), nullable=True),
        sa.Column('created_ms', sa.BigInteger(), nullable=True),
        sa.Column('updated_ms', sa.BigInteger(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_story_cards_project_id', 'story_cards', ['project_id'], unique=False)
    op.create_index('ix_story_cards_user_id', 'story_cards', ['user_id'], unique=False)
    op.create_index('ix_story_cards_card_type', 'story_cards', ['card_type'], unique=False)
    op.create_index('ix_story_cards_project_type', 'story_cards', ['project_id', 'card_type'], unique=False)

    op.create_table(
        'story_card_edges',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('project_id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=100), nullable=False),
        sa.Column('from_card_id', sa.String(length=64), nullable=False),
        sa.Column('to_card_id', sa.String(length=64), nullable=False),
        sa.Column('edge_type', sa.String(length=30), nullable=False),
        sa.Column('label', sa.String(length=200), nullable=True),
        sa.Column('strength', sa.Integer(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('meta', sa.JSON(), nullable=True),
        sa.Column('created_ms', sa.BigInteger(), nullable=True),
        sa.Column('updated_ms', sa.BigInteger(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_story_card_edges_project_id', 'story_card_edges', ['project_id'], unique=False)
    op.create_index('ix_story_card_edges_user_id', 'story_card_edges', ['user_id'], unique=False)
    op.create_index('ix_story_card_edges_from_card_id', 'story_card_edges', ['from_card_id'], unique=False)
    op.create_index('ix_story_card_edges_to_card_id', 'story_card_edges', ['to_card_id'], unique=False)
    op.create_index('ix_story_card_edges_edge_type', 'story_card_edges', ['edge_type'], unique=False)

    op.create_table(
        'story_chains',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('project_id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=100), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('kind', sa.String(length=50), nullable=True),
        sa.Column('goal', sa.Text(), nullable=True),
        sa.Column('color', sa.String(length=30), nullable=True),
        sa.Column('event_ids', sa.JSON(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=30), nullable=True),
        sa.Column('created_ms', sa.BigInteger(), nullable=True),
        sa.Column('updated_ms', sa.BigInteger(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_story_chains_project_id', 'story_chains', ['project_id'], unique=False)
    op.create_index('ix_story_chains_user_id', 'story_chains', ['user_id'], unique=False)

    op.create_table(
        'story_chapters',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('project_id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=100), nullable=False),
        sa.Column('chapter_number', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('event_ids', sa.JSON(), nullable=True),
        sa.Column('locations', sa.JSON(), nullable=True),
        sa.Column('status', sa.String(length=30), nullable=True),
        sa.Column('chapter_id', sa.String(length=36), nullable=True),
        sa.Column('created_ms', sa.BigInteger(), nullable=True),
        sa.Column('updated_ms', sa.BigInteger(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.ForeignKeyConstraint(['chapter_id'], ['chapters.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_story_chapters_project_id', 'story_chapters', ['project_id'], unique=False)
    op.create_index('ix_story_chapters_user_id', 'story_chapters', ['user_id'], unique=False)
    op.create_index('ix_story_chapters_chapter_number', 'story_chapters', ['chapter_number'], unique=False)
    op.create_index('ix_story_chapters_project_number', 'story_chapters', ['project_id', 'chapter_number'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_story_chapters_project_number', table_name='story_chapters')
    op.drop_index('ix_story_chapters_chapter_number', table_name='story_chapters')
    op.drop_index('ix_story_chapters_user_id', table_name='story_chapters')
    op.drop_index('ix_story_chapters_project_id', table_name='story_chapters')
    op.drop_table('story_chapters')

    op.drop_index('ix_story_chains_user_id', table_name='story_chains')
    op.drop_index('ix_story_chains_project_id', table_name='story_chains')
    op.drop_table('story_chains')

    op.drop_index('ix_story_card_edges_edge_type', table_name='story_card_edges')
    op.drop_index('ix_story_card_edges_to_card_id', table_name='story_card_edges')
    op.drop_index('ix_story_card_edges_from_card_id', table_name='story_card_edges')
    op.drop_index('ix_story_card_edges_user_id', table_name='story_card_edges')
    op.drop_index('ix_story_card_edges_project_id', table_name='story_card_edges')
    op.drop_table('story_card_edges')

    op.drop_index('ix_story_cards_project_type', table_name='story_cards')
    op.drop_index('ix_story_cards_card_type', table_name='story_cards')
    op.drop_index('ix_story_cards_user_id', table_name='story_cards')
    op.drop_index('ix_story_cards_project_id', table_name='story_cards')
    op.drop_table('story_cards')

    with op.batch_alter_table('projects') as batch_op:
        batch_op.drop_column('storycard_revision')
        batch_op.drop_column('creation_mode')
