/**
 * API 服务切换 Context
 * 管理 Lambda 和 EC2 两种服务的切换
 */

import { createContext, useContext, useState, ReactNode } from 'react';

export type ServiceType = 'lambda' | 'ec2';

interface ApiContextType {
  serviceType: ServiceType;
  apiUrl: string;
  setServiceType: (type: ServiceType) => void;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

const LAMBDA_URL = import.meta.env.VITE_API_URL_LAMBDA || import.meta.env.VITE_API_URL;
const EC2_URL = import.meta.env.VITE_API_URL_EC2 || 'http://54.199.89.29';

export function ApiProvider({ children }: { children: ReactNode }) {
  // 默认使用 Lambda
  const [serviceType, setServiceType] = useState<ServiceType>('lambda');

  // 根据服务类型计算 API URL
  const apiUrl = serviceType === 'lambda' ? LAMBDA_URL : EC2_URL;

  return (
    <ApiContext.Provider value={{ serviceType, apiUrl, setServiceType }}>
      {children}
    </ApiContext.Provider>
  );
}

export function useApi() {
  const context = useContext(ApiContext);
  if (context === undefined) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
}
