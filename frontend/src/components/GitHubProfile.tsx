/**
 * GitHub 用户信息组件
 * 获取并显示 GitHub 用户资料
 */

import { useState } from 'react';
import { githubApi, type GitHubUser } from '../services/api';
import './GitHubProfile.css';

export function GitHubProfile() {
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetchUser = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await githubApi.getMe();
      setUser(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch GitHub user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="github-profile">
      <h2>GitHub Profile</h2>

      <p className="description">
        Click the button below to fetch GitHub user information from the backend API.
        The backend uses a GitHub token stored in Lambda environment variables.
      </p>

      <button onClick={handleFetchUser} disabled={loading} className="fetch-btn">
        {loading ? 'Fetching...' : 'Fetch GitHub User Info'}
      </button>

      {error && <div className="error">{error}</div>}

      {user && (
        <div className="user-card">
          <img src={user.avatar_url} alt={user.name} className="avatar" />
          <div className="user-info">
            <h3>{user.name}</h3>
            <p className="username">@{user.login}</p>
          </div>
        </div>
      )}
    </div>
  );
}
