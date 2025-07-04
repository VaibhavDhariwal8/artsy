import { useAuth } from "@clerk/clerk-react";

export const useAuthenticatedFetch = () => {
  const { getToken } = useAuth();

  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const token = await getToken();
    
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      ...(options.headers as Record<string, string>),
    };
    
    // Don't set Content-Type for FormData - let the browser set it with boundary
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    
    return fetch(url, {
      ...options,
      headers,
    });
  };

  return { authenticatedFetch };
};
