/**
 * 服务切换组件
 * 在 Lambda 和 EC2 两种后端服务之间切换
 */

import { useApi } from '../contexts/ApiContext';
import './ServiceSwitcher.css';

export function ServiceSwitcher() {
  const { serviceType, apiUrl, setServiceType } = useApi();

  return (
    <div className="service-switcher">
      <div className="switcher-info">
        <span className="current-service">
          当前服务: <strong>{serviceType === 'lambda' ? 'Lambda' : 'EC2'}</strong>
        </span>
        <span className="current-url" title={apiUrl}>
          {serviceType === 'lambda' ? '🚀 Serverless' : '💻 传统部署'}
        </span>
      </div>

      <div className="switcher-buttons">
        <button
          className={`switcher-btn ${serviceType === 'lambda' ? 'active' : ''}`}
          onClick={() => setServiceType('lambda')}
          disabled={serviceType === 'lambda'}
        >
          <span className="btn-icon">🚀</span>
          <span className="btn-text">Lambda</span>
          <span className="btn-desc">Serverless</span>
        </button>

        <button
          className={`switcher-btn ${serviceType === 'ec2' ? 'active' : ''}`}
          onClick={() => setServiceType('ec2')}
          disabled={serviceType === 'ec2'}
        >
          <span className="btn-icon">💻</span>
          <span className="btn-text">EC2</span>
          <span className="btn-desc">PM2 + Nginx</span>
        </button>
      </div>
    </div>
  );
}
