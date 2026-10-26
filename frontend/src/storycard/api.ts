import type { Card, CommandPlan, Edge, Project, PlanOp } from './types';

const BASE = '/api/storycard';

export class StoryCardApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = 'StoryCardApiError';
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(BASE + path, {
    ...init,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  if (response.status === 401) {
    window.location.href = '/login';
    throw new StoryCardApiError(401, '登录状态已失效');
  }
  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!response.ok) {
    const detail =
      typeof data === 'object' && data && 'detail' in data
        ? String((data as { detail?: unknown }).detail)
        : typeof data === 'string'
          ? data
          : `请求失败 (${response.status})`;
    throw new StoryCardApiError(response.status, detail);
  }
  return data as T;
}

export interface AiStatus {
  available: boolean;
  provider: string;
  model: string;
  message: string;
}

export interface WorkspaceSavePayload {
  revision: number;
  cards: Card[];
  edges: Edge[];
  chains: Project['chains'];
  chapters: Project['chapters'];
  premise: string;
  genre: string;
  theme: string;
}

function savePayload(project: Project, revision: number): WorkspaceSavePayload {
  return {
    revision,
    cards: project.cards,
    edges: project.edges,
    chains: project.chains,
    chapters: project.chapters,
    premise: project.premise,
    genre: project.genre,
    theme: project.theme,
  };
}

export const storycardApi = {
  getWorkspace(projectId: string): Promise<Project> {
    return request<Project>(`/projects/${encodeURIComponent(projectId)}`);
  },

  saveWorkspace(projectId: string, project: Project, revision: number = project.revision): Promise<Project> {
    return request<Project>(`/projects/${encodeURIComponent(projectId)}`, {
      method: 'PUT',
      body: JSON.stringify(savePayload(project, revision)),
    });
  },

  importClassic(projectId: string, overwrite = false): Promise<Project> {
    return request<Project>(`/projects/${encodeURIComponent(projectId)}/import`, {
      method: 'POST',
      body: JSON.stringify({ overwrite }),
    });
  },

  getAiStatus(): Promise<AiStatus> {
    return request<AiStatus>('/ai/status');
  },

  async assistField(
    projectId: string,
    card: Card,
    field: string,
    fieldLabel: string,
    action: string,
    premise: string,
    related: string[],
  ): Promise<string> {
    const result = await request<{ value: string }>(`/projects/${encodeURIComponent(projectId)}/ai/assist`, {
      method: 'POST',
      body: JSON.stringify({ card, field, field_label: fieldLabel, action, premise, related }),
    });
    return result.value;
  },

  async completeFields(
    projectId: string,
    card: Card,
    fields: { key: string; label: string; placeholder?: string }[],
    premise: string,
  ): Promise<{ field: string; label: string; value: string }[]> {
    const result = await request<{ items: { field: string; label: string; value: string }[] }>(
      `/projects/${encodeURIComponent(projectId)}/ai/complete`,
      {
        method: 'POST',
        body: JSON.stringify({ card, fields, premise }),
      },
    );
    return result.items || [];
  },

  async suggestRelations(
    projectId: string,
    card: Card,
    candidates: Card[],
    existingIds: string[],
    premise: string,
  ): Promise<{ toId: string; toName: string; type: Edge['type']; label: string; reason: string }[]> {
    const result = await request<{
      items: { toId: string; toName: string; type: Edge['type']; label: string; reason: string }[];
    }>(`/projects/${encodeURIComponent(projectId)}/ai/relations`, {
      method: 'POST',
      body: JSON.stringify({ card, candidates, existing_ids: existingIds, premise }),
    });
    return result.items || [];
  },

  async planCommand(
    projectId: string,
    command: string,
    scope: 'all' | 'chapter' | 'selection',
    chapter: number,
    selectedId: string | null,
  ): Promise<CommandPlan> {
    const result = await request<{
      title: string;
      summary: string;
      mode: 'edit' | 'report';
      ops: Array<{
        id: string;
        cardId: string;
        field: string;
        fieldLabel: string;
        before: string;
        after: string;
        risk: PlanOp['risk'];
        checked: boolean;
      }>;
      report?: { label: string; value: string }[];
      impact?: { label: string; value: string }[];
      scopeLabel?: string;
    }>(`/projects/${encodeURIComponent(projectId)}/ai/plan`, {
      method: 'POST',
      body: JSON.stringify({ command, scope, chapter, selected_id: selectedId }),
    });
    return {
      title: result.title,
      summary: result.summary,
      mode: result.mode,
      ops: result.ops || [],
      report: result.report || [],
      impact: result.impact || [],
      scopeLabel: result.scopeLabel,
    };
  },
};
