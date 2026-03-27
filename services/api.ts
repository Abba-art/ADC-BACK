const BASE_URL = 'http://localhost:3000';

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  };
  console.log(`🚀 [API Request] ${options.method || 'GET'} ${BASE_URL}${endpoint}`);
  if (options.body) {
    try {
      console.log(`📦 [API Payload]`, JSON.parse(options.body as string));
    } catch {
      console.log(`📦 [API Payload]`, options.body);
    }
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`❌ [API Error] ${response.status} ${response.statusText}`, errorData);
      throw new Error(errorData.message || 'Erreur lors de la communication avec le serveur');
    }

    const data = await response.json();
    // --- LOGS DE SUCCÈS ---
    console.log(`✅ [API Response] ${endpoint}`, data);
    return data;

  } catch (error) {
    console.error(`💥 [API Network/Crash]`, error);
    throw error;
  }
}