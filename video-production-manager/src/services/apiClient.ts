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
        // Debug logging for POST requests
        if (config.method === 'post' && config.url?.includes('/computers')) {
          console.log('📤 ApiClient POST interceptor - URL:', config.url);
          console.log('📤 ApiClient POST interceptor - Data:', JSON.stringify(config.data, null, 2));
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
    return 'http://localhost:3010/api';
  }

  getBaseURL(): string {
    return this.baseURL;
  }
  
  /**
   * Get WebSocket URL (strips /api suffix for WebSocket connections)
   */
  getWebSocketURL(): string {
    return this.baseURL.replace(/\/api\/?$/, '');
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

  async delete<T>(url: string, config?: any): Promise<T> {
    const response = await this.client.delete(url, config);
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
    }>('/server/info');
  }

  // Productions
  async getProductions() {
    return this.get('/productions');
  }

  async getProduction(id: string) {
    return this.get(`/productions/${id}`);
  }

  async createProduction(data: any) {
    return this.post('/productions', data);
  }

  async updateProduction(id: string, data: any) {
    return this.put(`/productions/${id}`, data);
  }

  async deleteProduction(id: string) {
    return this.delete(`/productions/${id}`);
  }

  // Checklist Items
  async getChecklistItems(productionId: string) {
    return this.get(`/checklist-items/production/${productionId}`);
  }

  async getChecklistItem(id: string) {
    return this.get(`/checklist-items/${id}`);
  }

  async createChecklistItem(productionId: string, data: any) {
    // CRITICAL: Only send the data provided, don't add productionId as snake_case
    // API will transform camelCase to snake_case
    return this.post('/checklist-items', { ...data, productionId });
  }

  async updateChecklistItem(id: string, data: any) {
    return this.put(`/checklist-items/${id}`, data);
  }

  async deleteChecklistItem(id: string) {
    return this.delete(`/checklist-items/${id}`);
  }

  // Equipment
  async getEquipment() {
    return this.get('/equipment');
  }

  async getEquipmentById(id: string) {
    return this.get(`/equipment/${id}`);
  }

  async createEquipment(data: any) {
    return this.post('/equipment', data);
  }

  async updateEquipment(id: string, data: any) {
    return this.put(`/equipment/${id}`, data);
  }

  async deleteEquipment(id: string) {
    return this.delete(`/equipment/${id}`);
  }

  // Sources
  async getSources(productionId: string) {
    return this.get(`/sources/production/${productionId}`);
  }

  async getSource(id: string) {
    return this.get(`/computers/${id}`);
  }

  async createSource(data: any) {
    return this.post('/computers', data);
  }

  async updateSource(id: string, data: any) {
    return this.put(`/computers/${id}`, data);
  }

  async deleteSource(id: string) {
    return this.delete(`/computers/${id}`);
  }

  // Sends
  async getSends(productionId: string) {
    return this.get(`/sends/production/${productionId}`);
  }

  async getSend(id: string) {
    return this.get(`/sends/${id}`);
  }

  async createSend(data: any) {
    return this.post('/sends', data);
  }

  async updateSend(id: string, data: any) {
    return this.put(`/sends/${id}`, data);
  }

  async deleteSend(id: string) {
    return this.delete(`/sends/${id}`);
  }

  // Settings
  async getSettings() {
    return this.get('/settings');
  }

  async getSetting(key: string) {
    return this.get(`/settings/${key}`);
  }

  async setSetting(key: string, value: any, category?: string) {
    return this.post(`/settings/${key}`, { value, category });
  }

  async deleteSetting(key: string) {
    return this.delete(`/settings/${key}`);
  }
}

// Singleton instance
export const apiClient = new ApiClient();

export default apiClient;
