import axios, { AxiosInstance, AxiosError } from 'axios';

export class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = this.getApiBaseUrl();
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Handle auth error
          localStorage.removeItem('auth_token');
        }
        return Promise.reject(error);
      }
    );
  }

  private getApiBaseUrl(): string {
    // Check for manually set LAN server
    const lanServer = localStorage.getItem('api_server_url');
    if (lanServer) return lanServer;

    // Check environment variable
    if (import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL;
    }

    // Default to localhost for development
    return 'http://localhost:3010';
  }

  public updateBaseUrl(url: string) {
    this.baseURL = url;
    this.client.defaults.baseURL = url;
    localStorage.setItem('api_server_url', url);
  }

  public getBaseUrl(): string {
    return this.baseURL;
  }

  // Generic request methods
  async get<T>(url: string, params?: any): Promise<T> {
    const response = await this.client.get(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.post(url, data);
    return response.data;
  }

  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.put(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete(url);
    return response.data;
  }

  // Health check
  async checkHealth(): Promise<boolean> {
    try {
      await this.get('/health');
      return true;
    } catch {
      return false;
    }
  }

  // Server info
  async getServerInfo() {
    return this.get<{
      serverName: string;
      port: number;
      addresses: string[];
      isLANServer: boolean;
      uptime: number;
    }>('/api/server/info');
  }

  // Productions
  async getProductions() {
    return this.get('/api/productions');
  }

  async getProduction(id: string) {
    return this.get(`/api/productions/${id}`);
  }

  async createProduction(data: any) {
    return this.post('/api/productions', data);
  }

  async updateProduction(id: string, data: any) {
    return this.put(`/api/productions/${id}`, data);
  }

  async deleteProduction(id: string) {
    return this.delete(`/api/productions/${id}`);
  }

  // Equipment
  async getEquipment() {
    return this.get('/api/equipment');
  }

  async getEquipmentById(id: string) {
    return this.get(`/api/equipment/${id}`);
  }

  async createEquipment(data: any) {
    return this.post('/api/equipment', data);
  }

  async updateEquipment(id: string, data: any) {
    return this.put(`/api/equipment/${id}`, data);
  }

  async deleteEquipment(id: string) {
    return this.delete(`/api/equipment/${id}`);
  }

  // Sources
  async getSources(productionId: string) {
    return this.get(`/api/sources/production/${productionId}`);
  }

  async getSource(id: string) {
    return this.get(`/api/sources/${id}`);
  }

  async createSource(data: any) {
    return this.post('/api/sources', data);
  }

  async updateSource(id: string, data: any) {
    return this.put(`/api/sources/${id}`, data);
  }

  async deleteSource(id: string) {
    return this.delete(`/api/sources/${id}`);
  }

  // Sends
  async getSends(productionId: string) {
    return this.get(`/api/sends/production/${productionId}`);
  }

  async getSend(id: string) {
    return this.get(`/api/sends/${id}`);
  }

  async createSend(data: any) {
    return this.post('/api/sends', data);
  }

  async updateSend(id: string, data: any) {
    return this.put(`/api/sends/${id}`, data);
  }

  async deleteSend(id: string) {
    return this.delete(`/api/sends/${id}`);
  }

  // Settings
  async getSettings() {
    return this.get('/api/settings');
  }

  async getSetting(key: string) {
    return this.get(`/api/settings/${key}`);
  }

  async setSetting(key: string, value: any, category?: string) {
    return this.post(`/api/settings/${key}`, { value, category });
  }

  async deleteSetting(key: string) {
    return this.delete(`/api/settings/${key}`);
  }
}

// Singleton instance
export const apiClient = new ApiClient();

export default apiClient;
