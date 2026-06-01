const PROLOG_URL = 'http://localhost:8080/ia_enemigo';

export async function askEnemyAI(payload) {
  const response = await fetch(PROLOG_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Prolog respondió con estado ${response.status}`);
  }

  return response.json();
}
