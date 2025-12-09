export const handler = async (event, context) => {
  // Remove the /api prefix since we're proxying from /api/*
  const path = event.path.replace('/.netlify/functions/proxy', '');
  const backendUrl = process.env.BACKEND_URL || 'http://vibesec.zeabur.app';
  
  // Build the full backend URL
  const url = `${backendUrl}${path}${event.rawQuery ? `?${event.rawQuery}` : ''}`;
  
  console.log(`Proxying ${event.httpMethod} ${event.path} to ${url}`);
  
  try {
    const headers = { ...event.headers };
    // Remove host header to avoid issues
    delete headers.host;
    delete headers['x-forwarded-host'];
    
    const response = await fetch(url, {
      method: event.httpMethod,
      headers: headers,
      body: event.body || undefined,
      redirect: 'manual', // Don't follow redirects automatically - we'll handle them
    });
    
    // Handle redirect responses (301, 302, 307, 308)
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (location) {
        console.log(`Redirecting to: ${location}`);
        return {
          statusCode: response.status,
          headers: {
            'Location': location,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          },
          body: '',
        };
      }
    }
    
    const contentType = response.headers.get('content-type') || 'application/json';
    const data = await response.text();
    
    return {
      statusCode: response.status,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      },
      body: data,
    };
  } catch (error) {
    console.error('Proxy error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: error.message }),
    };
  }
};

