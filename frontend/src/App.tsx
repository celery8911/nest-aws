/**
 * 主应用组件
 * Nest.js + AWS Serverless 学习项目 - 前端
 */

import { ItemList } from './components/ItemList';
import { GitHubProfile } from './components/GitHubProfile';
import './App.css';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Nest.js + react + AWS Serverless</h1>
      </header>

      <main className="app-main">
        <section className="section">
          <ItemList />
        </section>

        <section className="section-2">
          <GitHubProfile />
        </section>
      </main>

      <footer className="app-footer">
        <p>
          Backend: AWS Lambda + Aurora Serverless v2 + Prisma
          <br />
          Frontend: React  + TypeScript
        </p>
      </footer>
    </div>
  );
}

export default App;
