export default async (req: Request) => {
  try {
    const cronSecret = process.env.CRON_SECRET || 'default-secret'
    const siteUrl = process.env.URL || 'https://supersohbet.netlify.app'

    // Kendi API endpoint'imizi çağır
    const response = await fetch(`${siteUrl}/api/cron/randy-check`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json'
      }
    })

    const data = await response.json()

    console.log('Randy cron result:', data)

    return new Response(JSON.stringify({
      statusCode: 200,
      body: JSON.stringify(data)
    }))
  } catch (error) {
    console.error('Randy cron function error:', error)
    return new Response(JSON.stringify({
      statusCode: 500,
      body: JSON.stringify({ error: 'Cron failed' })
    }))
  }
}

export const config = {
  schedule: "* * * * *" // Her 1 dakikada bir çalış
}
