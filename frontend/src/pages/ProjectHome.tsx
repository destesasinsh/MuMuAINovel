import { useEffect } from 'react';
import { Spin } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { projectApi } from '../services/api';

/** /project/:id 的落点：卡牌项目进工作台，原模式项目去项目主页。 */
export default function ProjectHome() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    if (!projectId) {
      navigate('/projects', { replace: true });
      return;
    }
    projectApi
      .getProject(projectId)
      .then((project) => {
        if (!alive) return;
        if (project.creation_mode === 'storycard') {
          navigate(`/project/${projectId}/storycard`, { replace: true });
        } else {
          navigate(`/project/${projectId}/sponsor`, { replace: true });
        }
      })
      .catch(() => {
        if (alive) navigate('/projects', { replace: true });
      });
    return () => {
      alive = false;
    };
  }, [navigate, projectId]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <Spin size="large" />
    </div>
  );
}
