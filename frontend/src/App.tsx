/**
 * 主应用组件
 * Nest.js + AWS Serverless 学习项目 - 前端
 */

import { ItemList } from './components/ItemList';
import { GitHubProfile } from './components/GitHubProfile';
import { ServiceSwitcher } from './components/ServiceSwitcher';
import { useApi } from './contexts/ApiContext';
import './App.css';

function App() {
  const { serviceType } = useApi();

  return (
    <div className="app">
      <header className="app-header">
        <h1>Nest.js + React + AWS</h1>
        <p className="subtitle">Lambda & EC2 双部署演示</p>
      </header>

      <main className="app-main">
        {/* 服务切换器 */}
        <ServiceSwitcher />

        <div className="sections-container">
          <section className="section">
            <ItemList />
          </section>

          <section className="section-2">
            <GitHubProfile />
          </section>
        </div>
      </main>

      <footer className="app-footer">
        <p>
          Backend: {serviceType === 'lambda' ? 'AWS Lambda' : 'EC2 (PM2 + Nginx)'} + Aurora Serverless v2 + Prisma
          <br />
          Frontend: React + TypeScript
        </p>
      </footer>
    </div>
  );
}

export default App;
