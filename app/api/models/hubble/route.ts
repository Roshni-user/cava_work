const MODEL_URL = "https://d8wojkg2185gh.cloudfront.net/strapi/C41_QS_a3f9c78cdb.glb";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const response = await fetch(MODEL_URL);

    if (!response.ok || !response.body) {
      return new Response("The 3D model could not be loaded.", { status: 502 });
    }

    return new Response(response.body, {
      status: 200,
      headers: {
        "content-type": "model/gltf-binary",
        "cache-control": "public, max-age=86400",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "3D model request failed.";
    console.error(message);
    return new Response("The 3D model could not be loaded.", { status: 502 });
  }
}
