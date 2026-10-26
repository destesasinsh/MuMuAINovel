import { useEffect, useState } from 'react';
import { Form, Input, InputNumber, Modal, Select, message } from 'antd';
import { projectApi } from '../services/api';
import type { Project } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (project: Project) => void;
}

const genres = ['玄幻', '仙侠', '都市', '悬疑', '科幻', '历史', '言情', '奇幻', '武侠', '现实'];

export default function StoryCardCreateModal({ open, onClose, onCreated }: Props) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        title: '',
        premise: '',
        genre: '玄幻',
        target_words: 300000,
      });
    }
  }, [open, form]);

  const submit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const project = await projectApi.createProject({
        title: values.title.trim(),
        description: values.premise?.trim() || undefined,
        theme: values.theme?.trim() || undefined,
        genre: values.genre,
        target_words: values.target_words || 0,
        outline_mode: 'one-to-many',
        creation_mode: 'storycard',
      });
      message.success('卡牌项目已创建，正在打开工作台');
      onCreated(project);
      onClose();
    } catch (error) {
      if ((error as { errorFields?: unknown }).errorFields) return;
      console.error('创建卡牌项目失败:', error);
      message.error('创建失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="新建故事卡牌项目"
      open={open}
      onCancel={onClose}
      onOk={() => void submit()}
      okText="创建并进入工作台"
      cancelText="取消"
      confirmLoading={submitting}
      width={640}
      destroyOnHidden
    >
      <div style={{ marginBottom: 16, color: 'rgba(0,0,0,0.55)', fontSize: 13, lineHeight: 1.7 }}>
        卡牌模式与原模式的数据分开存储：卡牌、关联、故事链、章节快照会写进独立的工作区。
        创建后可以随时从原模式导入世界、人物、关系、大纲、章节与伏笔。
      </div>
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          name="title"
          label="项目名"
          rules={[{ required: true, message: '先给这个故事起个名字' }]}
        >
          <Input placeholder="例如：苍梧卷" maxLength={100} autoFocus />
        </Form.Item>
        <Form.Item name="premise" label="一句话前提">
          <Input.TextArea
            rows={3}
            maxLength={1000}
            placeholder="灵气退潮的九州，一个被逐出宗门的废物，追着父亲留下的一把断剑……"
          />
        </Form.Item>
        <div style={{ display: 'flex', gap: 16 }}>
          <Form.Item name="genre" label="类型" style={{ flex: 1 }}>
            <Select options={genres.map((g) => ({ label: g, value: g }))} />
          </Form.Item>
          <Form.Item name="theme" label="主题/母题" style={{ flex: 2 }}>
            <Input placeholder="一个人要花多大力气，才能不被世界当成废物" maxLength={200} />
          </Form.Item>
        </div>
        <Form.Item name="target_words" label="目标字数">
          <InputNumber min={0} max={10000000} step={10000} style={{ width: 220 }} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
