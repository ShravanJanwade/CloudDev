const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('clouddev_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('clouddev_token', token);
      } else {
        localStorage.removeItem('clouddev_token');
      }
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...((options.headers as Record<string, string>) || {}),
      };

      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || 'Request failed' };
      }

      return { data };
    } catch (error) {
      console.error('API Error:', error);
      return { error: 'Network error' };
    }
  }

  // Auth endpoints
  async register(email: string, password: string, name: string) {
    const result = await this.request<{ token: string; user: any }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    
    if (result.data?.token) {
      this.setToken(result.data.token);
    }
    
    return result;
  }

  async login(email: string, password: string) {
    const result = await this.request<{ token: string; user: any }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (result.data?.token) {
      this.setToken(result.data.token);
    }
    
    return result;
  }

  async getMe() {
    return this.request<{ user: any }>('/api/auth/me');
  }

  logout() {
    this.setToken(null);
  }

  // Project endpoints
  async getProjects() {
    return this.request<{ projects: any[] }>('/api/projects');
  }

  async getProject(id: string) {
    return this.request<{ project: any }>(`/api/projects/${id}`);
  }

  async createProject(data: { name: string; description?: string; template: string; isPublic?: boolean }) {
    return this.request<{ project: any }>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProject(id: string, data: { name?: string; description?: string; files?: any; isPublic?: boolean }) {
    return this.request<{ project: any }>(`/api/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async saveProjectFiles(id: string, files: any) {
    return this.request<{ message: string }>(`/api/projects/${id}/save`, {
      method: 'POST',
      body: JSON.stringify({ files }),
    });
  }

  async deleteProject(id: string) {
    return this.request<{ message: string }>(`/api/projects/${id}`, {
      method: 'DELETE',
    });
  }

  // Room endpoints
  async createRoom(data: { name: string; projectId?: string; maxParticipants?: number }) {
    return this.request<{ room: any }>('/api/rooms', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async joinRoom(code: string) {
    return this.request<{ room: any }>(`/api/rooms/join/${code}`, {
      method: 'POST',
    });
  }

  async joinRoomGuest(code: string, guestName: string) {
    // Guest join doesn't require authentication
    try {
      const response = await fetch(`${this.baseUrl}/api/rooms/join-guest/${code}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ guestName }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || 'Failed to join as guest' };
      }

      return { data };
    } catch (error) {
      console.error('Guest join API Error:', error);
      return { error: 'Network error' };
    }
  }

  async getRoom(code: string) {
    return this.request<{ room: any }>(`/api/rooms/${code}`);
  }

  async leaveRoom(code: string) {
    return this.request<{ message: string }>(`/api/rooms/${code}/leave`, {
      method: 'POST',
    });
  }

  async getUserRooms() {
    return this.request<{ rooms: any[] }>('/api/rooms/user/active');
  }
}

export const api = new ApiClient(API_BASE_URL);
