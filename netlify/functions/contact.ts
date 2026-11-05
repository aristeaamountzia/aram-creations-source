import { sendContactEmail } from '../../server/contact-service';

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true;
  const configured = [
    process.env.URL,
    process.env.DEPLOY_PRIME_URL,
    'https://aramcreationsofficial1.netlify.app',
    'https://aramcreationss.netlify.app',
    'https://aram-creations.netlify.app',
    'http://localhost:5173',
    'http://localhost:8888',
    'http://localhost:3000'
  ].filter(Boolean) as string[];

  if (configured.some(allowed => origin === allowed || origin === allowed.replace(/\/$/, ''))) return true;
  if (/^https:\/\/(?:[a-z0-9-]+--)?(?:aramcreationsofficial1|aramcreationss|aram-creations)\.netlify\.app$/i.test(origin)) return true;
  return false;
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allowOrigin = isAllowedOrigin(origin) ? (origin || '*') : 'null';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

const reply = (data: unknown, status = 200, origin: string | null = null) =>
  Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      ...corsHeaders(origin)
    }
  });

export default async function handler(request: Request) {
  const origin = request.headers.get('origin');

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin)
    });
  }

  if (request.method !== 'POST') {
    return reply({ error: 'Μη αποδεκτή μέθοδος.' }, 405, origin);
  }

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return reply({ error: 'Μη έγκυρα δεδομένα αποστολής.' }, 400, origin);
    }

    const { name, email, interest, message } = body;
    const result = await sendContactEmail({ name, email, interest, message });

    return reply({
      ok: true,
      id: result.id,
      message: 'Το μήνυμά σας εστάλη επιτυχώς. Θα επικοινωνήσουμε σύντομα μαζί σας.'
    }, 200, origin);
  } catch (error: any) {
    return reply({
      ok: false,
      error: error.message || 'Αποτυχία αποστολής email. Παρακαλούμε δοκιμάστε ξανά αργότερα.'
    }, 500, origin);
  }
}

