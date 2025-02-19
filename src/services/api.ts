import axios from 'axios'
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { ERROR_MESSAGES } from '../constants/errorMessages';
import { Permission, Role, TeamMember } from '../types/roles';

const API_URL = 'http://127.0.0.1:5000'

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 3000000, // 30 seconds timeout
})

// Add a request interceptor
api.interceptors.request.use(
  (config) => {
    // Get the JWT token from localStorage
    const jwtToken = localStorage.getItem('token')
    
    // If token exists, add it to the Authorization header
    if (jwtToken) {
      config.headers['Authorization'] = `Bearer ${jwtToken}`
    }
    
    console.log('Request:', {
      url: config.url,
      method: config.method,
      headers: config.headers,
      data: config.data
    });
    
    return config
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error)
  }
)

// Function to set the JWT token
export const setAuthToken = (token: string | null) => {
  if (token) {
    localStorage.setItem('token', token)
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  } else {
    localStorage.removeItem('token')
    delete api.defaults.headers.common['Authorization']
  }
}

// Add type for identity
type UserIdentity = {
  type: 'company' | 'user';
  id: number;
  role?: string;
  permissions?: Permission[];
};

// Update the login functions to store identity information
export const login = async (email: string, password: string) => {
  try {
    console.log('Making user login request...');
    const response = await api.post('/api/user/login', { email, password });
    
    // Debug log to see the raw response
    console.log('Raw response:', response);
    console.log('Response data:', response.data);
    
    // Validate response data with more specific error messages
    if (!response.data) {
      throw new Error('No response data received from server');
    }
    if (!response.data.access_token) {
      throw new Error('No access token received in response');
    }
    
    // Get the token from access_token field
    const token = response.data.access_token;
    const user = {
      id: response.data.user_id,
      company_id: response.data.company_id,
      type: 'user',
      role: 'employee'
    };
    
    // Debug log for user object
    console.log('User data:', user);
    
    // Store token
    localStorage.setItem('token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // Store complete identity information matching backend structure
    const identity = {
      type: 'user',
      id: user.id,
      role: 'employee',
      permissions: [], // Backend doesn't send permissions yet
      company_id: user.company_id
    };
    
    // Debug log for identity object
    console.log('Identity to be stored:', identity);
    
    localStorage.setItem('userIdentity', JSON.stringify(identity));
    localStorage.setItem('userType', 'employee');
    
    return {
      token,
      user: {
        ...user,
        permissions: [] // Add permissions to match expected structure
      }
    };
  } catch (error: any) {
    // Enhanced error logging
    console.error('User login error:', error);
    console.error('Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
};

export const signup = async (userData: {
  name: string
  email: string
  password: string
  company_id: number 
  contact: string
  designation: string
}) => {
  try {
    const response = await api.post('/api/user/signup', userData);
    console.log('Raw signup response:', response); // Add debug log
    
    // Return the data directly
    return response.data;
  } catch (error: any) {
    console.error('Signup API error:', error);
    if (error.response) {
      throw error.response.data;
    }
    throw error;
  }
};

export const sendMessage = async (query: string, project: string) => {
  try {
    const response = await api.post('/api/chat', { 
      query, 
      project
    })
    return response.data
  } catch (error) {
    throw error
  }
}

export const uploadFile = async (file: File, projectId: number, isQuotation: boolean = false, isUpdate: boolean = false) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('project', projectId.toString());
  formData.append('is_quotation', isQuotation.toString());
  formData.append('is_update', isUpdate.toString());
  
  try {
    console.log('Uploading file:', {
      fileName: file.name,
      projectId,
      isQuotation,
      isUpdate
    });
    
    const response = await api.post('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    console.log('Upload response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Upload error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    throw error;
  }
};

export const getProjects = async () => {
  try {
    const response = await api.get('/api/projects')
    return response.data
  } catch (error) {
    throw error
  }
}

export const addProject = async (projectData: {
  name: string;
  files: FileList | null;
}) => {
  try {
    // First, create the project
    const projectResponse = await api.post('/api/projects', {
      name: projectData.name,
    });
    
    const projectId = projectResponse.data.id;

    // Upload files if any
    if (projectData.files) {
      for (let i = 0; i < projectData.files.length; i++) {
        await uploadFile(projectData.files[i], projectId);
      }
    }

    return projectResponse.data;
  } catch (error) {
    throw error;
  }
};

// Update the login functions to store identity information
export const companyLogin = async (email: string, password: string) => {
  try {
    console.log('Making company login request...');
    const response = await api.post('/api/company/login', { email, password });
    console.log('Raw company login response:', response.data);

    if (!response.data || !response.data.token) {
      throw new Error('Invalid response format');
    }

    const { token, company } = response.data;
    
    // Store token
    localStorage.setItem('token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // Store identity with proper format
    const identity = {
      type: 'company',
      id: company.id,
      role: 'admin'
    };
    localStorage.setItem('userIdentity', JSON.stringify(identity));
    localStorage.setItem('userType', 'company');
    
    console.log('Stored identity:', identity);
    return response.data;
  } catch (error) {
    console.error('Company login error:', error);
    throw error;
  }
};

export const companySignup = async (companyData: {
  name: string;
  email: string;
  password: string;
  contact: string;
  address: string;
  office_phone?: string;
  website?: string;
}) => {
  try {
    const response = await api.post('/api/company/signup', companyData)
    const { token, company } = response.data
    
    // Store token and identity information
    setAuthToken(token)
    
    const identity = {
      type: 'company',
      id: company.id,
      role: 'admin'
    };
    localStorage.setItem('userIdentity', JSON.stringify(identity))
    localStorage.setItem('userType', 'company')
    
    return response.data
  } catch (error) {
    if (error.response) {
      throw error.response.data
    }
    throw error
  }
}

export const addCompanyUser = async (userData: {
  name: string
  email: string
  password: string
  contact: string
  designation: string
}) => {
  try {
    const response = await api.post('/api/company/users', userData)
    return response.data
  } catch (error) {
    throw error
  }
}

export const getCompanies = async () => {
  try {
    const response = await api.get('/api/companies')
    return response.data
  } catch (error) {
    console.error('Error fetching companies:', error)
    throw error
  }
}

// Update these interfaces to match backend responses
interface ProjectFile {
  id: number;
  name: string;
  path: string;
  relative_path: string;
  addedBy: string;
  dateAdded: string;
  lastUpdated: string;
  size: number;
}

interface ProjectDetails {
  id: number;
  name: string;
  description: string;
  files: ProjectFile[];
}

interface ProjectPL {
  totalRevenue: number;
  totalCost: number;
  netProfit: number;
}

export const getProjectDetails = async (projectId: number) => {
  try {
    const response = await api.get(`/api/projects/${projectId}`)
    return response.data
  } catch (error: any) {
    console.error('Error fetching project details:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    // Return null or empty object instead of throwing
    return null;
  }
}

export const getProjectPL = async (projectId: number) => {
  try {
    const response = await api.get(`/api/projects/${projectId}/pl`)
    return response.data
  } catch (error) {
    throw error
  }
}

export const getProjectFiles = async (projectId: number, showToast?: (message: string, type: string) => void) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No auth token found');
      throw new Error('Authentication required');
    }

    console.log('Fetching files with token:', token.substring(0, 10) + '...');
    
    const response = await api.get(`/api/projects/${projectId}/files`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      withCredentials: true // Add this for CORS with credentials
    });

    console.log('Files response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching project files:', {
      error,
      status: error.response?.status,
      data: error.response?.data,
      headers: error.response?.headers
    });
    if (showToast) {
      showToast(`Error loading files: ${error.response?.data?.error || error.message}`, 'error');
    }
    return [];
  }
};

export const deleteProjectFile = async (projectId: number, fileId: number) => {
  try {
    const response = await api.delete(`/api/projects/${projectId}/files/${fileId}`)
    return response.data
  } catch (error) {
    throw error
  }
}

export const downloadProjectFile = async (projectId: number, fileId: number) => {
  try {
    const response = await api.get(`/api/projects/${projectId}/files/${fileId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
};

export const logout = () => {
  setAuthToken(null)
  // Clear any other stored session data
  localStorage.clear()
  sessionStorage.clear()
  
  // Instead of using window.history, use window.location
  window.location.href = '/'
}

// Add these new interfaces
interface ChartDataset {
  label: string;
  data: number[];
}

interface ChartScales {
  x: { title: string };
  y: { title: string };
}

interface ChartOptions {
  scales: ChartScales;
}

interface ChartSuggestion {
  type: string;
  title: string;
  description: string;
  labels: string[];
  datasets: ChartDataset[];
  options: ChartOptions;
}

interface ChartSuggestionsResponse {
  chart_suggestions: Array<{
    type: string;
    title: string;
    description: string;
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
    }>;
    options: {
      scales: {
        x: { title: string };
        y: { title: string };
      };
    };
  }>;
}

// Add this interface before the other interfaces
export interface Dashboard {
  Name: string;
  Type: 'LineChart' | 'BarChart' | 'PieChart' | 'DonutChart' | 'ScatterPlot' | 'Histogram' | 'Table' | 'DoubleBarChart' | 'DualColorLineChart';
  X_axis_label: string;
  Y_axis_label: string;
  X_axis_data: string[] | number[];
  Y_axis_data: string[] | number[];
  labels: string[];
  Values: number[];
  Column_headers?: string[];
  Row_data?: string[][];
}

// Interface for saved chart
export interface SavedChart {
  id: number;
  name: string;
  query: string;
  chart_data: Dashboard;
  is_pinned: boolean;
  created_at: string;
  created_by: number;
}

// Function to save a chart
export const saveProjectChart = async (
  projectId: number, 
  chartData: {
    name: string;
    query: string;
    chart_data: Dashboard;
  }
) => {
  try {
    const response = await api.post(`/api/projects/${projectId}/charts`, chartData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Function to get saved charts
export const getProjectCharts = async (projectId: number) => {
  try {
    const response = await api.get(`/api/projects/${projectId}/charts`);
    return response.data as SavedChart[];
  } catch (error) {
    throw error;
  }
};

// Function to delete a saved chart
export const deleteProjectChart = async (projectId: number, chartId: number) => {
  try {
    const response = await api.delete(`/api/projects/${projectId}/charts/${chartId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

interface ProjectDashboardChart {
  id: number;
  name: string;
  query: string;
  chart_data: Dashboard;
  is_pinned: boolean;
}

// Update the function to toggle pin status
export const toggleChartPin = async (projectId: number, chartId: number) => {
  try {
    console.log('Toggling chart pin:', { projectId, chartId });
    const response = await api.patch(`/api/projects/${projectId}/charts/${chartId}/pin`);
    console.log('Toggle pin response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Error toggling chart pin:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    throw error;
  }
};

// Add chart to project dashboard
export const addChartToProjectDashboard = async (projectId: number, chartId: number) => {
  try {
    const response = await api.post(`/api/projects/${projectId}/dashboard/charts/${chartId}`);
    console.log('Add chart to dashboard response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error adding chart to dashboard:', error);
    throw error;
  }
};

// Get pinned dashboard charts
export const getProjectDashboardCharts = async (projectId: number) => {
  try {
    console.log('Fetching dashboard charts for project:', projectId);
    const response = await api.get(`/api/projects/${projectId}/dashboard/charts`);
    console.log('Dashboard charts response:', response.data);
    return response.data as SavedChart[];
  } catch (error) {
    console.error('Error fetching dashboard charts:', error);
    throw error;
  }
};

// Remove chart from dashboard
export const removeChartFromDashboard = async (projectId: number, chartId: number) => {
  try {
    const response = await api.delete(`/api/projects/${projectId}/dashboard/charts/${chartId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Interface for dashboard layout
export interface DashboardLayoutItem extends DashboardLayout {
  i: string; // chart ID
  chartId: number; // actual chart ID from database
}

export interface DashboardLayoutConfig {
  id?: number;
  name: string;
  project_id: number;
  layout_data: {
    [breakpoint: string]: DashboardLayoutItem[];
  };
  charts: SavedChart[]; // Include the actual chart data
  created_at?: string;
}

// Save dashboard layout
export const saveDashboardLayout = async (
  projectId: number, 
  layoutConfig: {
    name: string;
    layout_data: { [breakpoint: string]: DashboardLayoutItem[] };
    charts: SavedChart[];
  }
) => {
  try {
    console.log('Saving layout:', layoutConfig);
    const response = await api.post(
      `/api/projects/${projectId}/dashboard/layouts`, 
      layoutConfig
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get saved dashboard layouts
export const getDashboardLayouts = async (projectId: number) => {
  try {
    const response = await api.get(`/api/projects/${projectId}/dashboard/layouts`);
    return response.data as DashboardLayoutConfig[];
  } catch (error) {
    throw error;
  }
};

// Load specific dashboard layout
export const loadDashboardLayout = async (
  projectId: number, 
  layoutId: number
) => {
  try {
    const response = await api.get(
      `/api/projects/${projectId}/dashboard/layouts/${layoutId}`
    );
    console.log('Loading layout:', response.data);
    return response.data as DashboardLayoutConfig;
  } catch (error) {
    throw error;
  }
};

export interface DashboardLayout {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean;
}

// Get user settings
export const getUserSettings = async (): Promise<UserSettings> => {
  try {
    console.log('Calling getUserSettings API...');
    const response = await api.get('/api/user/settings');
    console.log('getUserSettings response:', response.data);
    return response.data;
  } catch (error) {
    console.error('getUserSettings error:', error);
    throw error;
  }
};

// Get payment information
export const getPaymentInfo = async (): Promise<PaymentInfo> => {
  try {
    console.log('Calling getPaymentInfo API...');
    const response = await api.get('/api/user/payment');
    console.log('getPaymentInfo response:', response.data);
    return response.data;
  } catch (error) {
    console.error('getPaymentInfo error:', error);
    throw error;
  }
};

export interface UserSettings {
  email: string;
  display_name: string;
  notifications_enabled: boolean;
  theme_preference: 'light' | 'dark';
}

export interface PaymentInfo {
  last4: string;
  expiry_month: number;
  expiry_year: number;
  brand: string;
}

export const updateUserSettings = async (updates: Partial<UserSettings>): Promise<UserSettings> => {
  try {
    const response = await api.patch('/api/user/settings', updates);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Add this new function
export const changePassword = async (currentPassword: string, newPassword: string) => {
  try {
    const response = await api.post('/api/user/settings/password', {
      current_password: currentPassword,
      new_password: newPassword
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Add these interfaces
export interface SavedPrompt {
  id: number;
  content: string;
  project_id: number;
  tags?: string[];
  created_at: string;
}

// Save a prompt
export const savePrompt = async (promptData: { 
  content: string; 
  project_id: number;
  tags?: string[] 
}) => {
  try {
    const response = await api.post(`/api/projects/${promptData.project_id}/prompts`, promptData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get saved prompts
export const getSavedPrompts = async (projectId: number) => {
  try {
    const response = await api.get(`/api/projects/${projectId}/prompts`);
    return response.data as SavedPrompt[];
  } catch (error) {
    throw error;
  }
};

// Delete a saved prompt
export const deleteSavedPrompt = async (projectId: number, promptId: number) => {
  try {
    const response = await api.delete(`/api/projects/${projectId}/prompts/${promptId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateDashboardLayout = async (
  projectId: number, 
  layoutId: number, 
  layoutConfig: any
) => {
  const response = await fetch(`/api/projects/${projectId}/dashboard/layouts/${layoutId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(layoutConfig),
  });

  if (!response.ok) {
    throw new Error('Failed to update dashboard layout');
  }

  return response.json();
};

export const getPaymentStatus = async () => {
  try {
    console.log('Calling getPaymentStatus API...');
    const response = await api.get('/api/subscription/status');
    console.log('Payment status API response:', response.data);
    return response.data;
  } catch (error) {
    console.error('getPaymentStatus error:', error);
    throw error;
  }
};

export const initiateSubscription = async (
  planType: 'monthly' | 'yearly',
  userTier: number
) => {
  try {
    const response = await api.post('/api/subscription/create-order', {
      plan_type: planType,
      user_tier: userTier
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const verifyPayment = async (paymentData: {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}) => {
  try {
    const response = await api.post('/api/subscription/verify', paymentData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const sendVerificationCode = async (identifier: string, type: 'phone' | 'email') => {
  try {
    const response = await api.post('/api/verify/send', {
      identifier,
      type
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

interface VerificationResponse {
  message: string;
  verified: boolean;
  user_id?: number;
}

export const verifyCode = async (verificationData: {
  identifier: string;
  code: string;
  entity_type: 'company' | 'user' | 'employee';
  entity_id: string | number;
  type: 'phone' | 'email';
}) => {
  try {
    const response = await api.post('/api/verify/check', verificationData);
    return response.data;
  } catch (error: any) {
    console.error('Verification error:', error);
    if (error.response) {
      throw error.response.data;
    }
    throw error;
  }
};

// Add a check for the API instance configuration
console.log('API instance config:', {
  baseURL: api.defaults.baseURL,
  headers: api.defaults.headers,
  timeout: api.defaults.timeout
});

// Update the interceptor to handle timeout and other errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      // Clear all stored data
      localStorage.clear();
      sessionStorage.clear();
      
      // Redirect to company login
      window.location.href = '/company-login';
      
      return Promise.reject({
        message: ERROR_MESSAGES.SESSION_TIMEOUT
      });
    }

    // Handle 401 errors separately for team management
    if (error?.response?.status === 401) {
      const currentPath = window.location.pathname;
      // Only logout if not on team management or other protected routes
      if (!currentPath.includes('/settings')) {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/company-login';
      }
    }
    
    return Promise.reject(error);
  }
);

// Team Management API Functions
export const getTeamMembers = async (): Promise<TeamMember[]> => {
  try {
    // Add debug log for request
    console.log('Authorization header:', api.defaults.headers.common['Authorization']);
    
    const response = await api.get('/api/company/team');
    console.log('Team members response:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('Get team members error:', error);
    throw error;
  }
};

export const getRoles = async (): Promise<Role[]> => {
  try {
    const response = await api.get('/api/company/roles');
    return response.data;
  } catch (error) {
    console.error('Error fetching roles:', error);
    throw error;
  }
};

export const createRole = async (roleData: {
  name: string;
  permissions: Permission[];
  is_default?: boolean;
}): Promise<Role> => {
  try {
    const response = await api.post('/api/company/roles', roleData);
    return response.data;
  } catch (error) {
    console.error('Error creating role:', error);
    throw error;
  }
};

export const updateRole = async (
  roleId: number,
  updates: {
    name?: string;
    permissions?: Permission[];
    is_default?: boolean;
  }
): Promise<Role> => {
  try {
    const response = await api.patch(`/api/company/roles/${roleId}`, updates);
    return response.data;
  } catch (error) {
    console.error('Error updating role:', error);
    throw error;
  }
};

export const deleteRole = async (roleId: number): Promise<void> => {
  try {
    await api.delete(`/api/company/roles/${roleId}`);
  } catch (error) {
    console.error('Error deleting role:', error);
    throw error;
  }
};

export const addTeamMember = async (memberData: {
  email: string;
  name: string;
  password: string;
  role_id: number;
  contact: string;
  designation: string;
}): Promise<TeamMember> => {
  try {
    const response = await api.post('/api/company/team/add', memberData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateTeamMember = async (
  memberId: number,
  updates: {
    permissions: Permission[];
  }
): Promise<TeamMember> => {
  try {
    const response = await api.patch(
      `/api/company/team/${memberId}/permissions`,
      { permissions: updates.permissions },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating team member:', error);
    throw error;
  }
};

export const removeTeamMember = async (memberId: number): Promise<void> => {
  try {
    await api.delete(`/api/company/team/${memberId}`);
  } catch (error) {
    throw error;
  }
};

// Update the updateAllPermissions function
export const updateAllPermissions = async (
  memberId: number,
  permissions: Permission[]
): Promise<TeamMember> => {
  try {
    const response = await api.patch(`/api/company/team/${memberId}/permissions`, {
      permissions: permissions
    });
    
    if (!response.data) {
      throw new Error('No data received from server');
    }
    
    // Ensure permissions are included in the response
    if (!response.data.permissions) {
      console.warn('No permissions in response data:', response.data);
      response.data.permissions = permissions; // Use the sent permissions if none returned
    }
    
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 403) {
      throw new Error(error.response.data.message || 'You do not have permission to update team members');
    }
    throw error;
  }
};

// Add these interfaces
export interface ProjectAccess {
  project_id: number;
  assigned_users: {
    id: number;
    name: string;
    email: string;
    role: string;
    designation: string;
  }[];
}

// Add these new API functions
export const getProjectAccess = async (projectId: number): Promise<ProjectAccess> => {
  try {
    const response = await api.get(`/api/projects/${projectId}/access`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateProjectAccess = async (projectId: number, userIds: number[]) => {
  try {
    const response = await api.post(`/api/projects/${projectId}/access`, {
      user_ids: userIds
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Update these functions to be more explicit
export const getUserProjects = async () => {
  try {
    const response = await api.get('/api/user/projects')
    // If the response is directly the array of projects
    if (Array.isArray(response.data)) {
      return response.data
    }
    // If the projects are nested inside a property
    if (response.data && typeof response.data === 'object') {
      // Return the first array found in the response data
      const arrays = Object.values(response.data).filter(Array.isArray)
      if (arrays.length > 0) {
        return arrays[0]
      }
    }
    // If no valid data found, return empty array
    console.error('Unexpected response structure:', response.data)
    return []
  } catch (error) {
    console.error('Error fetching user projects:', error)
    throw error
  }
}

export const getCompanyProjects = async () => {
  try {
    const response = await api.get('/api/projects')
    // If the response is directly the array of projects
    if (Array.isArray(response.data)) {
      return response.data
    }
    // If the projects are nested inside a property
    if (response.data && typeof response.data === 'object') {
      // Return the first array found in the response data
      const arrays = Object.values(response.data).filter(Array.isArray)
      if (arrays.length > 0) {
        return arrays[0]
      }
    }
    // If no valid data found, return empty array
    console.error('Unexpected response structure:', response.data)
    return []
  } catch (error) {
    console.error('Error fetching company projects:', error)
    throw error
  }
}

// Rename existing getProjects to be more specific
export const getAllAccessibleProjects = async () => {
  const userType = localStorage.getItem('userType')
  console.log('Current user type:', userType) // Add this log
  
  try {
    if (userType === 'company') {
      return await getCompanyProjects()
    } else {
      return await getUserProjects()
    }
  } catch (error) {
    console.error('Error in getAllAccessibleProjects:', error)
    throw error
  }
}

// Add a function to get role members if needed
export const getRoleMembers = async (roleId: number): Promise<TeamMember[]> => {
  try {
    const response = await api.get(`/api/company/roles/${roleId}/members`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Update permission check utility
export const checkPermission = (permission: Permission): boolean => {
  try {
    const identityStr = localStorage.getItem('userIdentity');
    if (!identityStr) return false;
    
    const identity: UserIdentity = JSON.parse(identityStr);
    
    // Company always has all permissions
    if (identity.type === 'company') return true;
    
    // Admin users have all permissions
    if (identity.role === 'admin') return true;
    
    // Check specific permission for regular users
    return identity.permissions?.includes(permission) || false;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
};

export const deleteProject = async (projectId: number) => {
  try {
    const response = await api.delete(`/api/projects/delete/${projectId}`);
    return response.status === 204;
  } catch (error) {
    console.error('Error deleting project:', error);
    throw error;
  }
};

export const userLogin = async (credentials: {
  email: string;
  password: string;
}) => {
  try {
    const response = await api.post('/api/user/login', credentials);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw error.response.data;
    }
    throw error;
  }
};

// Add a function to check backend version/health
export const checkBackendHealth = async () => {
  try {
    await api.get('/health');
    return true;
  } catch (error) {
    return false;
  }
};
